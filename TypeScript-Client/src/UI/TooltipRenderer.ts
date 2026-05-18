import NXManager from '../wz-utils/NXManager';
import { getItemNameSync } from '../wz-utils/ItemNameLoader';
import GameCanvas from '../GameCanvas';

interface TooltipLine {
  text: string;
  color: string;
}

const TooltipRenderer = {
  bgImg: null as any,
  initialized: false,
  pending: null as { lines: TooltipLine[]; x: number; y: number } | null,

  async initialize() {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    // ToolTip section has background pieces
    const tt = uiWin?.nGet('ToolTip');
    this.bgImg = tt?.nGetImage?.() ?? null;
    this.initialized = true;
  },

  // Call this during update/render to set what to show this frame
  show(lines: TooltipLine[], mouseX: number, mouseY: number) {
    this.pending = { lines, x: mouseX, y: mouseY };
  },

  drawItemTooltip(canvas: GameCanvas, itemId: number, _itemName: string, mouseX: number, mouseY: number) {
    const name = getItemNameSync(itemId);
    const lines: TooltipLine[] = [
      { text: name, color: '#FFFFFF' },
      { text: `ID: ${itemId}`, color: '#666688' },
    ];
    this.show(lines, mouseX, mouseY);
  },

  drawSkillTooltip(canvas: GameCanvas, skillId: number, skillName: string, level: number, mouseX: number, mouseY: number) {
    const lines: TooltipLine[] = [
      { text: skillName, color: '#FFDD88' },
      { text: `Level: ${level}`, color: '#AADDFF' },
      { text: `Skill ID: ${skillId}`, color: '#666688' },
    ];
    this.show(lines, mouseX, mouseY);
  },

  draw(canvas: GameCanvas) {
    if (!this.pending) return;
    const { lines, x, y } = this.pending;
    this.pending = null;

    if (!lines.length) return;

    const pad = 8;
    const lineH = 16;
    const maxW = Math.max(...lines.map((l) => {
      return canvas.measureText({ text: l.text, fontSize: 11 }).width;
    }));
    const w = maxW + pad * 2;
    const h = lines.length * lineH + pad * 2;

    // Position tooltip so it doesn't go off-screen
    const tx = Math.min(x + 12, canvas.context.canvas.width - w - 4);
    const ty = Math.max(y - h - 4, 4);

    canvas.drawRect({ x: tx, y: ty, width: w, height: h, color: '#0A0A1E', alpha: 0.95, strokeColor: '#557799', strokeWidth: 1 });

    lines.forEach((line, i) => {
      canvas.drawText({ text: line.text, x: tx + pad, y: ty + pad + (i + 1) * lineH - 4, color: line.color, fontSize: 11, fontWeight: i === 0 ? 'bold' : 'normal' });
    });
  },
};

export default TooltipRenderer;
