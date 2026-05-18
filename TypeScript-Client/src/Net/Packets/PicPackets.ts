import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class SelectCharPicPacket extends OutPacket {
  constructor(pic: string, characterId: number) {
    super(OutPacketOpcode.SELECT_CHAR_PIC);
    this.writeString(pic);
    this.writeInt(characterId);
    this.writeString('00-00-00-00-00-00');
    this.writeString('');
  }
}

export class RegisterPicPacket extends OutPacket {
  constructor(characterId: number, pic: string) {
    super(OutPacketOpcode.REGISTER_PIC);
    this.writeInt(characterId);
    this.writeString(pic);
  }
}
