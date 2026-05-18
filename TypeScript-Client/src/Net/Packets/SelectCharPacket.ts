import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class SelectCharPacket extends OutPacket {
  constructor(characterId: number) {
    super(OutPacketOpcode.SELECT_CHARACTER);
    this.writeInt(characterId);
    this.writeString('00-00-00-00-00-00'); // MAC address
    this.writeString('');                    // HWID (empty)
  }
}
