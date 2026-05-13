import GameCanvas from '../GameCanvas';
import { skillLevels } from './UISkillBook';
import UseSkillPacket from '../Net/Packets/UseSkillPacket';
import SessionManager from '../SessionManager';
import config from '../Config';
import WZManager from '../wz-utils/WZManager';

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
  const uiWin = await WZManager.get('UI.wz/UIWindow.img');
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

      canvas.context.save();
      canvas.context.fillStyle = 'rgba(0,0,0,0.65)';
      canvas.context.strokeStyle = i === selectedHotbarSlot ? '#FFDD00' : '#445566';
      canvas.context.lineWidth = i === selectedHotbarSlot ? 2 : 1;
      canvas.context.fillRect(sx, y, slotSize, slotSize);
      canvas.context.strokeRect(sx, y, slotSize, slotSize);
      canvas.context.lineWidth = 1;

      if (skillId !== null) {
        const icon = this.slotIcons.get(skillId);
        if (icon) {
          try { canvas.context.drawImage(icon, sx + 2, y + 2, slotSize - 4, slotSize - 4); }
          catch (_) {}
        } else {
          canvas.context.fillStyle = '#334466';
          canvas.context.fillRect(sx + 2, y + 2, slotSize - 4, slotSize - 4);
        }
        const lvl = skillLevels.get(skillId) ?? 0;
        canvas.context.fillStyle = '#FFFF66';
        canvas.context.font = '7px Arial';
        canvas.context.fillText(`${lvl}`, sx + slotSize - 9, y + slotSize - 2);

        // Cooldown arc overlay
        const cd = cooldowns.get(skillId);
        if (cd) {
          const remaining = cd.endTime - Date.now();
          if (remaining > 0) {
            const fraction = remaining / cd.totalMs;
            canvas.context.save();
            canvas.context.globalAlpha = 0.6;
            canvas.context.fillStyle = '#000000';
            canvas.context.beginPath();
            canvas.context.moveTo(sx + slotSize / 2, y + slotSize / 2);
            canvas.context.arc(sx + slotSize / 2, y + slotSize / 2, slotSize / 2,
              -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
            canvas.context.closePath();
            canvas.context.fill();
            canvas.context.globalAlpha = 1;
            canvas.context.fillStyle = '#FFFFFF';
            canvas.context.font = 'bold 9px Arial';
            canvas.context.textAlign = 'center';
            canvas.context.fillText(`${Math.ceil(remaining / 1000)}`, sx + slotSize / 2, y + slotSize / 2 + 4);
            canvas.context.textAlign = 'left';
            canvas.context.restore();
          } else {
            cooldowns.delete(skillId);
          }
        }
      }

      // Key label
      canvas.context.fillStyle = '#AAAAAA';
      canvas.context.font = '8px Arial';
      canvas.context.fillText(i === 9 ? '0' : `${i + 1}`, sx + 2, y + 9);
      canvas.context.restore();
    }
  },
};

export default UISkillHotbar;
