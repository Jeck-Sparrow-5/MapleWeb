import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import UIExplorerCreation from './UIExplorerCreation';

// Race definitions — v83 standard: only Explorer available
const RACES = [
  { key: 'normal',  label: 'Adventurer',    btnKey: 'BtNormal',  available: true },
  { key: 'knight',  label: 'Cygnus Knight', btnKey: 'BtKnight',  available: true },
  { key: 'aran',    label: 'Aran',          btnKey: 'BtAran',    available: true },
] as const;

// Dimensions from WZ: normal=223×221, knight=209×219, aran=181×222
const RACE_DIMS = [{ w:223, h:221 }, { w:209, h:219 }, { w:181, h:222 }];

// Same pattern as MapleStanceButton: if first child is a vector (origin),
// the node itself is the canvas; otherwise the first child IS the canvas.
function getImg(node: any): any {
  if (!node) return null;
  const first = node?.nChildren?.[0];
  if (!first) return node?.nGetImage?.() ?? null;
  return (first.nTagName === 'vector' ? first.nParent : first)?.nGetImage?.() ?? null;
}

interface RaceImgs { normal: any; mouseOver: any; disabled: any; }

const UIRaceSelect = {
  isHidden: true,
  initialized: false,
  buttons:  [] as MapleStanceButton[],

  _selected: 0,
  _hovered:  -1,

  _textGL:    null as any,
  _raceImgs:  [] as RaceImgs[],
  _raceText:  [] as any[],

  async initialize(canvas: GameCanvas) {
    const login = await WZManager.get('UI.wz/Login.img');
    const rs    = login?.nGet?.('RaceSelect');
    const win   = await WZManager.get('UI.wz/UIWindow.img');

    this._textGL   = getImg(rs?.nGet?.('textGL'));
    this._raceImgs = [];
    this._raceText = [];

    for (const r of RACES) {
      const rn  = rs?.nGet?.(r.key);
      const btn = rn?.nGet?.(r.btnKey);
      this._raceImgs.push({
        normal:    getImg(btn?.nGet?.('normal')),
        mouseOver: getImg(btn?.nGet?.('mouseOver')),
        disabled:  getImg(btn?.nGet?.('disabled')),
      });
      this._raceText.push(getImg(rn?.nGet?.('text')));
    }

    // BtSelect — confirm race
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
    UIExplorerCreation.show(canvas);
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

  onMouseMove(mx: number, my: number): void {
    if (this.isHidden) return;
    const pos = this._positions();
    this._hovered = -1;
    for (let i = 0; i < RACES.length; i++) {
      const { x, y, w, h } = pos[i];
      if (mx >= x && mx < x + w && my >= y && my < y + h) {
        this._hovered = i;
        break;
      }
    }
  },

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
    const total = RACE_DIMS.reduce((s, d) => s + d.w, 0) + 40;
    let cx = Math.floor((800 - total) / 2);
    return RACE_DIMS.map(d => {
      const p = { x: cx, y: 120, w: d.w, h: d.h };
      cx += d.w + 20;
      return p;
    });
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(0,0,0,0.88)';
    canvas.context.fillRect(0, 0, 800, 600);
    canvas.context.restore();

    if (this._textGL) {
      try { canvas.context.drawImage(this._textGL, Math.floor((800 - 182) / 2), 60, 182, 39); } catch (_) {}
    } else {
      canvas.drawText({ text: 'Select Race', color: '#FFDD88', x: 340, y: 85, fontSize: 16 });
    }

    const pos = this._positions();
    RACES.forEach((race, i) => {
      const { x, y, w, h } = pos[i];
      const imgs = this._raceImgs[i];
      if (!imgs) return;

      // Pick the right image based on state
      let img: any;
      if (!race.available) {
        img = imgs.disabled || imgs.normal;
      } else if (this._selected === i || this._hovered === i) {
        img = imgs.mouseOver || imgs.normal;
      } else {
        img = imgs.normal;
      }

      canvas.context.save();
      if (!race.available) {
        // Greyscale + dim for unavailable races (fallback if no disabled image)
        if (!imgs.disabled) canvas.context.filter = 'grayscale(80%) opacity(45%)';
      }
      if (img) {
        try { canvas.context.drawImage(img, x, y, w, h); } catch (_) {}
      } else {
        canvas.context.fillStyle = race.available ? 'rgba(40,55,100,0.8)' : 'rgba(30,30,40,0.6)';
        canvas.context.fillRect(x, y, w, h);
      }
      canvas.context.filter = 'none';
      canvas.context.restore();

      canvas.drawText({
        text: race.label,
        color: race.available ? (this._selected === i ? '#FFDD88' : '#CCCCCC') : '#555555',
        x: x + w / 2 - 35,
        y: y + h + 14,
        fontSize: 11,
      });
    });

    const textIdx = this._hovered >= 0 ? this._hovered : this._selected;
    const desc = this._raceText[textIdx];
    if (desc) {
      const dx = Math.floor((800 - 579) / 2);
      try { canvas.context.drawImage(desc, dx, 358, 579, 163); } catch (_) {}
    }

    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIRaceSelect;
