import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class FamePacket extends OutPacket {
  constructor(targetCharId: number, mode: 1 | 0) {
    super(OutPacketOpcode.GIVE_FAME);
    this.writeInt(targetCharId);
    this.writeByte(mode); // 1 = fame, 0 = defame
  }
}
