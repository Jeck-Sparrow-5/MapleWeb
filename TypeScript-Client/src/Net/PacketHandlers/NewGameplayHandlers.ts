/**
 * Handlers for newly added Cosmic inbound opcodes:
 * MAP_TRANSFER_RESULT (42), QUEST_CLEAR (49), SKILL_LEARN_ITEM_RESULT (51),
 * FORCED_STAT_SET (34), FORCED_STAT_RESET (35)
 */
import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import { activeQuests } from '../../UI/UIQuestLog';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

// opcode 42 — server confirms map warp has completed
export class MapTransferResultHandler extends PacketHandler {
  handle(_data: DataView): void {
    // Map transition complete — client-side map is already loaded via SET_FIELD
    // Nothing needed here; used for timing acknowledgment
  }
}

// opcode 49 — quest cleared (older format sent before SET_QUEST_CLEAR=150)
export class QuestClearHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const questId = data.getUint16(offset, true);
    const idx = activeQuests.findIndex((q) => q.id === questId);
    if (idx >= 0) {
      activeQuests[idx].state = 'completed';
    } else {
      activeQuests.push({ id: questId, name: `Quest ${questId}`, state: 'completed' });
    }
    UIStatusMessenger.show(`Quest ${questId} completed!`, '#FFDD88');
  }
}

// opcode 51 — result of using a skill book item
export class SkillLearnItemResultHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const result  = data.getUint8(offset); offset += 1;
    const skillId = data.getInt32(offset, true); offset += 4;
    const level   = data.getInt32(offset, true);

    switch (result) {
      case 1: UIStatusMessenger.show(`Skill ${skillId} mastered! (Lv.${level})`, '#AAFFAA'); break;
      case 2: UIStatusMessenger.show('Skill already at max level.', '#FFAA44'); break;
      case 3: UIStatusMessenger.show('Skill book requirements not met.', '#FF8888'); break;
      default: UIStatusMessenger.show('Skill learn failed.', '#FF8888');
    }
  }
}

// opcode 34 — server temporarily overrides a stat (safe guard from hacking)
export class ForcedStatSetHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const mask = data.getUint32(offset, true); offset += 4;
    if (mask & 0x400) { MyCharacter.hp = data.getInt16(offset, true); offset += 2; }
    if (mask & 0x800) { MyCharacter.maxHp = data.getInt16(offset, true); offset += 2; }
    if (mask & 0x1000) { MyCharacter.mp = data.getInt16(offset, true); offset += 2; }
    if (mask & 0x2000) { MyCharacter.maxMp = data.getInt16(offset, true); }
  }
}

// opcode 35 — server restores stats after forced override
export class ForcedStatResetHandler extends PacketHandler {
  handle(_data: DataView): void {
    // Trigger stat recalculation from base values
    // Stats are re-sent via STAT_CHANGED after this, nothing needed here
  }
}
