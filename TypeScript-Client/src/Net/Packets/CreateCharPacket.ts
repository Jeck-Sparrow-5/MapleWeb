import { OutPacket, OutPacketOpcode } from '../OutPacket';

// v83 opcode for character creation (explorer)
const CREATE_CHAR_OPCODE = 22; // 0x16

export default class CreateCharPacket extends OutPacket {
  constructor(
    name: string,
    face: number,
    hair: number,
    hairColor: number,
    skin: number,
    top: number,
    bottom: number,
    shoes: number,
    weapon: number,
    gender: number,
  ) {
    super(CREATE_CHAR_OPCODE as any);
    this.writeString(name);
    this.writeInt(face);
    this.writeInt(hair);
    this.writeInt(hairColor);
    this.writeInt(skin);
    this.writeInt(top);
    this.writeInt(bottom);
    this.writeInt(shoes);
    this.writeInt(weapon);
    this.writeByte(gender);
  }
}
