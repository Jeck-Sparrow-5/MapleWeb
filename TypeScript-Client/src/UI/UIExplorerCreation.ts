import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import MapleInput from './MapleInput';
import GameCanvas from '../GameCanvas';
import CreateCharPacket from '../Net/Packets/CreateCharPacket';
import { CheckCharNamePacket } from '../Net/Packets/DeleteCharPacket';
import SessionManager from '../SessionManager';
import MapleCharacter from '../MapleCharacter';
import Inventory from '../Inventory/Inventory';
import Stats from '../Stats/Stats';
import { JobsMainType } from '../Constants/Jobs';

// ── Fallback appearance data ──────────────────────────────────────────────────
const FB_FACES_M  = [20000, 20001, 20002, 20100, 20401];
const FB_FACES_F  = [21000, 21001, 21002, 21100, 21201];
const FB_HAIRS_M  = [30000, 30010, 30020, 30030, 33110];
const FB_HAIRS_F  = [31000, 31010, 31020, 31030, 34000];
const FB_COLORS   = [0, 1, 2, 3, 4];
const FB_SKINS    = [0, 1, 2, 3, 4];
const FB_TOPS     = [1040002, 1040006, 1040010, 1041011];
const FB_BOTTOMS  = [1060002, 1060006, 1060010, 1061008];
const FB_SHOES    = [1072001, 1072005, 1072037, 1072038];
const FB_WEAPONS  = [1302000, 1312004, 1322005, 1332007];

// ── Layout constants (800×600) — adjust with debug overlay ───────────────────
const SCROLL_X   = 115;   // left scroll panel draw x
const SCROLL_Y   = 218;   // left scroll panel draw y
const ROW_Y0     = 243;   // first row center y
const ROW_DY     = 23;    // row pitch
const BAR_X      = 182;   // avatarSel bar draw x
const BAR_H      = 19;    // avatarSel bar draw height
const ARR_L_X    = 172;   // left arrow x
const ARR_R_X    = 318;   // right arrow x
const VAL_X      = 265;   // value text x (within bar)

const RIGHT_X     = 444;  // right panel left edge
const CHARNAME_Y  = 91;  // charName image y
const CHARSET_Y   = -202;  // charSet image y
const NAME_IN_X   = RIGHT_X + 8;
const NAME_IN_Y   = 227;
const NAME_IN_W   = 115;
const STAT_Y0     = 284;  // first stat row y
const STAT_DY     = 20;
const OK_X        = RIGHT_X + 6;
const OK_Y        = 449;
const CANCEL_X    = RIGHT_X + 75;
const CANCEL_Y    = 449;

const PREVIEW_X  = 390;
const PREVIEW_Y  = 430;
const BG_Y       = -80;  // shift background up to show foothold platform

// Called by CharManageHandlers after server validates the name
export function onExplorerNameResult(available: boolean) {
  if (!available) {
    UIExplorerCreation._step      = 'name';
    UIExplorerCreation._nameError = 'Name already taken.';
    UIExplorerCreation._applyStep();
    return;
  }
  // Name available — advance to look/appearance step
  UIExplorerCreation._step = 'look';
  UIExplorerCreation._applyStep();
}

function getImg(node: any): any {
  if (!node) return null;
  const first = node?.nChildren?.[0];
  if (!first) return node?.nGetImage?.() ?? null;
  return (first.nTagName === 'vector' ? first.nParent : first)?.nGetImage?.() ?? null;
}

