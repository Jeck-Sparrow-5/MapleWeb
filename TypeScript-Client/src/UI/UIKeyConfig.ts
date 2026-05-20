/**
 * UIKeyConfig — Key Binding Configuration Window
 *
 * Renders the MapleStory v83 key configuration panel.
 * Assets come from UI.wz/UIWindow.img/KeyConfig (NX binary).
 *
 * Layout (unscaled pixels, relative to window top-left):
 *   - Background image (backgrnd): 629×373 px, contains keyboard artwork
 *   - Keyboard overlay:  rows of key slots at KEY_POS coordinates
 *   - Action icon tray:  two rows of 20 action icons, below the keyboard (~y 277/308)
 *   - Bottom buttons:    Default | Delete | Help | OK | Cancel
 *
 * Interaction model:
 *   1. Drag an icon from the tray onto a key  → binds that action to that key
 *   2. Drag an icon from a bound key          → pick it up to move or remove
 *      - Drop on another key                  → moves the binding there
 *      - Drop on empty space / tray           → removes the binding
 *   3. Click an empty key (no binding)        → selects it (blue highlight)
 *   4. ESC while dragging or selected         → cancels
 *
 * Two-phase commit:
 *   Edits modify `stagedBindings` only.
 *   OK  → copies staged into live `keyBindings`, saves to localStorage, sends packet.
 *   Cancel / close without OK → staged changes are discarded.
 *
 * Scale:
 *   SC constant scales the entire window (background + all overlays) uniformly.
 *   Change SC to resize the window. All pixel constants below are in unscaled space.
 */

import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import SessionManager from '../SessionManager';
import config from '../Config';

/**
 * SC — uniform display scale factor.
 * 1.0 = native WZ resolution (629×373 window).
 * Increase to enlarge the whole panel; all coordinates below are unscaled.
 */
const SC = 1.4;

/**
 * KEY_POS — top-left corner of each key slot, in unscaled pixels
 * relative to the window's top-left corner.
 *
 * Source: HeavenMS UIKeyConfig::load_keys_pos()
 * Adjusted manually to align with the backgrnd WZ image at SC=1.4.
 *
 * To add a key: measure its top-left in the 629×373 background image
 * and add an entry here. The key name must match the name used in
 * defaultBindings / keyBindings so hit-testing and binding work together.
 */
const KEY_POS: Record<string, [number, number]> = {
  // Row 1 — Escape + Function keys (F1–F12)
  // Gap between F4/F5, F8/F9 mirrors the physical keyboard grouping
  esc: [21, 31],
  f1: [85, 31],  f2: [118, 31],  f3: [151, 31],  f4: [184, 31],
  f5: [234, 31], f6: [267, 31],  f7: [300, 31],  f8: [333, 31],
  f9: [383, 31], f10: [416, 31], f11: [449, 31], f12: [482, 31],

  // Row 2 — Number row + navigation cluster (Insert / Home / PageUp)
  tilde: [21, 66],
  '1': [54,66], '2': [87,66],  '3': [120,66], '4': [153,66], '5': [186,66],
  '6': [219,66],'7': [252,66], '8': [285,66], '9': [318,66], '0': [351,66],
  minus: [384,66], plus: [417,66],
  insert: [558,66], home: [591,66], pageup: [624,66],

  // Row 3 — QWERTY row + Delete / End / PageDown
  q:[70,99],  w:[103,99], e:[136,99], r:[169,99], t:[202,99],
  y:[235,99], u:[268,99], i:[301,99], o:[334,99], p:[367,99],
  '[': [400,99], ']': [433,99],
  delete:[558,99], end:[591,99], pagedown:[624,132],

  // Row 4 — Home row (ASDF)
  a:[86,132],  s:[119,132], d:[152,132], f:[185,132], g:[218,132],
  h:[251,132], j:[284,132], k:[317,132], l:[350,132],
  colon:[383,132], quote:[416,132],

  // Row 5 — Bottom letter row (ZXCV)
  z:[69,165],  x:[102,165], c:[135,165], v:[168,165], b:[201,165],
  n:[234,165], m:[267,165], comma:[300,165], period:[333,165],

  // Row 6 — Modifier / spacebar row
  ctrl:[29,199], alt:[127,199], space:[224,199],
};

