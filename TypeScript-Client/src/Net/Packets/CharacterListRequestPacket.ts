import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class CharacterListRequestPacket extends OutPacket {
  constructor(
    public worldId: number,
    public channelId: number,
  ) {
    super(OutPacketOpcode.CHARACTER_LIST_REQUEST);

    this.writeByte(0);
    this.writeByte(worldId);
    this.writeByte(channelId);
  }
}
