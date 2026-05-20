import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import SessionManager from '../SessionManager';
import config from '../Config';

const SC = 1.4; // uniform scale for background + key overlay

// ─── Key positions relative to window origin (from HeavenMS load_keys_pos) ───
const KEY_POS: Record<string, [number, number]> = {
  esc: [21, 31],
  f1: [85, 31],  f2: [118, 31],  f3: [151, 31],  f4: [184, 31],
  f5: [234, 31], f6: [267, 31],  f7: [300, 31],  f8: [333, 31],
  f9: [383, 31], f10: [416, 31], f11: [449, 31], f12: [482, 31],
  tilde: [21, 66],
  '1': [54,66], '2': [87,66],  '3': [120,66], '4': [153,66], '5': [186,66],
  '6': [219,66],'7': [252,66], '8': [285,66], '9': [318,66], '0': [351,66],
  minus: [384,66], plus: [417,66],
  insert: [558,66], home: [591,66], pageup: [624,66],
  q:[70,99],  w:[103,99], e:[136,99], r:[169,99], t:[202,99],
  y:[235,99], u:[268,99], i:[301,99], o:[334,99], p:[367,99],
  '[': [400,99], ']': [433,99],
  delete:[558,99], end:[591,99], pagedown:[624,132],
  a:[86,132],  s:[119,132], d:[152,132], f:[185,132], g:[218,132],
  h:[251,132], j:[284,132], k:[317,132], l:[350,132],
  colon:[383,132], quote:[416,132],
  z:[69,165],  x:[102,165], c:[135,165], v:[168,165], b:[201,165],
  n:[234,165], m:[267,165], comma:[300,165], period:[333,165],
  ctrl:[29,199], alt:[127,199], space:[224,199],
};

// Per-key slot widths for wider keys (height stays 28 for all)
const KEY_W: Record<string, number> = {
  ctrl:42, alt:42, space:118, enter:32, shift:46,
  backspace:40, tab:36, capslock:42, pipe:28,
};

// key name → key[] WZ texture index (from HeavenMS load_key_textures)
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

// Action → icon[] index (matching HeavenMS KeyAction::Id enum order from EQUIPMENT)
const ACTION_ICON_IDX: Record<string, number> = {
  equip:0, inventory:1, stats:2, skill:3, quest:4, worldmap:5, minimap:6,
  friends:7, party:8, menu:10, guild:12, guildchat:13, alliancechat:14,
  chat:18, pickup:21, sit:22, attack:23, jump:24,
  face1:26, face2:27, face3:28, face4:29, face5:30, face6:31,
  partychat:34, whisper:36,
};

// Action display labels
const ACTION_LABEL: Record<string, string> = {
  attack:'Attack', jump:'Jump', pickup:'Pick Up', sit:'Sit',
  stats:'Stats', inventory:'Items', skill:'Skills', equip:'Equipment',
  quest:'Quest', menu:'Menu', worldmap:'WorldMap', minimap:'MiniMap',
  chat:'Chat', partychat:'PartyChat', guildchat:'GuildChat', alliancechat:'AllianceChat',
  party:'Party', guild:'Guild', friends:'Friends', whisper:'Whisper',
  face1:'Face 1', face2:'Face 2', face3:'Face 3',
  face4:'Face 4', face5:'Face 5', face6:'Face 6',
};

// Default bindings (action → key), matching HeavenMS alternate_keys
export const defaultBindings: Record<string, string> = {
  attack:'ctrl', jump:'alt',   pickup:'z',    sit:'x',
  stats:'c',     inventory:'i', skill:'k',    equip:'u',
  quest:'j',     menu:'[',     worldmap:'n',  minimap:'m',
  chat:'enter',  partychat:'home', guildchat:'delete', alliancechat:'end',
  party:'p',     guild:'g',    friends:'period', whisper:'h',
  face1:'f1',    face2:'f2',   face3:'f3',
  face4:'f5',    face5:'f6',   face6:'f7',
};

const STORAGE_KEY = 'mapleweb_keybindings';

function loadSaved(): Record<string, string> {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return { ...defaultBindings, ...JSON.parse(s) }; }
  catch (_) {}
  return { ...defaultBindings };
}

export const keyBindings: Record<string, string> = loadSaved();

let stagedBindings: Record<string, string> = { ...keyBindings };

function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keyBindings)); } catch (_) {} }

function sendKeymapPacket() {
  if (!SessionManager.isConnected()) return;
  const pkt = new OutPacket(OutPacketOpcode.CHANGE_KEYMAP);
  (pkt as any).writeByte(0); pkt.dispatch();
}

