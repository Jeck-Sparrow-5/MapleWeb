import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class EmotionPacket extends OutPacket {
  constructor(emoteId: number) {
    super(OutPacketOpcode.CHATTEXT_SEND); // placeholder until exact opcode confirmed
    this.writeInt(emoteId);
  }
}
