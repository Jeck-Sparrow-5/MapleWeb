import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class CharInfoRequestPacket extends OutPacket {
  constructor(charId: number) {
    super(OutPacketOpcode.CHAR_INFO_REQUEST);
    this.writeInt(charId);
  }
}
