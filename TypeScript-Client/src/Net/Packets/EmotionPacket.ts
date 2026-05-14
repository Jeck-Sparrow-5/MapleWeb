import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class EmotionPacket extends OutPacket {
  constructor(emoteId: number) {
    super(OutPacketOpcode.FACIAL_EXPRESSION);
    this.writeInt(emoteId);
  }
}
