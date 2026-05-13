import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class ChatPacket extends OutPacket {
  constructor(message: string) {
    super(OutPacketOpcode.CHATTEXT_SEND);
    this.writeString(message);
    this.writeByte(0); // not whisper
  }
}
