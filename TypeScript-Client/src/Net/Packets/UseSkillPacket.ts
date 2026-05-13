import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class UseSkillPacket extends OutPacket {
  constructor(skillId: number, skillLevel: number) {
    super(OutPacketOpcode.USE_SKILL);
    this.writeInt(skillId);
    this.writeByte(skillLevel);
    this.writeByte(0); // unknown
    this.writeShort(0); // x
    this.writeShort(0); // y
  }
}
