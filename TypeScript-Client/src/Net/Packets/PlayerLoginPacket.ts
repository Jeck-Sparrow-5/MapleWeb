import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class PlayerLoginPacket extends OutPacket {
  constructor(characterId: number) {
    super(OutPacketOpcode.PLAYER_LOGIN);
    this.writeInt(characterId);
  }
}
