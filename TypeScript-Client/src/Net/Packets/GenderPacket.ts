import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class GenderPacket extends OutPacket {
  constructor(isFemale: boolean) {
    super(OutPacketOpcode.SET_GENDER);
    this.writeByte(isFemale ? 1 : 0);
  }
}
