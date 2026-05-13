import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import SessionManager from '../../SessionManager';
import PlayerLoginPacket from '../Packets/PlayerLoginPacket';
import LoginState from '../../LoginState';

export class ServerIPHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    offset += 1; // skip 1 byte

    // 4-byte IP address (ignored — proxy handles routing)
    offset += 4;

    const port = data.getUint16(offset, true);
    offset += 2;

    const characterId = data.getInt32(offset, true);
    offset += 4;

    console.log(`[ServerIPHandler] channel port=${port} charId=${characterId}`);

    await SessionManager.reconnect(port);
    new PlayerLoginPacket(characterId).dispatch();
    await LoginState.enterGame();
  }
}
