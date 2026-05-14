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

// Fallbacks
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

const RACES = [
  { key: 'normal', label: 'Explorer',      btnKey: 'BtNormal', available: true  },
  { key: 'knight', label: 'Cygnus Knight', btnKey: 'BtKnight', available: false },
  { key: 'aran',   label: 'Aran',          btnKey: 'BtAran',   available: false },
] as const;

// Flow: race → gender → style (appearance + name) → waiting → create
type Step = 'race' | 'gender' | 'style' | 'waiting';

interface St {
  race: number; gender: number;
  faceIdx: number; hairIdx: number; colorIdx: number; skinIdx: number;
  topIdx: number; botIdx: number; shoeIdx: number; weaponIdx: number;
  name: string;
}

// Called by CharNameResponseHandler
export function onNameCheckResult(available: boolean) {
  if (!available) {
    UIRaceSelect._step      = 'style';
    UIRaceSelect._nameError = 'Name already taken.';
    return;
  }
  UIRaceSelect._dispatchCreate();
}

const UIRaceSelect = {
  isHidden: true,
  initialized: false,
  buttons:   [] as MapleStanceButton[],
  nameInput: null as MapleInput | null,

  _step:      'race' as Step,
  _nameError: '',

  // WZ images
  _textGL:    null as any,   // RaceSelect/textGL  182×39
  _raceBtns:  [] as any[],   // BtClass/normal
  _raceHover: [] as any[],   // BtClass/mouseOver
  _raceText:  [] as any[],   // [race]/text  579×163
  _bgGender:  null as any,   // Gender/backgrnd  362×219
  _scrollTop: null as any,   // NewChar/scroll/0[0]  242×30
  _scrollBod: null as any,   // NewChar/scroll/0[1]  242×214
  _scrollBot: null as any,   // NewChar/scroll/1[last]
  _avatarSel: [] as any[],   // NewChar/avatarSel/0-7  200×17

  // Appearance data
  _faces:   [FB_FACES_M.slice(), FB_FACES_F.slice()] as number[][],
  _hairs:   [FB_HAIRS_M.slice(), FB_HAIRS_F.slice()] as number[][],
  _colors:  FB_COLORS.slice(), _skins:  FB_SKINS.slice(),
  _tops:    FB_TOPS.slice(),   _bots:   FB_BOTTOMS.slice(),
  _shoes:   FB_SHOES.slice(),  _weapons: FB_WEAPONS.slice(),

  _preview: null as MapleCharacter | null,
  _previewDirty: false,

  _st: {
    race:0, gender:0, faceIdx:0, hairIdx:0, colorIdx:0, skinIdx:0,
    topIdx:0, botIdx:0, shoeIdx:0, weaponIdx:0, name:'',
  } as St,

  // Button groups — hidden/shown per step
  _btnsRace:   [] as MapleStanceButton[],
  _btnsGender: [] as MapleStanceButton[],
  _btnsStyle:  [] as MapleStanceButton[],
  _btnsAlways: [] as MapleStanceButton[], // close btn

  async initialize(canvas: GameCanvas) {
    await this._loadWZ();
    await this._buildButtons(canvas);
    await this._buildPreview();
    this.initialized = true;
  },

  async _loadWZ() {
    const login = await WZManager.get('UI.wz/Login.img');
    const rs    = login?.nGet?.('RaceSelect');

    this._textGL    = rs?.nGet?.('textGL')?.nGetImage?.() ?? null;
    this._raceBtns  = [];
    this._raceHover = [];
    this._raceText  = [];

    for (const r of RACES) {
      const rn = rs?.nGet?.(r.key);
      this._raceBtns.push( rn?.nGet?.(r.btnKey)?.nGet?.('normal')?.nGetImage?.()    ?? null);
      this._raceHover.push(rn?.nGet?.(r.btnKey)?.nGet?.('mouseOver')?.nGetImage?.() ?? null);
      this._raceText.push( rn?.nGet?.('text')?.nGetImage?.()                        ?? null);
    }

    this._bgGender = login?.nGet?.('Gender')?.nGet?.('backgrnd')?.nGetImage?.() ?? null;

    const nc = login?.nGet?.('NewChar');
    const s0 = nc?.nGet?.('scroll')?.nGet?.('0');
    if (s0?.nChildren?.length) {
      this._scrollTop = s0.nChildren[0]?.nGetImage?.() ?? null;
      this._scrollBod = s0.nChildren[1]?.nGetImage?.() ?? null;
    }
    const s1 = nc?.nGet?.('scroll')?.nGet?.('1');
    if (s1?.nChildren?.length)
      this._scrollBot = s1.nChildren[s1.nChildren.length - 1]?.nGetImage?.() ?? null;

    const avSel = nc?.nGet?.('avatarSel');
    if (avSel?.nChildren)
      this._avatarSel = avSel.nChildren.map((c: any) => c.nGetImage?.() ?? null);

    // Appearance data from Etc.wz/MakeCharInfo.img
    try {
      const info = await WZManager.get('Etc.wz/MakeCharInfo.img');
      const list = (n: any): number[] =>
        n?.nChildren?.map((c: any) => parseInt(c.nValue ?? c.nName ?? '0')).filter(Boolean) ?? [];
      for (const g of [0, 1]) {
        const gn = info?.nGet?.('CharSet')?.nGet?.(`${g}`);
        const f = list(gn?.nGet?.('face')); if (f.length) this._faces[g] = f;
        const h = list(gn?.nGet?.('hair')); if (h.length) this._hairs[g] = h;
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

  async _buildPreview() {
    try {
      this._preview = new MapleCharacter({
        name:'', hp:50, maxHp:50, mp:5, maxMp:5,
        Hair: this._hairs[0][0] ?? FB_HAIRS_M[0], exp:0, fame:0,
        inventory: new Inventory({}),
        stats: new Stats({ str:4, dex:4, int:4, luk:4, abilityPoints:0,
          maxHp:50, maxMp:5, jobType: JobsMainType.Begginer, job:'Beginner', level:1 }),
      });
      this._preview.skinColor = 0;
      this._preview.face      = this._faces[0][0] ?? FB_FACES_M[0];
      await this._preview.load();
    } catch (_) {}
  },

  async _refreshPreview() {
    if (!this._preview) return;
    const { gender:g, faceIdx, hairIdx, skinIdx, topIdx, botIdx, shoeIdx, weaponIdx } = this._st;
    try {
      const skin = this._skins[skinIdx] ?? 0;
      const face = this._faces[g][faceIdx] ?? FB_FACES_M[0];
      if (this._preview.skinColor !== skin) await this._preview.setSkinColor(skin);
      if (this._preview.face      !== face) await this._preview.setFace(face);
      this._preview.equips = [];
      for (const id of [
        this._tops[topIdx] ?? FB_TOPS[0], this._bots[botIdx] ?? FB_BOTTOMS[0],
        this._shoes[shoeIdx] ?? FB_SHOES[0], this._weapons[weaponIdx] ?? FB_WEAPONS[0],
      ]) { try { await this._preview.attachEquip(id, 0); } catch (_) {} }
    } catch (_) {}
  },

  async _buildButtons(canvas: GameCanvas) {
    this.buttons.forEach(b => ClickManager.removeButton(b));
    this.buttons  = [];
    this._btnsRace   = [];
    this._btnsGender = [];
    this._btnsStyle  = [];
    this._btnsAlways = [];

    const login = await WZManager.get('UI.wz/Login.img');
    const rs    = login?.nGet?.('RaceSelect');
    const nc    = login?.nGet?.('NewChar');
    const gen   = login?.nGet?.('Gender');
    const win   = await WZManager.get('UI.wz/UIWindow.img');

    const ncImg  = (k: string) => nc?.nGet?.(k)?.nChildren  ?? null;
    const genImg = (k: string) => gen?.nGet?.(k)?.nChildren  ?? null;
    const winImg = (k: string) => win?.nGet?.(k)?.nChildren  ?? null;

    const addBtn = (
      group: MapleStanceButton[],
      img: any, x: number, y: number,
      cb: () => void,
    ) => {
      if (!img) return;
      const b = new MapleStanceButton(canvas, {
        x, y, img, isRelativeToCamera:true, isPartOfUI:true, isHidden:true, onClick:cb,
      });
      ClickManager.addButton(b);
      this.buttons.push(b);
      group.push(b);
    };

    // ── RACE step ────────────────────────────────────────────────
    // BtSelect (73×29) confirm race
    addBtn(this._btnsRace,
      rs?.nGet?.('BtSelect')?.nChildren ?? winImg('BtOK'),
      363, 545,
      async () => {
        if (!RACES[this._st.race].available) return;
        await this._toStep('gender', canvas);
      });

    // ── GENDER step ──────────────────────────────────────────────
    // BtYes=Male (514,394)  BtNo=Female (590,394)
    addBtn(this._btnsGender, genImg('BtYes') ?? winImg('BtOK'), 514, 394,
      async () => { this._st.gender = 0; await this._toStep('style', canvas); });
    addBtn(this._btnsGender, genImg('BtNo')  ?? winImg('BtNo'), 590, 394,
      async () => { this._st.gender = 1; await this._toStep('style', canvas); });

    // ── STYLE step — appearance arrows + name check ──────────────
    const arL = ncImg('BtLeft')  ?? winImg('BtLeft');
    const arR = ncImg('BtRight') ?? winImg('BtRight');
    const st  = this._st;
    const wrap = (arr: number[], i: number, d: number) => (i + d + arr.length) % arr.length;

    // 8 attribute rows at base y=150, +18px per row (arrows 15×16)
    const attrRows: [() => number[], () => number, (v:number)=>void][] = [
      [() => this._skins,            () => st.skinIdx,   v => { st.skinIdx   = v; }],
      [() => this._faces[st.gender], () => st.faceIdx,   v => { st.faceIdx   = v; }],
      [() => this._hairs[st.gender], () => st.hairIdx,   v => { st.hairIdx   = v; }],
      [() => this._colors,           () => st.colorIdx,  v => { st.colorIdx  = v; }],
      [() => this._tops,             () => st.topIdx,    v => { st.topIdx    = v; }],
      [() => this._bots,             () => st.botIdx,    v => { st.botIdx    = v; }],
      [() => this._shoes,            () => st.shoeIdx,   v => { st.shoeIdx   = v; }],
      [() => this._weapons,          () => st.weaponIdx, v => { st.weaponIdx = v; }],
    ];

    attrRows.forEach(([getArr, getIdx, setIdx], i) => {
      const y = 198 + i * 18;
      addBtn(this._btnsStyle, arL, 552, y,
        async () => { setIdx(wrap(getArr(), getIdx(), -1)); this._previewDirty = true; });
      addBtn(this._btnsStyle, arR, 684, y,
        async () => { setIdx(wrap(getArr(), getIdx(),  1)); this._previewDirty = true; });
    });

    // BtCheck (50×24) — name availability check, beside name input
    addBtn(this._btnsStyle, ncImg('BtCheck') ?? winImg('BtOK'), 668, 416,
      async () => { this._checkName(); });

    // BtYes (81×41) — create char (also triggers name check if not yet checked)
    addBtn(this._btnsStyle, ncImg('BtYes') ?? winImg('BtOK'), 523, 444,
      async () => { this._checkName(); });

    // BtNo (81×41) — back to gender
    addBtn(this._btnsStyle, ncImg('BtNo') ?? winImg('BtNo'), 614, 444,
      async () => { await this._toStep('gender', canvas); });

    // ── ALWAYS ── close button
    addBtn(this._btnsAlways, winImg('BtUIClose'), 790, 4, () => this.hide());
  },

  async _toStep(step: Step, canvas?: GameCanvas) {
    this._step      = step;
    this._nameError = '';

    if (step === 'style') {
      this._previewDirty = true;
      // Name input inside the right panel at y=414 (just above BtCheck)
      this.nameInput?.remove?.();
      const c = canvas ?? document.getElementById('game') as any;
      this.nameInput = new MapleInput(c, { x:556, y:414, width:108, height:20, color:'#000000' });
    } else {
      this.nameInput?.remove?.();
      this.nameInput = null;
    }

    // Show only the relevant button group
    this._btnsRace.forEach(b   => { b.isHidden = step !== 'race'; });
    this._btnsGender.forEach(b => { b.isHidden = step !== 'gender'; });
    this._btnsStyle.forEach(b  => { b.isHidden = step !== 'style' && step !== 'waiting'; });
    this._btnsAlways.forEach(b => { b.isHidden = this.isHidden; });
  },

  _checkName() {
    const name = this.nameInput?.input.value?.trim() ?? '';
    if (name.length < 4)               { this._nameError = 'Min 4 chars.'; return; }
    if (!/^[a-zA-Z0-9]+$/.test(name))  { this._nameError = 'Letters/numbers only.'; return; }
    this._st.name   = name;
    this._nameError = '';
    this._step      = 'waiting';
    if (SessionManager.isConnected()) {
      new CheckCharNamePacket(name).dispatch();
    } else {
      this._dispatchCreate();
    }
  },

  _dispatchCreate() {
    const { gender:g, faceIdx, hairIdx, colorIdx, skinIdx,
            topIdx, botIdx, shoeIdx, weaponIdx, name } = this._st;
    new CreateCharPacket(
      name,
      this._faces[g][faceIdx]  ?? FB_FACES_M[0],
      this._hairs[g][hairIdx]  ?? FB_HAIRS_M[0],
      this._colors[colorIdx]   ?? 0,
      this._skins[skinIdx]     ?? 0,
      this._tops[topIdx]       ?? FB_TOPS[0],
      this._bots[botIdx]       ?? FB_BOTTOMS[0],
      this._shoes[shoeIdx]     ?? FB_SHOES[0],
      this._weapons[weaponIdx] ?? FB_WEAPONS[0],
      g,
    ).dispatch();
    this.hide();
  },

  show(canvas: GameCanvas) {
    if (!this.initialized) {
      this.initialize(canvas).then(() => {
        this.isHidden = false;
        this._toStep('race', canvas);
      });
      return;
    }
    this.isHidden = false;
    this._toStep('race', canvas);
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach(b => { b.isHidden = true; });
    this.nameInput?.remove?.();
    this.nameInput = null;
  },

  // Race card click — routes from UILogin.doUpdate
  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden || this._step !== 'race') return false;
    const pos = this._getRacePositions();
    for (let i = 0; i < RACES.length; i++) {
      const { x, y, w, h } = pos[i];
      if (mx >= x && mx < x + w && my >= y && my < y + h) {
        if (RACES[i].available) this._st.race = i;
        return true;
      }
    }
    return false;
  },

  _getRacePositions(): { x:number; y:number; w:number; h:number }[] {
    const dims = [{ w:223, h:221 }, { w:209, h:219 }, { w:181, h:222 }];
    const total = dims.reduce((s, d) => s + d.w, 0) + 40;
    let cx = Math.floor((800 - total) / 2);
    return dims.map(d => { const p = { x:cx, y:120, w:d.w, h:d.h }; cx += d.w + 20; return p; });
  },

  _drawScrollPanel(canvas: GameCanvas, x: number, y: number) {
    const W = 242;
    let cy = y;
    const drawOrFill = (img: any, h: number, color: string) => {
      if (img) { try { canvas.context.drawImage(img, x, cy, W, h); } catch (_) {} }
      else { canvas.context.save(); canvas.context.fillStyle=color; canvas.context.fillRect(x,cy,W,h); canvas.context.restore(); }
      cy += h;
    };
    drawOrFill(this._scrollTop, 30,                              'rgba(10,16,40,0.92)');
    const bh = this._scrollBod?.height ?? 214;
    for (let i = 0; i < 2; i++)
      drawOrFill(this._scrollBod, bh,                           'rgba(14,20,50,0.88)');
    drawOrFill(this._scrollBot, 30,                              'rgba(10,16,40,0.92)');
  },

  async _drawPreview(canvas: GameCanvas) {
    if (!this._preview) return;
    if (this._previewDirty) { this._previewDirty = false; await this._refreshPreview(); }
    try {
      if (!this._preview.pos) (this._preview as any).pos = { x:200, y:400 };
      this._preview.pos.x = 200; this._preview.pos.y = 400;
      this._preview.draw(canvas, { x:0, y:0 } as any, 0, 100, 0);
    } catch (_) {}
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(0,0,0,0.88)';
    canvas.context.fillRect(0, 0, 800, 600);
    canvas.context.restore();

    switch (this._step) {
      case 'race':    return this._drawRace(canvas);
      case 'gender':  return this._drawGender(canvas);
      case 'style':
      case 'waiting': this._drawStyle(canvas); this._drawPreview(canvas); break;
    }
    this.buttons.forEach(b => b.draw(canvas, { x:0, y:0 } as any, 0, 0, 0));
  },

  _drawRace(canvas: GameCanvas) {
    // textGL title centered at top
    if (this._textGL) {
      try { canvas.context.drawImage(this._textGL, Math.floor((800-182)/2), 60, 182, 39); } catch (_) {}
    } else {
      canvas.drawText({ text:'Select Race', color:'#FFDD88', x:340, y:85, fontSize:16 });
    }

    const pos = this._getRacePositions();
    RACES.forEach((race, i) => {
      const { x, y, w, h } = pos[i];
      const img      = this._raceBtns[i];
      const hoverImg = this._raceHover[i];
      const sel = this._st.race === i;

      canvas.context.save();
      if (!race.available) canvas.context.globalAlpha = 0.35;
      const di = sel && hoverImg ? hoverImg : img;
      if (di) {
        try { canvas.context.drawImage(di, x, y, w, h); } catch (_) {}
      } else {
        canvas.context.fillStyle = race.available
          ? (sel ? 'rgba(80,110,180,0.9)' : 'rgba(40,55,100,0.8)')
          : 'rgba(30,30,40,0.6)';
        canvas.context.fillRect(x, y, w, h);
      }
      canvas.context.globalAlpha = 1;

      if (!race.available) {
        canvas.context.fillStyle = 'rgba(0,0,0,0.55)';
        canvas.context.fillRect(x, y, w, h);
        canvas.context.font = '10px Arial';
        canvas.context.fillStyle = '#888888';
        canvas.context.textAlign = 'center';
        canvas.context.fillText('Unavailable', x + w/2, y + h/2);
        canvas.context.textAlign = 'left';
      }

      if (sel && race.available) {
        canvas.context.strokeStyle = '#FFDD44';
        canvas.context.lineWidth   = 3;
        canvas.context.strokeRect(x-1, y-1, w+2, h+2);
        canvas.context.lineWidth   = 1;
      }
      canvas.context.restore();

      canvas.drawText({
        text: race.label,
        color: race.available ? (sel ? '#FFDD88' : '#CCCCCC') : '#555555',
        x: x + w/2 - 30, y: y + h + 14, fontSize: 11,
      });
    });

    // Class description (579×163) centered, y=360
    const selText = this._raceText[this._st.race];
    if (selText && RACES[this._st.race].available) {
      const dx = Math.floor((800 - 579) / 2);
      try { canvas.context.drawImage(selText, dx, 358, 579, 163); } catch (_) {}
    }

    this.buttons.forEach(b => b.draw(canvas, { x:0, y:0 } as any, 0, 0, 0));
  },

  _drawGender(canvas: GameCanvas) {
    const bgX = Math.floor((800-362)/2); const bgY = Math.floor((600-219)/2);
    if (this._bgGender) {
      try { canvas.context.drawImage(this._bgGender, bgX, bgY, 362, 219); } catch (_) {}
    } else {
      canvas.context.save();
      canvas.context.fillStyle='rgba(20,28,60,0.97)'; canvas.context.strokeStyle='#556688';
      canvas.context.fillRect(bgX,bgY,362,219); canvas.context.strokeRect(bgX,bgY,362,219);
      canvas.context.restore();
    }
    canvas.drawText({ text:'Select Gender', color:'#FFDD88', x:340, y:bgY+28, fontSize:13 });
    canvas.drawText({ text:'♂  Male',   color:'#88CCFF',  x:500, y:388, fontSize:11 });
    canvas.drawText({ text:'♀  Female', color:'#FFAACC',  x:576, y:388, fontSize:11 });
    this.buttons.forEach(b => b.draw(canvas, { x:0, y:0 } as any, 0, 0, 0));
  },

  _drawStyle(canvas: GameCanvas) {
    // Right panel (scroll) at x=530
    this._drawScrollPanel(canvas, 530, 60);

    // 8 attribute rows: avatarSel bars + labels + current value
    const labels = ['Skin','Face','Hair','Color','Top','Bottom','Shoes','Weapon'];
    const vals = [
      this._skins[this._st.skinIdx],
      this._faces[this._st.gender][this._st.faceIdx],
      this._hairs[this._st.gender][this._st.hairIdx],
      this._colors[this._st.colorIdx],
      this._tops[this._st.topIdx],
      this._bots[this._st.botIdx],
      this._shoes[this._st.shoeIdx],
      this._weapons[this._st.weaponIdx],
    ];

    labels.forEach((label, i) => {
      const y   = 198 + i * 18;
      const bar = this._avatarSel[i] ?? null;
      if (bar) {
        try { canvas.context.drawImage(bar, 552, y-9, 200, 17); } catch (_) {}
      } else {
        canvas.context.save();
        canvas.context.fillStyle='rgba(30,40,80,0.8)'; canvas.context.fillRect(552,y-9,200,17);
        canvas.context.restore();
      }
      canvas.drawText({ text:label,           color:'#AAAACC', x:557, y:y+2, fontSize:8 });
      canvas.drawText({ text:`${vals[i]??'-'}`, color:'#FFFFFF', x:620, y:y+2, fontSize:8 });
    });

    // Name input area (just above BtCheck/BtYes)
    canvas.context.save();
    canvas.context.fillStyle='rgba(20,28,60,0.9)'; canvas.context.strokeStyle='#556688';
    canvas.context.fillRect(552, 400, 200, 30); canvas.context.strokeRect(552, 400, 200, 30);
    canvas.context.restore();
    canvas.drawText({ text:'Name:', color:'#AAAACC', x:556, y:397, fontSize:8 });

    if (this._nameError) {
      canvas.drawText({ text:this._nameError, color:'#FF6666', x:534, y:470, fontSize:9 });
    }
    if (this._step === 'waiting') {
      canvas.drawText({ text:'Checking...', color:'#AAAAFF', x:534, y:470, fontSize:9 });
    }

    canvas.drawText({ text:`Gender: ${this._st.gender===0?'Male':'Female'}`, color:'#AADDFF', x:534, y:488, fontSize:9 });
  },
};

export default UIRaceSelect;
