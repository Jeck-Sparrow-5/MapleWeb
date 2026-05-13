import WZManager from '../wz-utils/WZManager';
import GameCanvas from '../GameCanvas';
import config from '../Config';

export interface PartyMember {
  charId: number;
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  job: number;
  channel: number;
  mapId: number;
}

export const partyMembers: PartyMember[] = [];

const UIPartyHP = {
  barBg: null as any,
  barFill: null as any,
  initialized: false,

  async initialize() {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    const ph = uiWin?.nGet('PartyHP');
    this.barBg   = ph?.nGet('0')?.nGetImage?.() ?? null; // 5×7 end cap
    this.barFill = ph?.nGet('1')?.nGetImage?.() ?? null; // 144×7 fill
    this.initialized = true;
  },

  draw(canvas: GameCanvas) {
    if (!partyMembers.length) return;

    const startX = 6;
    const startY = config.originalHeight - 200 + (config.height - config.originalHeight);
    const barW = 144;
    const barH = 14;
    const gap = 4;

    partyMembers.forEach((m, i) => {
      const y = startY + i * (barH + gap);
      const ratio = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
      const fillW = Math.floor(ratio * barW);

      // Background
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(0,0,0,0.6)';
      canvas.context.fillRect(startX, y, barW + 4, barH);

      // HP fill
      canvas.context.fillStyle = ratio > 0.5 ? '#44AA44' : ratio > 0.25 ? '#AAAA22' : '#AA2222';
      canvas.context.fillRect(startX + 2, y + 2, fillW, barH - 4);

      // Use WZ bar images if available
      if (this.barFill) {
        try {
          canvas.context.drawImage(this.barFill, 0, 0, Math.floor(this.barFill.width * ratio), this.barFill.height,
            startX + 2, y + (barH - this.barFill.height) / 2, fillW, this.barFill.height);
        } catch (_) {}
      }

      canvas.context.restore();

      // Name + HP text
      canvas.context.save();
      canvas.context.font = '10px Arial';
      canvas.context.fillStyle = '#FFFFFF';
      canvas.context.fillText(`${m.name}`, startX + 4, y + 10);
      canvas.context.fillStyle = '#AAAAAA';
      canvas.context.textAlign = 'right';
      canvas.context.fillText(`${m.hp}/${m.maxHp}`, startX + barW, y + 10);
      canvas.context.textAlign = 'left';
      canvas.context.restore();
    });
  },
};

export default UIPartyHP;
