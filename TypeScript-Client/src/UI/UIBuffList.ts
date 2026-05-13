import WZManager from '../wz-utils/WZManager';
import GameCanvas from '../GameCanvas';
import config from '../Config';

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
      this.buffIconNode = await WZManager.get('UI.wz/BuffIcon.img');
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

      // Dark slot background
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(0,0,0,0.5)';
      canvas.context.fillRect(bx, by, iconSize, iconSize);

      if (buff.icon) {
        try {
          canvas.context.drawImage(buff.icon, bx, by, iconSize, iconSize);
        } catch (_) {}
      } else {
        // Fallback colored square
        canvas.context.fillStyle = '#334477';
        canvas.context.fillRect(bx + 2, by + 2, iconSize - 4, iconSize - 4);
        canvas.context.fillStyle = '#AAAAFF';
        canvas.context.font = '7px Arial';
        canvas.context.fillText(buff.name.substring(0, 4), bx + 2, by + 16);
      }

      // Time remaining arc
      const elapsed = Date.now() - buff.startTime;
      const remaining = 1 - elapsed / buff.durationMs;
      canvas.context.strokeStyle = 'rgba(255,255,255,0.6)';
      canvas.context.lineWidth = 2;
      canvas.context.beginPath();
      canvas.context.arc(
        bx + iconSize / 2,
        by + iconSize / 2,
        iconSize / 2 - 2,
        -Math.PI / 2,
        -Math.PI / 2 + remaining * 2 * Math.PI
      );
      canvas.context.stroke();

      canvas.context.restore();
    });
  },
};

export default UIBuffList;
