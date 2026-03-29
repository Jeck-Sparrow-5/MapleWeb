import { IPacketHandler } from './PacketHandler';
import { InPacketOpcode } from './InPacket';
import { LoginStatusHandler } from './PacketHandlers/LoginStatusHandler';
import { PingHandler } from './PacketHandlers/PingHandler';
import { ServerListHandler } from './PacketHandlers/ServerListHandler';
import { CharacterListHandler } from './PacketHandlers/CharacterListHandler';

export class PacketHandlerRegistry {
  private static instance: PacketHandlerRegistry | null = null;
  private handlers: Map<InPacketOpcode, IPacketHandler> = new Map();
  private constructor() {
    this.registerHandlers();
  }

  static getInstance(): PacketHandlerRegistry {
    if (!PacketHandlerRegistry.instance) {
      PacketHandlerRegistry.instance = new PacketHandlerRegistry();
    }
    return PacketHandlerRegistry.instance;
  }

  private registerHandlers(): void {
    this.handlers.set(InPacketOpcode.LOGIN_STATUS, new LoginStatusHandler());
    this.handlers.set(InPacketOpcode.SERVER_LIST, new ServerListHandler());
    this.handlers.set(InPacketOpcode.CHARACTER_LIST, new CharacterListHandler());
    this.handlers.set(InPacketOpcode.PING, new PingHandler());
  }

  getHandler(opcode: InPacketOpcode): IPacketHandler | undefined {
    return this.handlers.get(opcode);
  }
}
