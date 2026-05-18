import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';

const STYLES = ['3', '4', '5', '6'];

const NameTagRenderer = {
  parts: {} as Record<string, { l: any; m: any; r: any; lw: number; mw: number; rw: number; h: number }>,
  _widthCache: new Map<string, number>(),
  initialized: false,

  async initialize() {
    const node = await NXManager.get('UI.wz/NameTag.img');
    if (!node) return;
    for (const style of STYLES) {
      const sec = node.nGet(style);
      if (!sec) continue;
      const l = sec.nGet('0')?.nGetImage?.();
      const m = sec.nGet('1')?.nGetImage?.();
      const r = sec.nGet('2')?.nGetImage?.();
      if (l && m && r) {
        this.parts[style] = { l, m, r, lw: l.width, mw: m.width, rw: r.width, h: l.height };
      }
    }
    this.initialized = true;
  },

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    worldX: number,
    worldY: number,
    name: string,
    styleKey = '3',
  ) {
    if (!this.initialized) return;
    const p = this.parts[styleKey] ?? this.parts[STYLES[0]];
    const cx = worldX - camera.x;
    const cy = worldY - camera.y;

    if (!p) {
      canvas.drawText({ text: name, x: cx + 1, y: cy + 1, color: '#000000', fontSize: 11, align: 'center' });
      canvas.drawText({ text: name, x: cx, y: cy, color: '#ffffff', fontSize: 11, align: 'center' });
      return;
    }

    let textW = this._widthCache.get(name);
    if (textW === undefined) {
      textW = canvas.measureText({ text: name, fontSize: 11 }).width;
      this._widthCache.set(name, textW);
    }
    const totalW = p.lw + textW + p.rw;
    const bx = cx - totalW / 2;

    canvas.drawImage({ img: p.l, dx: bx, dy: cy, dw: p.lw, dh: p.h });
    canvas.drawImage({ img: p.m, dx: bx + p.lw, dy: cy, dw: textW, dh: p.h });
    canvas.drawImage({ img: p.r, dx: bx + p.lw + textW, dy: cy, dw: p.rw, dh: p.h });

    canvas.drawText({ text: name, x: cx + 1, y: cy + p.h - 3 + 1, color: '#000000', fontSize: 11, align: 'center' });
    canvas.drawText({ text: name, x: cx,     y: cy + p.h - 3,     color: '#ffffff', fontSize: 11, align: 'center' });
  },
};

export default NameTagRenderer;