/**
 * KEY_W — override slot width (px, unscaled) for keys wider than 28 px.
 * All keys default to 28×28. Only entries that differ are listed here.
 * Height always stays 28 px (scaled via SC in draw/hit-test).
 */
const KEY_W: Record<string, number> = {
  ctrl:42, alt:42, space:118, enter:32, shift:46,
  backspace:40, tab:36, capslock:42, pipe:28,
};

/**
 * KEY_TEX_IDX — maps a key name to its index inside the WZ key[] array.
 * The WZ node UIWindow.img/KeyConfig/key contains bitmap children named
 * "0", "1", "2", … (numeric strings). Each bitmap is a small glyph label
 * (7–10 px wide, 11 px tall) that gets drawn in the top-left of the key slot.
 *
 * Source: HeavenMS UIKeyConfig::load_key_textures()
 * Access pattern: keyArr.nGet(String(idx)) — NOT positional index.
 */
const KEY_TEX_IDX: Record<string, number> = {
  esc:1,
  '1':2,'2':3,'3':4,'4':5,'5':6,'6':7,'7':8,'8':9,'9':10,'0':11,
  minus:12, plus:13, tilde:41,
  q:16,w:17,e:18,r:19,t:20,y:21,u:22,i:23,o:24,p:25,'[':26,']':27,
  enter:28, ctrl:29,
  a:30,s:31,d:32,f:33,g:34,h:35,j:36,k:37,l:38, colon:39, quote:40,
  shift:42, pipe:43,
  z:44,x:45,c:46,v:47,b:48,n:49,m:50, comma:51, period:52,
  alt:56, space:57,
  f1:59,f2:60,f3:61,f4:62,f5:63,f6:64,f7:65,f8:66,f9:67,f10:68,
  home:71,pageup:73,delete:75,end:79,pagedown:81,insert:82,f11:87,f12:88,
};

/**
 * ACTION_ICON_IDX — maps an action name to its index inside the WZ icon[] array.
 * UIWindow.img/KeyConfig/icon children are named "0", "1", … (32×32 bitmaps).
 *
 * Ordering matches HeavenMS KeyAction::Id enum starting from EQUIPMENT (index 0).
 * Gaps in the enum (e.g. 9, 11, …) are unused slots — not listed here.
 *
 * To add a new action: find its KeyAction::Id value and add it here,
 * then add a matching entry in ACTION_LABEL and defaultBindings.
 */
const ACTION_ICON_IDX: Record<string, number> = {
  equip:0, inventory:1, stats:2, skill:3, quest:4, worldmap:5, minimap:6,
  friends:7, party:8, menu:10, guild:12, guildchat:13, alliancechat:14,
  chat:18, pickup:21, sit:22, attack:23, jump:24,
  face1:26, face2:27, face3:28, face4:29, face5:30, face6:31,
  partychat:34, whisper:36,
};

/** Human-readable label shown in tooltips and fallback text boxes. */
const ACTION_LABEL: Record<string, string> = {
  attack:'Attack', jump:'Jump', pickup:'Pick Up', sit:'Sit',
  stats:'Stats', inventory:'Items', skill:'Skills', equip:'Equipment',
  quest:'Quest', menu:'Menu', worldmap:'WorldMap', minimap:'MiniMap',
  chat:'Chat', partychat:'PartyChat', guildchat:'GuildChat', alliancechat:'AllianceChat',
  party:'Party', guild:'Guild', friends:'Friends', whisper:'Whisper',
  face1:'Face 1', face2:'Face 2', face3:'Face 3',
  face4:'Face 4', face5:'Face 5', face6:'Face 6',
};

/**
 * defaultBindings — the factory-reset key map (action → key name).
 * Matches HeavenMS alternate_keys table.
 * Restored when the player clicks the "Default" button.
 */
