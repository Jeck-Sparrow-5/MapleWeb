import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class WhisperPacket extends OutPacket {
  constructor(targetName: string, message: string, findMode = false) {
    super(OutPacketOpcode.WHISPER);
    this.writeByte(findMode ? 0x05 : 0x06); // 0x06=whisper, 0x05=find
    this.writeString(targetName);
    if (!findMode) {
      this.writeByte(0xff); // channel (-1 = current)
      this.writeString(message);
    }
  }
}
