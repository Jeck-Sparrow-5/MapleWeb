import { OutPacket, OutPacketOpcode } from '../OutPacket';

// Chat types: 0=buddy, 1=party, 2=guild, 3=alliance
export default class MultiChatPacket extends OutPacket {
  constructor(type: 0 | 1 | 2 | 3, message: string) {
    super(OutPacketOpcode.MULTI_CHAT);
    this.writeByte(type);
    this.writeByte(0); // number of recipients (0 = all in group)
    this.writeString(message);
  }
}
