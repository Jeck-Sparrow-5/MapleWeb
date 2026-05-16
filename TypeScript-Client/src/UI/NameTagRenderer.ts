import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';

// NameTag.img has sections 3,4,5,6 — each is L/M/R for a name box style
// style 0 = normal player, style 1 = party, style 2 = monster
const STYLES = ['3', '4', '5', '6'];

const NameTagRenderer = {
  parts: {} as Record<string, { l: any; m: any; r: any; lw: number; mw: number; rw: number; h: number }>,
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
        this.parts[style] = {
          l, m, r,
          lw: l.width, mw: m.width, rw: r.width, h: l.height,
        };
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
    if (!p) {
      // Fallback: plain text
      canvas.context.save();
      canvas.context.font = '11px Arial';
      canvas.context.fillStyle = '#000000';
      canvas.context.textAlign = 'center';
      const cx = worldX - camera.x;
      const cy = worldY - camera.y;
      canvas.context.fillText(name, cx + 1, cy + 1);
      canvas.context.fillStyle = '#FFFFFF';
      canvas.context.fillText(name, cx, cy);
      canvas.context.textAlign = 'left';
      canvas.context.restore();
      return;
    }

    canvas.context.save();
    canvas.context.font = '11px Arial';
    const textW = canvas.context.measureText(name).width;
    const totalW = p.lw + textW + p.rw;
    const cx = worldX - camera.x - totalW / 2;
    const cy = worldY - camera.y;

    // Stretch middle to fit text
    if (p.l) canvas.context.drawImage(p.l, cx, cy, p.lw, p.h);
    if (p.m) canvas.context.drawImage(p.m, cx + p.lw, cy, textW, p.h);
    if (p.r) canvas.context.drawImage(p.r, cx + p.lw + textW, cy, p.rw, p.h);

    canvas.context.fillStyle = '#000000';
    canvas.context.textAlign = 'center';
    canvas.context.fillText(name, worldX - camera.x + 1, cy + p.h - 3 + 1);
    canvas.context.fillStyle = '#FFFFFF';
    canvas.context.fillText(name, worldX - camera.x, cy + p.h - 3);
    canvas.context.textAlign = 'left';
    canvas.context.restore();
  },
};

export default NameTagRenderer;
