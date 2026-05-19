import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class SelectCharPacket extends OutPacket {
  constructor(characterId: number) {
    super(OutPacketOpcode.SELECT_CHARACTER);
    this.writeInt(characterId);
    this.writeString('00-00-00-00-00-00');       // MAC
    this.writeString('AABBCCAABBCC_AABBCCDD');   // HWID [0-9A-F]{12}_[0-9A-F]{8}
  }
}
