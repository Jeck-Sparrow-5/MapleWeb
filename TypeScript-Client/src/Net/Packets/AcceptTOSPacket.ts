import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class AcceptTOSPacket extends OutPacket {
  constructor()
  {
    super(OutPacketOpcode.ACCEPT_TOS);
    this.writeByte(1);
  }
}
