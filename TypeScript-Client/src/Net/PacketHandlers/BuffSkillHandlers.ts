import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UIBuffList from '../../UI/UIBuffList';
import { skillLevels } from '../../UI/UISkillBook';
import { getSkillNameSync } from '../../wz-utils/ItemNameLoader';
import { getSkillIconSync } from '../../wz-utils/ItemIconLoader';

// mask key → skillId, so CancelBuff can remove the right buff
const buffMaskToSkill = new Map<string, number>();

function countBits(n: number): number {
  let c = 0; let v = n >>> 0;
  while (v) { c += v & 1; v >>>= 1; }
  return c;
}

export class GiveBuffHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const mask1 = data.getUint32(offset, true); offset += 4;
    const mask2 = data.getUint32(offset, true); offset += 4;
    const setBits = countBits(mask1) + countBits(mask2);
    if (setBits === 0) return;

    // Each stat entry: short value + int skillId + int duration (ms)
    offset += 2; // value short (first stat)
    const skillId  = data.getInt32(offset, true); offset += 4;
    const duration = data.getInt32(offset, true);

    const name = getSkillNameSync(skillId) || `Skill ${skillId}`;
    const durationMs = duration > 0 ? duration : 30000;
    const icon = getSkillIconSync(skillId);

    buffMaskToSkill.set(`${mask1}:${mask2}`, skillId);
    UIBuffList.addBuff(skillId, name, durationMs, icon);
  }
}

export class CancelBuffHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const mask1 = data.getUint32(offset, true); offset += 4;
    const mask2 = data.getUint32(offset, true);
    const key = `${mask1}:${mask2}`;
    const skillId = buffMaskToSkill.get(key);
    if (skillId !== undefined) {
      const idx = UIBuffList.buffs.findIndex((b: any) => b.skillId === skillId);
      if (idx >= 0) UIBuffList.buffs.splice(idx, 1);
      buffMaskToSkill.delete(key);
    }
  }
}

export class UpdateSkillsHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    offset += 1; // recalculate flag
    const count = data.getUint16(offset, true); offset += 2;

    for (let i = 0; i < count; i++) {
      const skillId = data.getInt32(offset, true); offset += 4;
      const level = data.getInt32(offset, true); offset += 4;
      const masterLevel = data.getInt32(offset, true); offset += 4;
      offset += 8; // expiry time
      skillLevels.set(skillId, level);
    }
    // Signal UISkillBook to rebuild skills list (handles class advancement)
    try {
      const MapState = (window as any).MapStateInstance;
      MapState?.skillBook?.markDirty?.();
    } catch (_) {}
  }
}
