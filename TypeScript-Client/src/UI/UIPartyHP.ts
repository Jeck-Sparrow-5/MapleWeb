import NXManager from '../wz-utils/NXManager';
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
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
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

      canvas.drawRect({ x: startX, y, width: barW + 4, height: barH, color: '#000000', alpha: 0.6 });
      const hpColor = ratio > 0.5 ? '#44AA44' : ratio > 0.25 ? '#AAAA22' : '#AA2222';
      canvas.drawRect({ x: startX + 2, y: y + 2, width: fillW, height: barH - 4, color: hpColor });
      if (this.barFill && fillW > 0) {
        canvas.drawImage({ img: this.barFill,
          sx: 0, sy: 0, sw: Math.floor(this.barFill.width * ratio), sh: this.barFill.height,
          dx: startX + 2, dy: y + (barH - this.barFill.height) / 2, dw: fillW, dh: this.barFill.height });
      }
      canvas.drawText({ text: `${m.name}`, x: startX + 4, y: y + 10, color: '#ffffff', fontSize: 10 });
      canvas.drawText({ text: `${m.hp}/${m.maxHp}`, x: startX + barW, y: y + 10, color: '#aaaaaa', fontSize: 10, align: 'right' });
    });
  },
};

export default UIPartyHP;
