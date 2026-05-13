import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import { skillSPTotal } from '../../UI/UISkillBook';

// v83 stat masks
const STAT = {
  SKIN:    0x1,
  FACE:    0x2,
  HAIR:    0x4,
  LEVEL:   0x10,
  JOB:     0x20,
  STR:     0x40,
  DEX:     0x80,
  INT:     0x100,
  LUK:     0x200,
  HP:      0x400,
  MAX_HP:  0x800,
  MP:      0x1000,
  MAX_MP:  0x2000,
  AP:      0x4000,
  SP:      0x8000,
  EXP:     0x10000,
  FAME:    0x20000,
  MESOS:   0x40000,
};

export class StatChangedHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;

    offset += 1; // enable actions byte

    const mask = data.getInt32(offset, true); offset += 4;

    if (mask & STAT.SKIN)   { MyCharacter.skinColor = data.getInt8(offset); offset += 1; }
    if (mask & STAT.FACE)   { MyCharacter.face      = data.getInt32(offset, true); offset += 4; }
    if (mask & STAT.HAIR)   { MyCharacter.Hair      = data.getInt32(offset, true); offset += 4; }
    if (mask & STAT.LEVEL)  { MyCharacter.stats.level = data.getInt8(offset); offset += 1; }
    if (mask & STAT.JOB)    { /* job = */ data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.STR)    { MyCharacter.stats.str = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.DEX)    { MyCharacter.stats.dex = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.INT)    { MyCharacter.stats.int = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.LUK)    { MyCharacter.stats.luk = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.HP)     { MyCharacter.hp        = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.MAX_HP) { MyCharacter.maxHp     = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.MP)     { MyCharacter.mp        = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.MAX_MP) { MyCharacter.maxMp     = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.AP)     { MyCharacter.stats.abilityPoints = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.SP)     { skillSPTotal.sp       = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.EXP)    { MyCharacter.exp       = data.getInt32(offset, true); offset += 4; }
    if (mask & STAT.FAME)   { MyCharacter.fame      = data.getInt16(offset, true); offset += 2; }
    if (mask & STAT.MESOS)  { MyCharacter.inventory.mesos = data.getInt32(offset, true); offset += 4; }
  }
}
