import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import config from '../Config';
import SessionManager from '../SessionManager';
import { CancelBuffPacket } from '../Net/Packets/UpgradeScrollPacket';

export interface ActiveBuff {
  skillId: number;
  icon: any;
  name: string;
  durationMs: number;
  startTime: number;
}

const UIBuffList = {
  buffs: [] as ActiveBuff[],
  iconCache: new Map<number, any>(),
  initialized: false,
  buffIconNode: null as any,

  async initialize() {
    try {
      this.buffIconNode = await NXManager.get('UI.wz/BuffIcon.img');
    } catch (_) {}
    this.initialized = true;
  },

  addBuff(skillId: number, name: string, durationMs: number, icon?: any) {
    // Replace existing if present
    const idx = this.buffs.findIndex((b) => b.skillId === skillId);
    const entry: ActiveBuff = { skillId, icon: icon ?? null, name, durationMs, startTime: Date.now() };
    if (idx >= 0) this.buffs[idx] = entry;
    else this.buffs.push(entry);
  },

  removeBuff(skillId: number) {
    this.buffs = this.buffs.filter((b) => b.skillId !== skillId);
  },

  // Call from MapState or GameCanvas right-click handler
  onRightClick(mx: number, my: number): boolean {
    const startX = config.originalWidth - 8;
    const baseY = 6;
    const iconSize = 32;
    const gap = 2;
    for (let i = 0; i < this.buffs.length; i++) {
      const bx = startX - (i + 1) * (iconSize + gap);
      if (mx >= bx && mx < bx + iconSize && my >= baseY && my < baseY + iconSize) {
        const buff = this.buffs[i];
        if (SessionManager.isConnected()) {
          new CancelBuffPacket(buff.skillId).dispatch();
        }
        this.buffs.splice(i, 1);
        return true;
      }
    }
    return false;
  },

  update() {
    const now = Date.now();
    this.buffs = this.buffs.filter((b) => now - b.startTime < b.durationMs);
  },

  draw(canvas: GameCanvas) {
    if (!this.initialized || this.buffs.length === 0) return;

    const startX = config.originalWidth - 8;
    const baseY = 6;
    const iconSize = 32;
    const gap = 2;

    this.buffs.forEach((buff, i) => {
      const bx = startX - (i + 1) * (iconSize + gap);
      const by = baseY;

      canvas.drawRect({ x: bx, y: by, width: iconSize, height: iconSize, color: '#000000', alpha: 0.5 });

      if (buff.icon) {
        canvas.drawImage({ img: buff.icon, dx: bx, dy: by, dw: iconSize, dh: iconSize });
      } else {
        canvas.drawRect({ x: bx + 2, y: by + 2, width: iconSize - 4, height: iconSize - 4, color: '#334477' });
        canvas.drawText({ text: buff.name.substring(0, 4), x: bx + 2, y: by + 16, color: '#AAAAFF', fontSize: 7 });
      }

      // Time remaining arc
      const elapsed = Date.now() - buff.startTime;
      const remaining = 1 - elapsed / buff.durationMs;
      canvas.drawArc({
        x: bx + iconSize / 2, y: by + iconSize / 2,
        radius: iconSize / 2 - 2,
        startAngle: -Math.PI / 2,
        endAngle: -Math.PI / 2 + remaining * 2 * Math.PI,
        strokeColor: '#ffffff', strokeWidth: 2, strokeAlpha: 0.6,
      });
    });
  },
};

export default UIBuffList;
