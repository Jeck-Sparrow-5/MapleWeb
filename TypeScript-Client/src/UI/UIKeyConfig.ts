import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import SessionManager from '../SessionManager';

// ─── Key positions relative to window origin (from HeavenMS load_keys_pos) ───
const KEY_POS: Record<string, [number, number]> = {
  esc: [31, 91],
  f1: [95, 91],  f2: [128, 91],  f3: [161, 91],  f4: [194, 91],
  f5: [244, 91], f6: [277, 91],  f7: [310, 91],  f8: [343, 91],
  f9: [393, 91], f10: [426, 91], f11: [459, 91], f12: [492, 91],
  tilde: [31, 126],
  '1': [64,126], '2': [97,126],  '3': [130,126], '4': [163,126], '5': [196,126],
  '6': [229,126],'7': [262,126], '8': [295,126], '9': [328,126], '0': [361,126],
  minus: [394,126], plus: [427,126],
  insert: [568,126], home: [601,126], pageup: [634,126],
  q:[80,159],  w:[113,159], e:[146,159], r:[179,159], t:[212,159],
  y:[245,159], u:[278,159], i:[311,159], o:[344,159], p:[377,159],
  '[': [410,159], ']': [443,159],
  delete:[568,159], end:[601,159], pagedown:[634,192],
  a:[96,192],  s:[129,192], d:[162,192], f:[195,192], g:[228,192],
  h:[261,192], j:[294,192], k:[327,192], l:[360,192],
  colon:[393,192], quote:[426,192],
  z:[79,225],  x:[112,225], c:[145,225], v:[178,225], b:[211,225],
  n:[244,225], m:[277,225], comma:[310,225], period:[343,225],
  ctrl:[39,259], alt:[137,259], space:[234,259],
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

  async initialize(canvas: GameCanvas) {
    if (this.initialized) return;
    if (!canvas?.keys) { console.warn('[UIKeyConfig] no canvas.keys'); return; }
    this.initialized = true;

    // Reverse map: keycode → name, for ESC cancel
    const keyCodeToName: Record<number, string> = Object.fromEntries(
      Object.entries(canvas.keys).map(([n, c]) => [c, n])
    );

    // Global keydown: ESC cancels selection
    window.addEventListener('keydown', (e) => {
      if (this.isHidden) return;
      if (e.keyCode === canvas.keys.esc) { this.selectedKey = null; e.preventDefault(); }
    });

    // Source confirmed from NX data: UIWindow.img/KeyConfig
    const keyNode = await NXManager.get('UI.wz/UIWindow.img/KeyConfig');

    // Background — named 'backgrnd' in NX binary (629×373)
    this.bgImg = keyNode?.nGet('backgrnd')?.nGetImage?.() ?? null;
    this.bgImg2 = null; this.bgImg3 = null;

    if (this.bgImg?.width > 1) {
      this.W = this.bgImg.width;
      this.H = this.bgImg.height;
      this.x = Math.floor((800 - this.W) / 2);
      this.y = Math.floor((600 - this.H) / 2);
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

    addBtn(keyNode?.nGet('BtClose'),   this.W - 20,  4,           () => this.hide());
    addBtn(keyNode?.nGet('BtDefault'), 8,            this.H - 26, () => { stagedBindings = { ...defaultBindings }; });
    addBtn(keyNode?.nGet('BtDelete'),  60,           this.H - 26, () => { if (this.selectedKey) { this._unbindKey(this.selectedKey); this.selectedKey = null; } });
    addBtn(keyNode?.nGet('BtOK'),      this.W - 106, this.H - 26, () => { Object.assign(keyBindings, stagedBindings); persist(); sendKeymapPacket(); this.hide(); });
    addBtn(keyNode?.nGet('BtCancel'),  this.W - 56,  this.H - 26, () => { stagedBindings = { ...keyBindings }; this.hide(); });

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
    const bound = new Set(Object.values(stagedBindings));
    return Object.keys(ACTION_LABEL).filter(a => !bound.has(stagedBindings[a]));
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

    // Hit-test action icon tray (y=25..83, two rows of 20 icons × 30px)
    const ICON_SIZE = 28, ICON_GAP = 2, ICON_STEP = ICON_SIZE + ICON_GAP;
    const TRAY_Y1 = 25, TRAY_Y2 = 55;
    const allActions = Object.keys(ACTION_ICON_IDX);
    for (let i = 0; i < allActions.length; i++) {
      const row = i < 20 ? 0 : 1;
      const col = i < 20 ? i : i - 20;
      const ix = 8 + col * ICON_STEP;
      const iy = row === 0 ? TRAY_Y1 : TRAY_Y2;
      if (rx >= ix && rx < ix + ICON_SIZE && ry >= iy && ry < iy + ICON_SIZE) {
        const action = allActions[i];
        if (this.selectedKey) {
          this._bindAction(action, this.selectedKey);
          this.selectedKey = null;
        }
        return true;
      }
    }

    // Hit-test key slots (keyboard area, y=91+)
    const KEY_SLOT = 28;
    for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
      if (rx >= kx && rx < kx + KEY_SLOT && ry >= ky && ry < ky + KEY_SLOT) {
        if (this.selectedKey === keyName) {
          this.selectedKey = null;
        } else if (this.selectedKey === null) {
          this.selectedKey = keyName;
        } else {
          // Swap actions between two selected keys
          const srcAction = this._actionForKey(this.selectedKey);
          const dstAction = this._actionForKey(keyName);
          if (srcAction) stagedBindings[srcAction] = keyName;
          else this._unbindKey(keyName);
          if (dstAction) stagedBindings[dstAction] = this.selectedKey;
          else this._unbindKey(this.selectedKey);
          this.selectedKey = null;
        }
        return true;
      }
    }

    return true;
  },

  // ── Render ──────────────────────────────────────────────────────────────────
  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    // 1. Background — WZ image (629×373) contains the full keyboard layout
    if (this.bgImg?.width > 1) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H,
        color: '#0e0e1e', alpha: 0.97, strokeColor: '#445577', strokeWidth: 1 });
      canvas.drawText({ text: 'Key Configuration', color: '#FFDD88',
        x: this.x + 10, y: this.y + 14, fontSize: 12, fontWeight: 'bold' });
    }

    // 2. Action icon tray — two rows of 20 icons above the keyboard (y+25, y+55)
    const ICON_SIZE = 28, ICON_STEP = 30;
    const allActions = Object.keys(ACTION_ICON_IDX);
    const boundKeys = new Set(Object.values(stagedBindings));
    allActions.forEach((action, i) => {
      const row = i < 20 ? 0 : 1;
      const col = i < 20 ? i : i - 20;
      const ix = this.x + 8 + col * ICON_STEP;
      const iy = this.y + (row === 0 ? 25 : 55);
      const isBound = !!stagedBindings[action];
      const icon = this.actionIcons[action];

      if (icon?.width > 1) {
        const scale = ICON_SIZE / Math.max(icon.width, icon.height);
        canvas.drawImage({ img: icon, dx: ix, dy: iy, scaleX: scale, scaleY: scale,
          alpha: isBound ? 0.35 : 1 }); // dim bound icons
      } else {
        // Fallback box
        canvas.drawRect({ x: ix, y: iy, width: ICON_SIZE, height: ICON_SIZE,
          color: isBound ? '#111122' : '#223366', alpha: 0.8 });
        canvas.drawText({ text: (ACTION_LABEL[action] ?? action).slice(0,4),
          color: isBound ? '#445566' : '#AABBCC', x: ix + 2, y: iy + 18, fontSize: 7 });
      }
    });

    // Hint: selected key or default
    const hint = this.selectedKey
      ? `Key [${this.selectedKey.toUpperCase()}] selected — click action above to bind, or another key to swap`
      : 'Click a key on the keyboard, then click an action icon above to bind';
    canvas.drawText({ text: hint, color: this.selectedKey ? '#AADDFF' : '#778899',
      x: this.x + 8, y: this.y + this.H - 32, fontSize: 9 });

    // 3. Keyboard — key label glyphs + action icons on bound keys
    const KEY_SLOT = 28;
    for (const [keyName, [kx, ky]] of Object.entries(KEY_POS)) {
      const ax = this.x + kx, ay = this.y + ky;
      const isSelected = this.selectedKey === keyName;
      const boundAction = this._actionForKey(keyName);

      // Selection highlight
      if (isSelected) {
        canvas.drawRect({ x: ax, y: ay, width: KEY_SLOT, height: KEY_SLOT,
          color: '#4488FF', alpha: 0.5 });
      }

      // Key label glyph from WZ key[] — drawn in top-left corner of slot
      const glyphIdx = KEY_TEX_IDX[keyName];
      const glyph = glyphIdx != null ? this.keyTex[glyphIdx] : null;
      if (glyph?.width > 1) {
        canvas.drawImage({ img: glyph, dx: ax + 2, dy: ay + 2 });
      }

      // Action icon on key if bound — centred, full-slot scale
      if (boundAction) {
        const icon = this.actionIcons[boundAction];
        if (icon?.width > 1) {
          const scale = (KEY_SLOT - 4) / Math.max(icon.width, icon.height);
          canvas.drawImage({ img: icon, dx: ax + 2, dy: ay + 2, scaleX: scale, scaleY: scale });
        } else {
          canvas.drawText({ text: (ACTION_LABEL[boundAction] ?? boundAction).slice(0,3),
            color: '#FFEE88', x: ax + 2, y: ay + 18, fontSize: 7 });
        }
      }
    }

    // 4. Buttons
    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIKeyConfig;
