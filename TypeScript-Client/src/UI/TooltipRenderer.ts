import WZManager from '../wz-utils/WZManager';
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
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
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
      canvas.context.font = '11px Arial';
      return canvas.context.measureText(l.text).width;
    }));
    const w = maxW + pad * 2;
    const h = lines.length * lineH + pad * 2;

    // Position tooltip so it doesn't go off-screen
    const tx = Math.min(x + 12, canvas.context.canvas.width - w - 4);
    const ty = Math.max(y - h - 4, 4);

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(10,10,30,0.95)';
    canvas.context.strokeStyle = '#557799';
    canvas.context.lineWidth = 1;
    canvas.context.fillRect(tx, ty, w, h);
    canvas.context.strokeRect(tx, ty, w, h);

    lines.forEach((line, i) => {
      canvas.context.font = i === 0 ? 'bold 11px Arial' : '11px Arial';
      canvas.context.fillStyle = line.color;
      canvas.context.fillText(line.text, tx + pad, ty + pad + (i + 1) * lineH - 4);
    });

    canvas.context.restore();
  },
};

export default TooltipRenderer;