export const defaultBindings: Record<string, string> = {
  attack:'ctrl', jump:'alt',   pickup:'z',    sit:'x',
  stats:'c',     inventory:'i', skill:'k',    equip:'u',
  quest:'j',     menu:'[',     worldmap:'n',  minimap:'m',
  chat:'enter',  partychat:'home', guildchat:'delete', alliancechat:'end',
  party:'p',     guild:'g',    friends:'period', whisper:'h',
  face1:'f1',    face2:'f2',   face3:'f3',
  face4:'f5',    face5:'f6',   face6:'f7',
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mapleweb_keybindings';

/** Load saved bindings from localStorage, falling back to defaults. */
function loadSaved(): Record<string, string> {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return { ...defaultBindings, ...JSON.parse(s) }; }
  catch (_) {}
  return { ...defaultBindings };
}

/**
 * keyBindings — the LIVE binding map used by the game loop (MapState).
 * Only updated when the player confirms with OK.
 * Exported so MapState and UIStatusBar can read it without importing the full UI.
 */
export const keyBindings: Record<string, string> = loadSaved();

/**
 * stagedBindings — scratch copy modified while the window is open.
 * Discarded on Cancel/close; committed to keyBindings on OK.
 */
let stagedBindings: Record<string, string> = { ...keyBindings };

/** Write current keyBindings to localStorage. Called on OK. */
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keyBindings)); } catch (_) {} }

/** Notify the server of the new keymap (opcode CHANGE_KEYMAP). */
function sendKeymapPacket() {
  if (!SessionManager.isConnected()) return;
  const pkt = new OutPacket(OutPacketOpcode.CHANGE_KEYMAP);
  (pkt as any).writeByte(0); pkt.dispatch();
}

// ─── UIKeyConfig object ───────────────────────────────────────────────────────

