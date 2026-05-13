import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class DeleteCharPacket extends OutPacket {
  constructor(characterId: number, birthday: string) {
    super(OutPacketOpcode.DELETE_CHAR);
    this.writeString(birthday); // YYYYMMDD format
    this.writeInt(characterId);
  }
}

export class CheckCharNamePacket extends OutPacket {
  constructor(name: string) {
    super(OutPacketOpcode.CHECK_CHAR_NAME);
    this.writeString(name);
  }
}
