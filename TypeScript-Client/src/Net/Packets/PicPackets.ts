import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class SelectCharPicPacket extends OutPacket {
  constructor(pic: string, characterId: number) {
    super(OutPacketOpcode.SELECT_CHAR_PIC);
    this.writeString(pic);
    this.writeInt(characterId);
    this.writeString('00-00-00-00-00-00');               // MAC
    this.writeString('000000000000_00000000');            // HWID — [0-9A-F]{12}_[0-9A-F]{8}
  }
}

export class RegisterPicPacket extends OutPacket {
  constructor(characterId: number, pic: string) {
    super(OutPacketOpcode.REGISTER_PIC);
    this.writeInt(characterId);
    this.writeByte(0);       // flag byte Cosmic reads between charId and PIC
    this.writeString(pic);
    this.writeString('000000000000_00000000'); // HWID — Cosmic expects [0-9A-F]{12}_[0-9A-F]{8}
  }
}
