import GameCanvas from '../GameCanvas';
import { skillLevels } from './UISkillBook';
import UseSkillPacket from '../Net/Packets/UseSkillPacket';
import SessionManager from '../SessionManager';
import config from '../Config';
import NXManager from '../wz-utils/NXManager';

// Slots 0-9 mapped to keys 1-9,0. Slots 10-19 mapped to F1-F10.
export const hotbarSlots: (number | null)[] = new Array(20).fill(null);
export let selectedHotbarSlot = 0;

export function selectHotbarSlot(i: number) {
  selectedHotbarSlot = Math.max(0, Math.min(19, i));
}

export function assignSkillToSelectedSlot(skillId: number) {
  hotbarSlots[selectedHotbarSlot] = skillId;
}

// skillId → { endTime, totalMs }
export const cooldowns = new Map<number, { endTime: number; totalMs: number }>();

export function setCooldown(skillId: number, ms: number) {
  cooldowns.set(skillId, { endTime: Date.now() + ms, totalMs: ms });
}

let coolTimeImg: any = null;
async function loadCoolTimeImg() {
  if (coolTimeImg) return;
  const uiWin = await NXManager.get('UI.wz/UIWindow.img');
  coolTimeImg = uiWin?.nGet('CoolTime')?.nGetImage?.() ?? null;
}

export function setHotbarSlot(slot: number, skillId: number | null) {
  hotbarSlots[slot] = skillId;
}

export function useHotbarSlot(slot: number): number | null {
  const skillId = hotbarSlots[slot];
  if (skillId === null) return null;
  const level = skillLevels.get(skillId) ?? 0;
  if (level === 0) return null;
  if (SessionManager.isConnected()) {
    new UseSkillPacket(skillId, level).dispatch();
  }
  return skillId;
}

const UISkillHotbar = {
  slotIcons: new Map<number, any>(),

  async preload() {
    await loadCoolTimeImg();
  },

  draw(canvas: GameCanvas) {
    const slotSize = 32;
    const gap = 2;
    const count = 10;
    const totalW = count * (slotSize + gap) - gap;
    const startX = Math.floor((config.originalWidth - totalW) / 2);
    const y = config.originalHeight - 85 + (config.height - config.originalHeight);

    for (let i = 0; i < count; i++) {
      const sx = startX + i * (slotSize + gap);
      const skillId = hotbarSlots[i];

      const selected = i === selectedHotbarSlot;
      canvas.drawRect({ x: sx, y, width: slotSize, height: slotSize, color: '#000000', alpha: 0.65 });
      canvas.drawRect({ x: sx, y, width: slotSize, height: slotSize,
        strokeColor: selected ? '#FFDD00' : '#445566', strokeWidth: selected ? 2 : 1 });

      if (skillId !== null) {
        const icon = this.slotIcons.get(skillId);
        if (icon) {
          canvas.drawImage({ img: icon, dx: sx + 2, dy: y + 2, dw: slotSize - 4, dh: slotSize - 4 });
        } else {
          canvas.drawRect({ x: sx + 2, y: y + 2, width: slotSize - 4, height: slotSize - 4, color: '#334466' });
        }
        const lvl = skillLevels.get(skillId) ?? 0;
        canvas.drawText({ text: `${lvl}`, x: sx + slotSize - 9, y: y + slotSize - 2, color: '#FFFF66', fontSize: 7 });

        const cd = cooldowns.get(skillId);
        if (cd) {
          const remaining = cd.endTime - Date.now();
          if (remaining > 0) {
            const fraction = remaining / cd.totalMs;
            const cx = sx + slotSize / 2, cy = y + slotSize / 2;
            canvas.drawArc({ x: cx, y: cy, radius: slotSize / 2,
              startAngle: -Math.PI / 2, endAngle: -Math.PI / 2 + fraction * Math.PI * 2,
              color: '#000000', alpha: 0.6 });
            canvas.drawText({ text: `${Math.ceil(remaining / 1000)}`, x: cx, y: cy + 4,
              color: '#ffffff', fontSize: 9, fontWeight: 'bold', align: 'center' });
          } else {
            cooldowns.delete(skillId);
          }
        }
      }

      canvas.drawText({ text: i === 9 ? '0' : `${i + 1}`, x: sx + 2, y: y + 9, color: '#aaaaaa', fontSize: 8 });
    }
  },
};

export default UISkillHotbar;