const UIExplorerCreation = {
  isHidden:    true,
  initialized: false,

  _step:      'name' as 'name' | 'look' | 'waiting',
  _nameError: '',

  buttons:   [] as MapleStanceButton[],
  nameInput: null as MapleInput | null,

  // WZ images
  _bg:          [] as any[],   // NewChar/backgrnd + backgrnd2
  _scrollImg:   null as any,   // NewChar/scroll  — left parchment panel
  _charNameImg: null as any,   // NewChar/charName — name board (right top)
  _charSetImg:  null as any,   // NewChar/charSet  — stats board (right bottom)
  _avatarSel:   [] as any[],   // NewChar/avatarSel children (one per row)

  // Appearance pools
  _facesM:  FB_FACES_M.slice(), _facesF: FB_FACES_F.slice(),
  _hairs:   [FB_HAIRS_M.slice(), FB_HAIRS_F.slice()] as number[][],
  _colors:  FB_COLORS.slice(),  _skins:  FB_SKINS.slice(),
  _tops:    FB_TOPS.slice(),    _bots:   FB_BOTTOMS.slice(),
  _shoes:   FB_SHOES.slice(),   _weapons: FB_WEAPONS.slice(),

  _st: { gender:0, faceIdx:0, hairIdx:0, colorIdx:0, skinIdx:0,
         topIdx:0, botIdx:0, shoeIdx:0, weaponIdx:0, name:'' },
  _stats:         { str:4, dex:4, int:4, luk:4 },

  _preview:      null as MapleCharacter | null,
  _previewDirty: false,

  // ── Initialisation ───────────────────────────────────────────────────────────

  async initialize(canvas: GameCanvas) {
    await this._loadWZ(canvas);
    await this._loadAppearanceData();
    await this._buildPreview();
    this.initialized = true;
  },

  // Button groups per step
  _btnsName: [] as MapleStanceButton[],
  _btnsLook: [] as MapleStanceButton[],

  async _loadWZ(canvas: GameCanvas) {
    const login = await WZManager.get('UI.wz/Login.img');
    const nc    = login?.nGet?.('NewChar');
    const win   = await WZManager.get('UI.wz/UIWindow.img');

    // Background — MapLogin node from Login.img
    const mapLogin = login?.nGet?.('MapLogin');
    this._bg = (mapLogin?.nChildren ?? [])
      .map((c: any) => getImg(c))
      .filter(Boolean);

    // Left parchment scroll panel
    this._scrollImg = getImg(nc?.nGet?.('scroll'))
      ?? getImg(nc?.nGet?.('scroll')?.nGet?.('0'));

    // Right boards
    this._charNameImg = getImg(nc?.nGet?.('charName'));
    this._charSetImg  = getImg(nc?.nGet?.('charSet'));

    // avatarSel row bars — avatarSel has numbered children, one per row
    const avSel = nc?.nGet?.('avatarSel');
    if (avSel?.nChildren)
      this._avatarSel = avSel.nChildren.map((c: any) => getImg(c));

    // ── Buttons ──────────────────────────────────────────────────────────────
    this.buttons.forEach(b => ClickManager.removeButton(b));
    this.buttons = [];

    const st   = this._st;
    const wrap = (arr: any[], i: number, d: number) => (i + d + arr.length) % arr.length;

    type Row = { getArr(): any[]; getI(): number; setI(v:number): void };
    const rows: Row[] = [
      { getArr: () => st.gender===0 ? this._facesM : this._facesF, getI: () => st.faceIdx,   setI: (v) => { st.faceIdx=v;   } },
      { getArr: () => this._hairs[st.gender],                       getI: () => st.hairIdx,   setI: (v) => { st.hairIdx=v;   } },
      { getArr: () => this._colors,                                  getI: () => st.colorIdx,  setI: (v) => { st.colorIdx=v;  } },
      { getArr: () => this._skins,                                   getI: () => st.skinIdx,   setI: (v) => { st.skinIdx=v;   } },
      { getArr: () => this._tops,                                    getI: () => st.topIdx,    setI: (v) => { st.topIdx=v;    } },
      { getArr: () => this._bots,                                    getI: () => st.botIdx,    setI: (v) => { st.botIdx=v;    } },
      { getArr: () => this._shoes,                                   getI: () => st.shoeIdx,   setI: (v) => { st.shoeIdx=v;   } },
      { getArr: () => this._weapons,                                 getI: () => st.weaponIdx, setI: (v) => { st.weaponIdx=v; } },
      { getArr: () => [0, 1], getI: () => st.gender, setI: (v) => { st.gender=v; st.faceIdx=0; st.hairIdx=0; this._previewDirty=true; } },
    ];

    const arL  = nc?.nGet?.('BtLeft')?.nChildren   ?? win?.nGet?.('BtLeft')?.nChildren;
    const arR  = nc?.nGet?.('BtRight')?.nChildren  ?? win?.nGet?.('BtRight')?.nChildren;
    const btOK = nc?.nGet?.('BtYes')?.nChildren    ?? win?.nGet?.('BtOK')?.nChildren;
    const btNo = nc?.nGet?.('BtNo')?.nChildren      ?? win?.nGet?.('BtNo')?.nChildren;

    this._btnsName = [];
    this._btnsLook = [];

    const addBtn = (img: any, x: number, y: number, cb: () => void, group: MapleStanceButton[]) => {
      if (!img) return;
      const b = new MapleStanceButton(canvas, {
        x, y, img,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: cb,
      });
      ClickManager.addButton(b);
      this.buttons.push(b);
      group.push(b);
    };

    // Name step: OK (check name) + Back
    addBtn(btOK, OK_X,     OK_Y,     () => this._checkName(), this._btnsName);
    addBtn(btNo, CANCEL_X, CANCEL_Y, () => this.hide(),       this._btnsName);

    // Look step: appearance arrows + dice + OK + Cancel
    rows.forEach((row, i) => {
      const ry = ROW_Y0 + i * ROW_DY - 9;
      addBtn(arL, ARR_L_X, ry, () => { row.setI(wrap(row.getArr(), row.getI(), -1)); this._previewDirty = true; }, this._btnsLook);
      addBtn(arR, ARR_R_X, ry, () => { row.setI(wrap(row.getArr(), row.getI(),  1)); this._previewDirty = true; }, this._btnsLook);
    });
    addBtn(btOK, OK_X,     OK_Y,     () => this._dispatchCreate(), this._btnsLook);
    addBtn(btNo, CANCEL_X, CANCEL_Y, () => this.hide(),        this._btnsLook);

    // Name text input (always present when visible)
    this.nameInput?.remove?.();
    this.nameInput = new MapleInput(canvas, {
      x: NAME_IN_X, y: NAME_IN_Y, width: NAME_IN_W, height: 18, color: '#ffffff',
    });
  },

  async _loadAppearanceData() {
    try {
      const info = await WZManager.get('Etc.wz/MakeCharInfo.img');
      const list = (n: any): number[] =>
        n?.nChildren?.map((c: any) => parseInt(c.nValue ?? c.nName ?? '0')).filter(Boolean) ?? [];
      for (const g of [0, 1]) {
        const gn = info?.nGet?.('CharSet')?.nGet?.(`${g}`);
        const f = list(gn?.nGet?.('face')); if (f.length) { if (g===0) this._facesM=f; else this._facesF=f; }
        const h = list(gn?.nGet?.('hair')); if (h.length) this._hairs[g]=h;
      }
      const ex = info?.nGet?.('CharSet')?.nGet?.('0');
      const t = list(ex?.nGet?.('top'));    if (t.length) this._tops    = t;
      const b = list(ex?.nGet?.('pants'));  if (b.length) this._bots    = b;
      const s = list(ex?.nGet?.('shoes'));  if (s.length) this._shoes   = s;
      const w = list(ex?.nGet?.('weapon')); if (w.length) this._weapons = w;
      const sk  = list(info?.nGet?.('skin'));      if (sk.length)  this._skins  = sk;
      const col = list(info?.nGet?.('hairColor')); if (col.length) this._colors = col;
    } catch (_) {}
  },

  _rollStats() {
    const v = [4, 4, 4, 4];
    for (let i = 0; i < 9; i++) v[Math.floor(Math.random() * 4)]++;
    this._stats = { str: v[0], dex: v[1], int: v[2], luk: v[3] };
  },

  async _buildPreview() {
    try {
      this._preview = new MapleCharacter({
        name:'', hp:50, maxHp:50, mp:5, maxMp:5,
        Hair: this._hairs[0][0] ?? FB_HAIRS_M[0], exp:0, fame:0,
        inventory: new Inventory({}),
        stats: new Stats({ str:4, dex:4, int:4, luk:4, abilityPoints:0,
          maxHp:50, maxMp:5, jobType:JobsMainType.Begginer, job:'Beginner', level:1 }),
      });
      this._preview.skinColor = 0;
      this._preview.face = this._facesM[0] ?? FB_FACES_M[0];
      await this._preview.load();
    } catch (_) {}
  },

  async _refreshPreview() {
    if (!this._preview) return;
    const { gender:g, faceIdx, hairIdx, skinIdx, topIdx, botIdx, shoeIdx, weaponIdx } = this._st;
    try {
      const face = (g===0 ? this._facesM : this._facesF)[faceIdx] ?? FB_FACES_M[0];
      const skin = this._skins[skinIdx] ?? 0;
      if (this._preview.skinColor !== skin) await this._preview.setSkinColor(skin);
      if (this._preview.face      !== face) await this._preview.setFace(face);
      this._preview.equips = [];
      for (const id of [
        this._tops[topIdx]    ?? FB_TOPS[0],
        this._bots[botIdx]    ?? FB_BOTTOMS[0],
        this._shoes[shoeIdx]  ?? FB_SHOES[0],
        this._weapons[weaponIdx] ?? FB_WEAPONS[0],
      ]) { try { await this._preview.attachEquip(id, 0); } catch (_) {} }
    } catch (_) {}
  },

  // ── Name / create ────────────────────────────────────────────────────────────

  _checkName() {
    const name = this.nameInput?.input.value?.trim() ?? '';
    if (name.length < 4)               { this._nameError = 'Min 4 chars.';          return; }
    if (!/^[a-zA-Z0-9]+$/.test(name))  { this._nameError = 'Letters/numbers only.'; return; }
    this._st.name   = name;
    this._nameError = '';
    if (SessionManager.isConnected()) {
      this._step = 'waiting';
      this._applyStep();
      new CheckCharNamePacket(name).dispatch();
    } else {
      // Offline: skip name check, go straight to look step
      this._step = 'look';
      this._applyStep();
    }
  },

  _dispatchCreate() {
    const { gender:g, faceIdx, hairIdx, colorIdx, skinIdx,
            topIdx, botIdx, shoeIdx, weaponIdx, name } = this._st;
    new CreateCharPacket(
      name,
      (g===0 ? this._facesM : this._facesF)[faceIdx] ?? FB_FACES_M[0],
      this._hairs[g][hairIdx]   ?? FB_HAIRS_M[0],
      this._colors[colorIdx]    ?? 0,
      this._skins[skinIdx]      ?? 0,
      this._tops[topIdx]        ?? FB_TOPS[0],
      this._bots[botIdx]        ?? FB_BOTTOMS[0],
      this._shoes[shoeIdx]      ?? FB_SHOES[0],
      this._weapons[weaponIdx]  ?? FB_WEAPONS[0],
      g,
    ).dispatch();
    this.hide();
  },

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  show(canvas: GameCanvas) {
    if (!this.initialized) {
      this.initialize(canvas).then(() => {
        this._reset();
        this.isHidden = false;
        this._applyStep();
      });
      return;
    }
    this._reset();
    this.isHidden = false;
    this._applyStep();
    if (this.nameInput) this.nameInput.input.value = '';
  },

  _reset() {
    Object.assign(this._st, { gender:0, faceIdx:0, hairIdx:0, colorIdx:0, skinIdx:0,
                               topIdx:0, botIdx:0, shoeIdx:0, weaponIdx:0, name:'' });
    this._rollStats();
    this._step       = 'name';
    this._nameError  = '';
    this._previewDirty = true;
  },

  _applyStep() {
    const inName = this._step === 'name' || this._step === 'waiting';
    const inLook = this._step === 'look';
    this._btnsName.forEach(b => { b.isHidden = !inName; });
    this._btnsLook.forEach(b => { b.isHidden = !inLook; });
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach(b => { b.isHidden = true; });
    this.nameInput?.remove?.();
    this.nameInput = null;
  },

  // ── Draw ─────────────────────────────────────────────────────────────────────

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    // Background at natural size, shifted up to show foothold platform
    for (const bg of this._bg)
      try { canvas.context.drawImage(bg, 0, BG_Y); } catch (_) {}

    if (this._step === 'name' || this._step === 'waiting') {
      this._drawNamePanel(canvas);
    } else {
      this._drawRightPanel(canvas);
    }
    if (this._preview && this._previewDirty) {
      this._previewDirty = false;
      this._refreshPreview();
    }
    if (this._preview) {
      try {
        (this._preview as any).pos = { x: PREVIEW_X, y: PREVIEW_Y };
        this._preview.draw(canvas, { x:0, y:0 } as any, 0, 100, 0);
      } catch (_) {}
    }

    this.buttons.forEach(b => b.draw(canvas, { x:0, y:0 } as any, 0, 0, 0));
  },

  _drawScrollPanel(canvas: GameCanvas) {
    // Draw parchment scroll background (natural size)
    if (this._scrollImg) {
      try { canvas.context.drawImage(this._scrollImg, SCROLL_X, SCROLL_Y); } catch (_) {}
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(240,225,190,0.92)';
      canvas.context.fillRect(SCROLL_X, SCROLL_Y, 228, 9 * ROW_DY + 20);
      canvas.context.restore();
    }

    // avatarSel bars have the category label baked in — only overlay the current value
    const { gender:g } = this._st;
    const faces = g===0 ? this._facesM : this._facesF;
    const vals = [
      faces[this._st.faceIdx]           ?? '-',
      this._hairs[g][this._st.hairIdx]  ?? '-',
      this._colors[this._st.colorIdx]   ?? '-',
      this._skins[this._st.skinIdx]     ?? '-',
      this._tops[this._st.topIdx]       ?? '-',
      this._bots[this._st.botIdx]       ?? '-',
      this._shoes[this._st.shoeIdx]     ?? '-',
      this._weapons[this._st.weaponIdx] ?? '-',
      g === 0 ? 'Male' : 'Female',
    ];

    for (let i = 0; i < 9; i++) {
      const ry = ROW_Y0 + i * ROW_DY;
      const bar = this._avatarSel[i];
      if (bar) {
        try { canvas.context.drawImage(bar, BAR_X, ry - Math.floor(BAR_H / 2)); } catch (_) {}
      }
      canvas.drawText({ text: `${vals[i]}`, color: '#2a1000', x: VAL_X, y: ry + 4, fontSize: 8 });
    }
  },

  _drawRightPanel(canvas: GameCanvas) {
    // charName board (name input area)
    if (this._charNameImg) {
      try { canvas.context.drawImage(this._charNameImg, RIGHT_X, CHARNAME_Y); } catch (_) {}
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(80,48,16,0.92)';
      canvas.context.fillRect(RIGHT_X, CHARNAME_Y, 168, 60);
      canvas.context.restore();
      canvas.drawText({ text: 'NAME OF CHARACTER', color: '#f0d080', x: RIGHT_X + 6, y: CHARNAME_Y + 12, fontSize: 8 });
    }

    if (this._nameError) {
      canvas.drawText({ text: this._nameError, color: '#FF6666', x: RIGHT_X + 6, y: NAME_IN_Y + 24, fontSize: 8 });
    } else if (this._step === 'waiting') {
      canvas.drawText({ text: 'Checking...', color: '#88aaff', x: RIGHT_X + 6, y: NAME_IN_Y + 24, fontSize: 8 });
    }

    // charSet board (stats area)
    if (this._charSetImg) {
      try { canvas.context.drawImage(this._charSetImg, RIGHT_X, CHARSET_Y); } catch (_) {}
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(80,48,16,0.92)';
      canvas.context.fillRect(RIGHT_X, CHARSET_Y, 168, 4 * STAT_DY + 20);
      canvas.context.restore();
    }

    // Stats values overlaid on charSet board
    const statLabels = ['STR', 'DEX', 'INT', 'LUK'];
    const statVals   = [this._stats.str, this._stats.dex, this._stats.int, this._stats.luk];
    statLabels.forEach((s, i) => {
      const sy = STAT_Y0 + i * STAT_DY;
      canvas.drawText({ text: s,               color: '#f0d080', x: RIGHT_X + 8,  y: sy, fontSize: 9 });
      canvas.drawText({ text: `${statVals[i]}`, color: '#ffffff', x: RIGHT_X + 44, y: sy, fontSize: 9 });
    });
  },

  // Step 1: charName board only — no scroll, no charset
  _drawNamePanel(canvas: GameCanvas) {
    if (this._charNameImg) {
      try { canvas.context.drawImage(this._charNameImg, RIGHT_X, CHARNAME_Y); } catch (_) {}
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(80,48,16,0.92)';
      canvas.context.fillRect(RIGHT_X, CHARNAME_Y, 168, 60);
      canvas.context.restore();
      canvas.drawText({ text: 'NAME OF CHARACTER', color: '#f0d080', x: RIGHT_X + 6, y: CHARNAME_Y + 12, fontSize: 8 });
    }

    if (this._nameError) {
      canvas.drawText({ text: this._nameError, color: '#FF6666', x: RIGHT_X + 6, y: NAME_IN_Y + 24, fontSize: 8 });
    } else if (this._step === 'waiting') {
      canvas.drawText({ text: 'Checking...', color: '#88aaff', x: RIGHT_X + 6, y: NAME_IN_Y + 24, fontSize: 8 });
    }
  },
};

export default UIExplorerCreation;
