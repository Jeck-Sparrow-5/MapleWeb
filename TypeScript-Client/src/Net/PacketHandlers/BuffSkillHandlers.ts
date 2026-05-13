import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UIBuffList from '../../UI/UIBuffList';
import { skillLevels } from '../../UI/UISkillBook';

export class GiveBuffHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;

    // Buff stat masks (8 bytes) + value/duration per active buff
    // Simplified: read first stat mask to get skill ID, duration
    offset += 8; // stat mask bytes (skip details — just grab duration)
    // We don't have a clean way to get skill ID from this without full stat map
    // Use a basic approach: show a generic buff icon for 30s
    const duration = 30000;
    UIBuffList.addBuff(0, 'Buff', duration);
  }
}

export class CancelBuffHandler extends PacketHandler {
  handle(data: DataView): void {
    // Remove first buff (simplified)
    if (UIBuffList.buffs.length > 0) {
      UIBuffList.buffs[0].durationMs = 0;
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
  }
}
