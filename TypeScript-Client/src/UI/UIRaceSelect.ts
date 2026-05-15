import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import UIExplorerCreation from './UIExplorerCreation';

// Race definitions — v83 standard: only Explorer available
const RACES = [
  { key: 'normal',  label: 'Adventurer',    btnKey: 'BtNormal',  available: true  },
  { key: 'knight',  label: 'Cygnus Knight', btnKey: 'BtKnight',  available: false },
  { key: 'aran',    label: 'Aran',          btnKey: 'BtAran',    available: false },
] as const;

// Dimensions from WZ: normal=223×221, knight=209×219, aran=181×222
const RACE_DIMS = [{ w:223, h:221 }, { w:209, h:219 }, { w:181, h:222 }];

const UIRaceSelect = {
  isHidden: true,
  initialized: false,
  buttons:  [] as MapleStanceButton[],

  _selected: 0,

  // WZ images
  _textGL:    null as any,   // RaceSelect/textGL  182×39
  _raceBtns:  [] as any[],   // BtClass/normal — full class image
  _raceHover: [] as any[],   // BtClass/mouseOver
  _raceText:  [] as any[],   // [race]/text  579×163 — description

  async initialize(canvas: GameCanvas) {
    const login = await WZManager.get('UI.wz/Login.img');
    const rs    = login?.nGet?.('RaceSelect');
    const win   = await WZManager.get('UI.wz/UIWindow.img');

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

    // BtSelect (73×29) — confirm race
    const btSel = rs?.nGet?.('BtSelect')?.nChildren ?? win?.nGet?.('BtOK')?.nChildren;
    if (btSel) {
      const btn = new MapleStanceButton(canvas, {
        x: 363, y: 545,
        img: btSel,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this._confirm(canvas),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Close
    const btClose = win?.nGet?.('BtUIClose')?.nChildren;
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: 790, y: 4,
        img: btClose,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.hide(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  _confirm(canvas: GameCanvas) {
    const race = RACES[this._selected];
    if (!race.available) return;
    this.hide();
    // Open class-specific creation UI
    if (race.key === 'normal') {
      UIExplorerCreation.show(canvas);
    }
    // UICygnusCreation / UIAranCreation — not implemented (unavailable on v83)
  },

  show(canvas: GameCanvas) {
    if (!this.initialized) {
      this.initialize(canvas).then(() => {
        this._selected = 0;
        this.isHidden  = false;
        this.buttons.forEach(b => { b.isHidden = false; });
      });
      return;
    }
    this._selected = 0;
    this.isHidden  = false;
    this.buttons.forEach(b => { b.isHidden = false; });
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach(b => { b.isHidden = true; });
  },

  // Called from UILogin.doUpdate on canvas.clicked
  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;
    const pos = this._positions();
    for (let i = 0; i < RACES.length; i++) {
      const { x, y, w, h } = pos[i];
      if (mx >= x && mx < x + w && my >= y && my < y + h) {
        if (RACES[i].available) this._selected = i;
        return true;
      }
    }
    return false;
  },

  _positions(): { x:number; y:number; w:number; h:number }[] {
    const total = RACE_DIMS.reduce((s, d) => s + d.w, 0) + 40; // 2×20 gaps
    let cx = Math.floor((800 - total) / 2);
    return RACE_DIMS.map(d => {
      const p = { x: cx, y: 120, w: d.w, h: d.h };
      cx += d.w + 20;
      return p;
    });
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    // Full-screen backdrop
    canvas.context.save();
    canvas.context.fillStyle = 'rgba(0,0,0,0.88)';
    canvas.context.fillRect(0, 0, 800, 600);
    canvas.context.restore();

    // textGL title (182×39) centered
    if (this._textGL) {
      try { canvas.context.drawImage(this._textGL, Math.floor((800 - 182) / 2), 60, 182, 39); } catch (_) {}
    } else {
      canvas.drawText({ text: 'Select Race', color: '#FFDD88', x: 340, y: 85, fontSize: 16 });
    }

    const pos = this._positions();
    RACES.forEach((race, i) => {
      const { x, y, w, h } = pos[i];
      const sel = this._selected === i;
      const img = (sel && this._raceHover[i]) ? this._raceHover[i] : this._raceBtns[i];

      canvas.context.save();
      if (!race.available) canvas.context.globalAlpha = 0.35;
      if (img) {
        try { canvas.context.drawImage(img, x, y, w, h); } catch (_) {}
      } else {
        canvas.context.fillStyle = race.available
          ? (sel ? 'rgba(80,110,180,0.9)' : 'rgba(40,55,100,0.8)')
          : 'rgba(30,30,40,0.6)';
        canvas.context.fillRect(x, y, w, h);
      }
      canvas.context.globalAlpha = 1;

      // Dark overlay + label for unavailable
      if (!race.available) {
        canvas.context.fillStyle = 'rgba(0,0,0,0.55)';
        canvas.context.fillRect(x, y, w, h);
        canvas.context.font = '10px Arial';
        canvas.context.fillStyle = '#666666';
        canvas.context.textAlign = 'center';
        canvas.context.fillText('Unavailable', x + w / 2, y + h / 2);
        canvas.context.textAlign = 'left';
      }

      // Gold border for selected available race
      if (sel && race.available) {
        canvas.context.strokeStyle = '#FFDD44';
        canvas.context.lineWidth   = 3;
        canvas.context.strokeRect(x - 1, y - 1, w + 2, h + 2);
        canvas.context.lineWidth   = 1;
      }
      canvas.context.restore();

      // Label below button
      canvas.drawText({
        text: race.label,
        color: race.available ? (sel ? '#FFDD88' : '#CCCCCC') : '#444444',
        x: x + w / 2 - 35,
        y: y + h + 14,
        fontSize: 11,
      });
    });

    // Description text (579×163) for selected race, centered
    const desc = this._raceText[this._selected];
    if (desc && RACES[this._selected].available) {
      const dx = Math.floor((800 - 579) / 2);
      try { canvas.context.drawImage(desc, dx, 358, 579, 163); } catch (_) {}
    }

    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIRaceSelect;
