import { OutPacket, OutPacketOpcode } from '../OutPacket';

export interface AttackEntry {
  mobObjectId: number;
  hitCount: number;
  damages: number[];
}

export default class AttackPacket extends OutPacket {
  constructor(
    isRanged: boolean,
    skillId: number,
    skillLevel: number,
    stance: number,
    entries: AttackEntry[],
  ) {
    super(isRanged ? OutPacketOpcode.ATTACK_RANGED : OutPacketOpcode.ATTACK_CLOSE);

    this.writeByte(entries.length | (0 << 4)); // mob count | hit count per mob
    this.writeByte(skillLevel);
    this.writeInt(skillId);
    this.writeByte(stance);
    this.writeByte(0); // speed
    this.writeByte(0); // unk
    this.writeShort(0); // projectile id (ranged)

    for (const entry of entries) {
      this.writeInt(entry.mobObjectId);
      this.writeByte(entry.hitCount);
      for (const dmg of entry.damages) {
        this.writeInt(dmg);
      }
    }
  }
}