// ─── UIKeyConfig ──────────────────────────────────────────────────────────────
const UIKeyConfig = {
  isHidden: true,
  initialized: false,
  buttons: [] as MapleStanceButton[],

  // WZ assets
  bgImg: null as any, bgImg2: null as any, bgImg3: null as any,
  keyTex: {} as Record<number, any>,
  actionIcons: {} as Record<string, any>,

  // Window geometry (set from bgImg after load)
  x: 60, y: 40, W: 700, H: 360,

  // Button offsets for drag repositioning
  _btnOffsets: [] as Array<{ox: number; oy: number}>,

  // Interaction state
  selectedKey: null as string | null,
  hoveredKey: null as string | null,

  // Drag state
  _dragAction: null as string | null,  // action being dragged
  _dragFromKey: null as string | null, // source key if dragged from a bound key (null = from tray)
  _dragX: 0, _dragY: 0,

  async initialize(canvas: GameCanvas) {
    if (this.initialized) return;
    if (!canvas?.keys) { console.warn('[UIKeyConfig] no canvas.keys'); return; }
    this.initialized = true;

    // Reverse map: keycode → name, for ESC cancel
    const keyCodeToName: Record<number, string> = Object.fromEntries(
      Object.entries(canvas.keys).map(([n, c]) => [c, n])
    );

    // Global keydown: ESC cancels selection / drag
    window.addEventListener('keydown', (e) => {
      if (this.isHidden) return;
      if (e.keyCode === canvas.keys.esc) { this.selectedKey = null; this._dragAction = null; this._dragFromKey = null; e.preventDefault(); }
    });

    // Global mouseUp: complete or cancel drag
    window.addEventListener('mouseup', (e) => {
      if (this.isHidden || !this._dragAction) return;
      const rect = (e.target as HTMLElement)?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const rx = mx - this.x, ry = my - this.y;
      const KEY_SLOT = Math.round(28 * SC);

      // Try drop onto a key slot
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
      // If dropped on tray area or missed — unbind source key (remove from keyboard)
      if (!dropped && this._dragFromKey) {
        this._unbindKey(this._dragFromKey);
      }
      this._dragAction = null;
      this._dragFromKey = null;
    });

    // Source confirmed from NX data: UIWindow.img/KeyConfig
    const keyNode = await NXManager.get('UI.wz/UIWindow.img/KeyConfig');

    // Background — named 'backgrnd' in NX binary (629×373)
    this.bgImg = keyNode?.nGet('backgrnd')?.nGetImage?.() ?? null;
    this.bgImg2 = null; this.bgImg3 = null;

    if (this.bgImg?.width > 1) {
      this.W = Math.round(this.bgImg.width * SC);
      this.H = Math.round(this.bgImg.height * SC);
      this.x = Math.floor((config.width - this.W) / 2);
      this.y = Math.floor((config.height - this.H) / 2);
    }

    // key[] children named "1","2",... in NX binary (same as HeavenMS indices)
    const keyArr = keyNode?.nGet('key');
    if (keyArr) {
      for (const [, idx] of Object.entries(KEY_TEX_IDX)) {
        const child = keyArr.nGet(String(idx));
        if (child) this.keyTex[idx] = child.nGetImage?.() ?? null;
      }
    }

    // icon[] children named "0","1",... in NX binary
    const iconArr = keyNode?.nGet('icon');
    if (iconArr) {
      for (const [action, iconIdx] of Object.entries(ACTION_ICON_IDX)) {
        const child = iconArr.nGet(String(iconIdx));
        if (child) this.actionIcons[action] = child.nGetImage?.() ?? null;
      }
    }

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
      this._btnOffsets.push({ ox, oy });
    };

    // Close: HeavenMS formula bg_dimensions.x() - 18, 3
    addBtn(keyNode?.nGet('BtClose'),   this.W - 18,  3,           () => this.hide());
    // Bottom row: Default | Delete | Help on left, OK | Cancel on right
    const BY = this.H - 23; // button y (~350 for 373-height bg)
    addBtn(keyNode?.nGet('BtDefault'), 8,            BY, () => { stagedBindings = { ...defaultBindings }; });
    addBtn(keyNode?.nGet('BtDelete'),  73,           BY, () => { if (this.selectedKey) { this._unbindKey(this.selectedKey); this.selectedKey = null; } });
    addBtn(keyNode?.nGet('BtHelp'),    145,          BY, () => { /* help panel not implemented */ });
    addBtn(keyNode?.nGet('BtOK'),      this.W - 100, BY, () => { Object.assign(keyBindings, stagedBindings); persist(); sendKeymapPacket(); this.hide(); });
    addBtn(keyNode?.nGet('BtCancel'),  this.W - 53,  BY, () => { stagedBindings = { ...keyBindings }; this.hide(); });

    ClickManager.addDragableMenu(this);
  },

  // ── State helpers ───────────────────────────────────────────────────────────
  // Returns the action bound to a key in staged (inverted lookup)
  _actionForKey(key: string): string | null {
    for (const [action, k] of Object.entries(stagedBindings)) {
      if (k === key) return action;
    }
    return null;
  },

  _unbindKey(key: string) {
    for (const action of Object.keys(stagedBindings)) {
      if (stagedBindings[action] === key) delete stagedBindings[action];
    }
  },

  _bindAction(action: string, key: string) {
    // Remove old binding for this action
    delete stagedBindings[action];
    // Remove old binding for this key (only one action per key)
    this._unbindKey(key);
    stagedBindings[action] = key;
  },

  _unboundActions(): string[] {
    return Object.keys(ACTION_LABEL).filter(a => !stagedBindings[a]);
  },

  // ── Draggable interface (used by ClickManager) ──────────────────────────────
  getRect(_camera: any) {
    // Drag handle = title bar (top 20px)
    return { x: this.x, y: this.y, width: this.W, height: 20 };
  },

  moveTo(pos: { x: number; y: number }) {
    this.x = pos.x;
    this.y = pos.y;
    this.buttons.forEach((btn, i) => {
      const off = this._btnOffsets[i];
      if (off) { btn.x = this.x + off.ox; btn.y = this.y + off.oy; }
    });
  },

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  show()   { stagedBindings = { ...keyBindings }; this.selectedKey = null; this.isHidden = false; this.buttons.forEach(b => b.isHidden = false); },
  hide()   { this.isHidden = true; this.selectedKey = null; this.buttons.forEach(b => b.isHidden = true); },
  toggle() { this.isHidden ? this.show() : this.hide(); },

  // ── Input ───────────────────────────────────────────────────────────────────
  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;
    const rx = mx - this.x, ry = my - this.y;

    // Hit-test action icon tray — below keyboard (scaled)
    const ICON_SIZE = Math.round(28 * SC), ICON_STEP = Math.round(30 * SC);
    const TRAY_Y1 = Math.round(277 * SC), TRAY_Y2 = Math.round(308 * SC);
    const allActions = Object.keys(ACTION_ICON_IDX);
    for (let i = 0; i < allActions.length; i++) {
      const row = i < 20 ? 0 : 1;
      const col = i < 20 ? i : i - 20;
      const ix = Math.round(13 * SC) + col * ICON_STEP;
      const iy = row === 0 ? TRAY_Y1 : TRAY_Y2;
      if (rx >= ix && rx < ix + ICON_SIZE && ry >= iy && ry < iy + ICON_SIZE) {
        // Start drag from tray
        this._dragAction = allActions[i];
        this._dragFromKey = null;
        this._dragX = mx; this._dragY = my;
        this.selectedKey = null;
        return true;
      }
    }

    // Hit-test key slots (scaled)
    const KEY_SLOT = Math.round(28 * SC);
    for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
      const skx = Math.round(kx * SC), sky = Math.round(ky * SC);
      const slotW = Math.round((KEY_W[keyName] ?? 28) * SC);
      if (rx >= skx && rx < skx + slotW && ry >= sky && ry < sky + KEY_SLOT) {
        const boundAction = this._actionForKey(keyName);
        if (boundAction) {
          // Start drag from key — allows repositioning or removal
          this._dragAction = boundAction;
          this._dragFromKey = keyName;
          this._dragX = mx; this._dragY = my;
          this.selectedKey = null;
        } else {
          // Empty key — select it for binding via tray drag
          this.selectedKey = this.selectedKey === keyName ? null : keyName;
        }
        return true;
      }
    }

    return true;
  },

  // ── Render ──────────────────────────────────────────────────────────────────
  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    // 1. Background — drawn at SC scale
    if (this.bgImg?.width > 1) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y, scaleX: SC, scaleY: SC });
    } else {
      canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H,
        color: '#0e0e1e', alpha: 0.97, strokeColor: '#445577', strokeWidth: 1 });
      canvas.drawText({ text: 'Key Configuration', color: '#FFDD88',
        x: this.x + 10, y: this.y + 14, fontSize: 12, fontWeight: 'bold' });
    }

    // 2. Action icon tray — below keyboard, two rows
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

      const isHovered = mx >= ix && mx < ix + ICON_SIZE && my >= iy && my < iy + ICON_SIZE;
      if (isHovered) hoveredAction = action;
      if (isHovered) canvas.drawRect({ x: ix - 1, y: iy - 1, width: ICON_SIZE + 2, height: ICON_SIZE + 2, color: '#AADDFF', alpha: 0.4 });

      if (icon?.width > 1) {
        const scale = ICON_SIZE / Math.max(icon.width, icon.height);
        canvas.drawImage({ img: icon, dx: ix, dy: iy, scaleX: scale, scaleY: scale,
          alpha: isBound ? 0.35 : 1 });
      } else {
        canvas.drawRect({ x: ix, y: iy, width: ICON_SIZE, height: ICON_SIZE,
          color: isBound ? '#111122' : '#223366', alpha: 0.8 });
        canvas.drawText({ text: (ACTION_LABEL[action] ?? action).slice(0,4),
          color: isBound ? '#445566' : '#AABBCC', x: ix + 2, y: iy + Math.round(18 * SC), fontSize: Math.round(7 * SC) });
      }
    });

    // Hint bar
    const hint = this.selectedKey
      ? `Key [${this.selectedKey.toUpperCase()}] selected — click action above to bind, or another key to swap`
      : 'Click a key on the keyboard, then click an action icon above to bind';
    canvas.drawText({ text: hint, color: this.selectedKey ? '#AADDFF' : '#778899',
      x: this.x + 8, y: this.y + this.H - 32, fontSize: 9 });

    // 3. Keyboard — key label glyphs + action icons on bound keys (all scaled)
    const KEY_SLOT = Math.round(28 * SC);
    let hoveredKey: string | null = null;
    for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
      const ax = this.x + Math.round(kx * SC), ay = this.y + Math.round(ky * SC);
      const slotW = Math.round((KEY_W[keyName] ?? 28) * SC);
      const isSelected = this.selectedKey === keyName;
      const isHovKey = mx >= ax && mx < ax + slotW && my >= ay && my < ay + KEY_SLOT;
      if (isHovKey) hoveredKey = keyName;
      const boundAction = this._actionForKey(keyName);

      if (isSelected) {
        canvas.drawRect({ x: ax, y: ay, width: slotW, height: KEY_SLOT, color: '#4488FF', alpha: 0.5 });
      } else if (isHovKey) {
        canvas.drawRect({ x: ax, y: ay, width: slotW, height: KEY_SLOT, color: '#AADDFF', alpha: 0.2 });
      }

      // Key label glyph scaled
      const glyphIdx = KEY_TEX_IDX[keyName];
      const glyph = glyphIdx != null ? this.keyTex[glyphIdx] : null;
      if (glyph?.width > 1) {
        canvas.drawImage({ img: glyph, dx: ax + 2, dy: ay + 2, scaleX: SC, scaleY: SC });
      }

      // Action icon on key if bound
      if (boundAction) {
        const icon = this.actionIcons[boundAction];
        if (icon?.width > 1) {
          const scale = (KEY_SLOT - 4) / Math.max(icon.width, icon.height);
          canvas.drawImage({ img: icon, dx: ax + 2, dy: ay + 2, scaleX: scale, scaleY: scale });
        } else {
          canvas.drawText({ text: (ACTION_LABEL[boundAction] ?? boundAction).slice(0,3),
            color: '#FFEE88', x: ax + 2, y: ay + Math.round(18 * SC), fontSize: Math.round(7 * SC) });
        }
      }
    }

    // 4. Drag ghost — icon follows cursor
    if (this._dragAction) {
      const dicon = this.actionIcons[this._dragAction];
      const dsize = Math.round(32 * SC);
      const dgx = mx - dsize / 2, dgy = my - dsize / 2;
      if (dicon?.width > 1) {
        const dscale = dsize / Math.max(dicon.width, dicon.height);
        canvas.drawImage({ img: dicon, dx: dgx, dy: dgy, scaleX: dscale, scaleY: dscale, alpha: 0.85 });
      } else {
        canvas.drawRect({ x: dgx, y: dgy, width: dsize, height: dsize, color: '#4488FF', alpha: 0.7 });
        canvas.drawText({ text: (ACTION_LABEL[this._dragAction] ?? this._dragAction).slice(0,4),
          color: '#FFFFFF', x: dgx + 2, y: dgy + dsize - 4, fontSize: Math.round(7 * SC) });
      }
    }

    // 6. Hover tooltip for icon tray or keyboard key
    const tooltipAction = hoveredAction ?? (hoveredKey ? this._actionForKey(hoveredKey) : null);
    const tooltipLabel = tooltipAction ? (ACTION_LABEL[tooltipAction] ?? tooltipAction)
      : hoveredKey ? hoveredKey.toUpperCase() : null;
    if (tooltipLabel) {
      const tw = tooltipLabel.length * 6 + 8;
      const tx = Math.min(mx + 10, this.x + this.W - tw - 4);
      const ty = my - 18;
      canvas.drawRect({ x: tx - 2, y: ty - 2, width: tw, height: 16, color: '#000000', alpha: 0.75 });
      canvas.drawText({ text: tooltipLabel, color: '#FFFFFF', x: tx + 2, y: ty + 11, fontSize: 10 });
    }

    // 5. Buttons
    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIKeyConfig;

// Exported so UIStatusBar can read action icons for the status bar display
export function getActionIcons() { return UIKeyConfig.actionIcons; }