const UIKeyConfig = {
  isHidden: true,
  initialized: false,
  buttons: [] as MapleStanceButton[],

  // WZ bitmaps loaded in initialize()
  bgImg: null as any,       // backgrnd — full keyboard background (629×373)
  bgImg2: null as any,      // reserved for future secondary backgrounds
  bgImg3: null as any,
  keyTex: {} as Record<number, any>,    // index → glyph bitmap (key labels)
  actionIcons: {} as Record<string, any>, // action name → icon bitmap (32×32)

  // Window position and size in screen pixels (updated after bgImg loads)
  x: 60, y: 40, W: 700, H: 360,

  // Parallel array to this.buttons — stores each button's (ox, oy) offset from
  // window origin so moveTo() can reposition them when the window is dragged.
  _btnOffsets: [] as Array<{ox: number; oy: number}>,

  // Which key slot is currently selected (blue highlight, waiting for a tray drop)
  selectedKey: null as string | null,
  hoveredKey: null as string | null,

  // Drag-and-drop state
  _dragAction: null as string | null,   // action name currently being dragged
  _dragFromKey: null as string | null,  // key the drag started from (null = tray)
  _dragX: 0, _dragY: 0,                // last known mouse position during drag

  // ── Initialize ─────────────────────────────────────────────────────────────

  async initialize(canvas: GameCanvas) {
    if (this.initialized) return;
    if (!canvas?.keys) { console.warn('[UIKeyConfig] no canvas.keys'); return; }
    this.initialized = true;

    // ESC cancels any active selection or drag
    window.addEventListener('keydown', (e) => {
      if (this.isHidden) return;
      if (e.keyCode === canvas.keys.esc) {
        this.selectedKey = null;
        this._dragAction = null;
        this._dragFromKey = null;
        e.preventDefault();
      }
    });

    /**
     * mouseup completes a drag-and-drop operation.
     * If the cursor is over a key slot → bind the dragged action to that key.
     * If the drag started from a key and misses all slots → unbind that key.
     * If the drag started from the tray and misses → no change (cancel).
     */
    window.addEventListener('mouseup', (e) => {
      if (this.isHidden || !this._dragAction) return;
      const rect = (e.target as HTMLElement)?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const rx = mx - this.x, ry = my - this.y;
      const KEY_SLOT = Math.round(28 * SC);

      let dropped = false;
      for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
        const skx = Math.round(kx * SC), sky = Math.round(ky * SC);
        const slotW = Math.round((KEY_W[keyName] ?? 28) * SC);
        if (rx >= skx && rx < skx + slotW && ry >= sky && ry < sky + KEY_SLOT) {
          this._bindAction(this._dragAction!, keyName);
          dropped = true;
          break;
        }
      }
      // Dragged from a bound key but released over empty space → remove binding
      if (!dropped && this._dragFromKey) {
        this._unbindKey(this._dragFromKey);
      }
      this._dragAction = null;
      this._dragFromKey = null;
    });

    // Load WZ assets from UI.wz/UIWindow.img/KeyConfig
    const keyNode = await NXManager.get('UI.wz/UIWindow.img/KeyConfig');

    // Background bitmap — node is named 'backgrnd' in the NX binary
    this.bgImg = keyNode?.nGet('backgrnd')?.nGetImage?.() ?? null;
    this.bgImg2 = null; this.bgImg3 = null;

    if (this.bgImg?.width > 1) {
      // Scale the logical window size so centering accounts for SC
      this.W = Math.round(this.bgImg.width * SC);
      this.H = Math.round(this.bgImg.height * SC);
      this.x = Math.floor((config.width - this.W) / 2);
      this.y = Math.floor((config.height - this.H) / 2);
    }

    // Load key glyph textures — WZ children are named "1", "2", … (not positional)
    const keyArr = keyNode?.nGet('key');
    if (keyArr) {
      for (const [, idx] of Object.entries(KEY_TEX_IDX)) {
        const child = keyArr.nGet(String(idx));
        if (child) this.keyTex[idx] = child.nGetImage?.() ?? null;
      }
    }

    // Load action icon bitmaps — WZ children named "0", "1", … (32×32 each)
    const iconArr = keyNode?.nGet('icon');
    if (iconArr) {
      for (const [action, iconIdx] of Object.entries(ACTION_ICON_IDX)) {
        const child = iconArr.nGet(String(iconIdx));
        if (child) this.actionIcons[action] = child.nGetImage?.() ?? null;
      }
    }

    // Helper: create a MapleStanceButton from a WZ node at window-relative offset (ox, oy)
    this._btnOffsets = [];
    const addBtn = (node: any, ox: number, oy: number, cb: () => void) => {
      if (!node) return;
      const btn = new MapleStanceButton(canvas, {
        x: this.x + ox, y: this.y + oy,
        img: node.nChildren ?? node,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: cb,
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
      this._btnOffsets.push({ ox, oy }); // saved so moveTo() can reposition on drag
    };

    // Close button — HeavenMS positions it at (bgWidth - 18, 3)
    addBtn(keyNode?.nGet('BtClose'),   this.W - 18,  3,
      () => this.hide());

    // Bottom button row (y = window height - 23)
    const BY = this.H - 23;
    addBtn(keyNode?.nGet('BtDefault'), 8,            BY,
      () => { stagedBindings = { ...defaultBindings }; });          // reset to defaults
    addBtn(keyNode?.nGet('BtDelete'),  73,           BY,
      () => { if (this.selectedKey) { this._unbindKey(this.selectedKey); this.selectedKey = null; } }); // clear selected key
    addBtn(keyNode?.nGet('BtHelp'),    145,          BY,
      () => { /* TODO: show help panel */ });
    addBtn(keyNode?.nGet('BtOK'),      this.W - 100, BY,
      () => { Object.assign(keyBindings, stagedBindings); persist(); sendKeymapPacket(); this.hide(); }); // commit
    addBtn(keyNode?.nGet('BtCancel'),  this.W - 53,  BY,
      () => { stagedBindings = { ...keyBindings }; this.hide(); }); // discard

    // Register as a draggable window so the title bar can be grabbed
    ClickManager.addDragableMenu(this);
  },

  // ── Internal helpers ────────────────────────────────────────────────────────

  /** Returns the action currently staged for a given key, or null if unbound. */
  _actionForKey(key: string): string | null {
    for (const [action, k] of Object.entries(stagedBindings)) {
      if (k === key) return action;
    }
    return null;
  },

  /** Removes any staged binding that uses this key (one action per key enforced). */
  _unbindKey(key: string) {
    for (const action of Object.keys(stagedBindings)) {
      if (stagedBindings[action] === key) delete stagedBindings[action];
    }
  },

  /**
   * Assigns action → key in stagedBindings.
   * Clears any prior binding for that action AND any prior binding for that key
   * to maintain the one-action-per-key / one-key-per-action invariant.
   */
  _bindAction(action: string, key: string) {
    delete stagedBindings[action];  // remove old key for this action
    this._unbindKey(key);           // remove old action for this key
    stagedBindings[action] = key;
  },

  /** Returns all actions that have no key assigned in stagedBindings. */
  _unboundActions(): string[] {
    return Object.keys(ACTION_LABEL).filter(a => !stagedBindings[a]);
  },

  // ── Draggable window interface (called by ClickManager) ─────────────────────

  /** Hit region for window dragging — title bar area (top 20 px). */
  getRect(_camera: any) {
    return { x: this.x, y: this.y, width: this.W, height: 20 };
  },

  /** Called by ClickManager when the user drags the title bar. */
  moveTo(pos: { x: number; y: number }) {
    this.x = pos.x;
    this.y = pos.y;
    // Keep all buttons at their correct offsets from the new window origin
    this.buttons.forEach((btn, i) => {
      const off = this._btnOffsets[i];
      if (off) { btn.x = this.x + off.ox; btn.y = this.y + off.oy; }
    });
  },

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Open window — copy live bindings into staged so edits don't affect gameplay until OK. */
  show() {
    stagedBindings = { ...keyBindings };
    this.selectedKey = null;
    this.isHidden = false;
    this.buttons.forEach(b => b.isHidden = false);
  },

  /** Close window — staged changes are silently discarded. */
  hide() {
    this.isHidden = true;
    this.selectedKey = null;
    this.buttons.forEach(b => b.isHidden = true);
  },

  toggle() { this.isHidden ? this.show() : this.hide(); },

  // ── Mouse input ─────────────────────────────────────────────────────────────

  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;
    // Convert screen coords to window-relative coords for all hit tests below
    const rx = mx - this.x, ry = my - this.y;

    // ── Hit-test: action icon tray (two rows below the keyboard) ──────────────
    // Tray Y positions are unscaled; multiply by SC for actual pixel position.
    // Row 0: actions[0..19]  Row 1: actions[20..]
    const ICON_SIZE = Math.round(28 * SC), ICON_STEP = Math.round(30 * SC);
    const TRAY_Y1 = Math.round(277 * SC), TRAY_Y2 = Math.round(308 * SC);
    const allActions = Object.keys(ACTION_ICON_IDX);
    for (let i = 0; i < allActions.length; i++) {
      const row = i < 20 ? 0 : 1;
      const col = i < 20 ? i : i - 20;
      const ix = Math.round(13 * SC) + col * ICON_STEP;
      const iy = row === 0 ? TRAY_Y1 : TRAY_Y2;
      if (rx >= ix && rx < ix + ICON_SIZE && ry >= iy && ry < iy + ICON_SIZE) {
        // Begin dragging this action from the tray to a key slot
        this._dragAction = allActions[i];
        this._dragFromKey = null; // tray source, not a key
        this._dragX = mx; this._dragY = my;
        this.selectedKey = null;
        return true;
      }
    }

    // ── Hit-test: keyboard key slots ──────────────────────────────────────────
    // Slot size is 28×28 unscaled (wider for ctrl/alt/space via KEY_W).
    const KEY_SLOT = Math.round(28 * SC);
    for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
      const skx = Math.round(kx * SC), sky = Math.round(ky * SC);
      const slotW = Math.round((KEY_W[keyName] ?? 28) * SC);
      if (rx >= skx && rx < skx + slotW && ry >= sky && ry < sky + KEY_SLOT) {
        const boundAction = this._actionForKey(keyName);
        if (boundAction) {
          // Key already has an action — pick it up for drag (move or remove)
          this._dragAction = boundAction;
          this._dragFromKey = keyName;
          this._dragX = mx; this._dragY = my;
          this.selectedKey = null;
        } else {
          // Empty key — toggle selection (blue highlight waits for a tray drag drop)
          this.selectedKey = this.selectedKey === keyName ? null : keyName;
        }
        return true;
      }
    }

    return true; // consume click even on blank window areas
  },

  // ── Render ──────────────────────────────────────────────────────────────────

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    // ── 1. Background ─────────────────────────────────────────────────────────
    // The WZ backgrnd bitmap already contains the keyboard artwork.
    // We scale it by SC so everything below lines up with the same factor.
    if (this.bgImg?.width > 1) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y, scaleX: SC, scaleY: SC });
    } else {
      // Fallback if WZ asset failed to load
      canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H,
        color: '#0e0e1e', alpha: 0.97, strokeColor: '#445577', strokeWidth: 1 });
      canvas.drawText({ text: 'Key Configuration', color: '#FFDD88',
        x: this.x + 10, y: this.y + 14, fontSize: 12, fontWeight: 'bold' });
    }

    // ── 2. Action icon tray ───────────────────────────────────────────────────
    // Two rows of icons sitting below the keyboard (unscaled y=277 / 308).
    // Already-bound icons are dimmed (alpha 0.35) so the player can see at a
    // glance which actions still need a key assigned.
    const ICON_SIZE = Math.round(28 * SC), ICON_STEP = Math.round(30 * SC);
    const allActions = Object.keys(ACTION_ICON_IDX);
    const mx = (canvas as any).mouseX ?? -1, my = (canvas as any).mouseY ?? -1;
    let hoveredAction: string | null = null;

    allActions.forEach((action, i) => {
      const row = i < 20 ? 0 : 1;
      const col = i < 20 ? i : i - 20;
      const ix = this.x + Math.round(13 * SC) + col * ICON_STEP;
      const iy = this.y + Math.round((row === 0 ? 277 : 308) * SC);
      const isBound = !!stagedBindings[action];
      const icon = this.actionIcons[action];

      // Hover highlight (light blue outline)
      const isHovered = mx >= ix && mx < ix + ICON_SIZE && my >= iy && my < iy + ICON_SIZE;
      if (isHovered) hoveredAction = action;
      if (isHovered) canvas.drawRect({ x: ix - 1, y: iy - 1,
        width: ICON_SIZE + 2, height: ICON_SIZE + 2, color: '#AADDFF', alpha: 0.4 });

      if (icon?.width > 1) {
        const scale = ICON_SIZE / Math.max(icon.width, icon.height);
        canvas.drawImage({ img: icon, dx: ix, dy: iy, scaleX: scale, scaleY: scale,
          alpha: isBound ? 0.35 : 1 }); // dim = already assigned to a key
      } else {
        // WZ icon not loaded — render a labelled fallback box
        canvas.drawRect({ x: ix, y: iy, width: ICON_SIZE, height: ICON_SIZE,
          color: isBound ? '#111122' : '#223366', alpha: 0.8 });
        canvas.drawText({ text: (ACTION_LABEL[action] ?? action).slice(0,4),
          color: isBound ? '#445566' : '#AABBCC',
          x: ix + 2, y: iy + Math.round(18 * SC), fontSize: Math.round(7 * SC) });
      }
    });

    // ── 3. Hint bar ───────────────────────────────────────────────────────────
    // Shown near the bottom of the window; message changes during drag/selection.
    const hint = this.selectedKey
      ? `Key [${this.selectedKey.toUpperCase()}] selected — click action above to bind, or another key to swap`
      : 'Click a key on the keyboard, then click an action icon above to bind';
    canvas.drawText({ text: hint, color: this.selectedKey ? '#AADDFF' : '#778899',
      x: this.x + 8, y: this.y + this.H - 32, fontSize: 9 });

    // ── 4. Keyboard overlay ───────────────────────────────────────────────────
    // For every key in KEY_POS we draw:
    //   a) a selection/hover highlight rect
    //   b) the WZ glyph label (letter/symbol) in the top-left of the slot
    //   c) the action icon centred in the slot if a binding exists
    const KEY_SLOT = Math.round(28 * SC); // height (and default width) of each key slot
    let hoveredKey: string | null = null;

    for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
      const ax = this.x + Math.round(kx * SC); // absolute screen X of slot top-left
      const ay = this.y + Math.round(ky * SC); // absolute screen Y of slot top-left
      const slotW = Math.round((KEY_W[keyName] ?? 28) * SC); // wider for ctrl/alt/space

      const isSelected = this.selectedKey === keyName;
      const isHovKey = mx >= ax && mx < ax + slotW && my >= ay && my < ay + KEY_SLOT;
      if (isHovKey) hoveredKey = keyName;
      const boundAction = this._actionForKey(keyName);

      // Selection = solid blue tint; hover = faint blue tint
      if (isSelected) {
        canvas.drawRect({ x: ax, y: ay, width: slotW, height: KEY_SLOT,
          color: '#4488FF', alpha: 0.5 });
      } else if (isHovKey) {
        canvas.drawRect({ x: ax, y: ay, width: slotW, height: KEY_SLOT,
          color: '#AADDFF', alpha: 0.2 });
      }

      // WZ key glyph (small letter label) — top-left corner of slot
      const glyphIdx = KEY_TEX_IDX[keyName];
      const glyph = glyphIdx != null ? this.keyTex[glyphIdx] : null;
      if (glyph?.width > 1) {
        canvas.drawImage({ img: glyph, dx: ax + 2, dy: ay + 2, scaleX: SC, scaleY: SC });
      }

      // Action icon centred in the slot when a binding exists
      if (boundAction) {
        const icon = this.actionIcons[boundAction];
        if (icon?.width > 1) {
          const scale = (KEY_SLOT - 4) / Math.max(icon.width, icon.height);
          canvas.drawImage({ img: icon, dx: ax + 2, dy: ay + 2, scaleX: scale, scaleY: scale });
        } else {
          // Fallback text if icon bitmap missing
          canvas.drawText({ text: (ACTION_LABEL[boundAction] ?? boundAction).slice(0,3),
            color: '#FFEE88', x: ax + 2, y: ay + Math.round(18 * SC),
            fontSize: Math.round(7 * SC) });
        }
      }
    }

    // ── 5. Drag ghost ─────────────────────────────────────────────────────────
    // While dragging, render the action icon at 85% opacity following the cursor.
    // The icon is centred on the mouse pointer for natural feel.
    if (this._dragAction) {
      const dicon = this.actionIcons[this._dragAction];
      const dsize = Math.round(32 * SC);
      const dgx = mx - dsize / 2, dgy = my - dsize / 2;
      if (dicon?.width > 1) {
        const dscale = dsize / Math.max(dicon.width, dicon.height);
        canvas.drawImage({ img: dicon, dx: dgx, dy: dgy,
          scaleX: dscale, scaleY: dscale, alpha: 0.85 });
      } else {
        // Fallback coloured box with action name
        canvas.drawRect({ x: dgx, y: dgy, width: dsize, height: dsize,
          color: '#4488FF', alpha: 0.7 });
        canvas.drawText({ text: (ACTION_LABEL[this._dragAction] ?? this._dragAction).slice(0,4),
          color: '#FFFFFF', x: dgx + 2, y: dgy + dsize - 4,
          fontSize: Math.round(7 * SC) });
      }
    }

    // ── 6. Hover tooltip ──────────────────────────────────────────────────────
    // Show action name when hovering over a tray icon or a bound key.
    // Unbound keys show the key name instead.
    const tooltipAction = hoveredAction ?? (hoveredKey ? this._actionForKey(hoveredKey) : null);
    const tooltipLabel  = tooltipAction
      ? (ACTION_LABEL[tooltipAction] ?? tooltipAction)
      : hoveredKey ? hoveredKey.toUpperCase() : null;
    if (tooltipLabel) {
      const tw = tooltipLabel.length * 6 + 8;
      const tx = Math.min(mx + 10, this.x + this.W - tw - 4);
      const ty = my - 18;
      canvas.drawRect({ x: tx - 2, y: ty - 2, width: tw, height: 16,
        color: '#000000', alpha: 0.75 });
      canvas.drawText({ text: tooltipLabel, color: '#FFFFFF',
        x: tx + 2, y: ty + 11, fontSize: 10 });
    }

    // ── 7. Buttons (WZ MapleStanceButton widgets) ─────────────────────────────
    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIKeyConfig;

/**
 * getActionIcons — returns the loaded action icon bitmaps.
 * Used by UIStatusBar to render the quick-slot reference bar at the bottom
 * of the screen without importing the full UIKeyConfig object.
 */
export function getActionIcons() { return UIKeyConfig.actionIcons; }
