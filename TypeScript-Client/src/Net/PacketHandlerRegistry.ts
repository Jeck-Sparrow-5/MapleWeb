import { IPacketHandler } from './PacketHandler';
import { InPacketOpcode } from './InPacket';
import { LoginStatusHandler } from './PacketHandlers/LoginStatusHandler';
import { PingHandler } from './PacketHandlers/PingHandler';
import { ServerListHandler } from './PacketHandlers/ServerListHandler';
import { CharacterListHandler } from './PacketHandlers/CharacterListHandler';
import { ServerIPHandler } from './PacketHandlers/ServerIPHandler';
import { GenderDoneHandler } from './PacketHandlers/GenderDoneHandler';
import { AddNewCharEntryHandler } from './PacketHandlers/AddNewCharHandler';
import { CharNameResponseHandler, DeleteCharResponseHandler } from './PacketHandlers/CharManageHandlers';
import { ChatTextHandler } from './PacketHandlers/ChatTextHandler';
import { SetFieldHandler } from './PacketHandlers/SetFieldHandler';
import { StatChangedHandler } from './PacketHandlers/StatChangedHandler';
import { InventoryOperationHandler } from './PacketHandlers/InventoryOperationHandler';
import {
  SpawnMonsterHandler,
  SpawnMonsterControlHandler,
  KillMonsterHandler,
  MoveMonsterHandler,
  DamageMonsterHandler,
} from './PacketHandlers/SpawnMonsterHandler';
import { SpawnNpcHandler, RemoveNpcHandler } from './PacketHandlers/SpawnNpcHandler';
import { DropItemFromMapObjectHandler, RemoveItemFromMapHandler } from './PacketHandlers/DropItemHandler';
import { SpawnPlayerHandler, RemovePlayerHandler, MovePlayerHandler } from './PacketHandlers/SpawnPlayerHandler';
import { GiveBuffHandler, CancelBuffHandler, UpdateSkillsHandler } from './PacketHandlers/BuffSkillHandlers';
import { NpcTalkHandler, OpenNpcShopHandler } from './PacketHandlers/NpcHandlers';
import {
  ServerMessageHandler,
  ShowStatusInfoHandler,
  NotifyLevelUpHandler,
  ShowMonsterHpHandler,
  BuddyListHandler,
  RemoteAttackHandler,
  CooldownHandler,
  PartyOperationHandler,
  UpdatePartyMemberHpHandler,
} from './PacketHandlers/MapMessageHandlers';

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
    // Login server
    this.handlers.set(InPacketOpcode.LOGIN_STATUS,       new LoginStatusHandler());
    this.handlers.set(InPacketOpcode.GENDER_DONE,        new GenderDoneHandler());
    this.handlers.set(InPacketOpcode.ADD_NEW_CHAR_ENTRY,   new AddNewCharEntryHandler());
    this.handlers.set(InPacketOpcode.CHAR_NAME_RESPONSE,   new CharNameResponseHandler());
    this.handlers.set(InPacketOpcode.DELETE_CHAR_RESPONSE, new DeleteCharResponseHandler());
    this.handlers.set(InPacketOpcode.SERVER_LIST,        new ServerListHandler());
    this.handlers.set(InPacketOpcode.CHARACTER_LIST,     new CharacterListHandler());
    this.handlers.set(InPacketOpcode.SERVER_IP,          new ServerIPHandler());
    this.handlers.set(InPacketOpcode.PING,               new PingHandler());

    // Channel server — character
    this.handlers.set(InPacketOpcode.SET_FIELD,          new SetFieldHandler());
    this.handlers.set(InPacketOpcode.STAT_CHANGED,       new StatChangedHandler());
    this.handlers.set(InPacketOpcode.INVENTORY_OPERATION,new InventoryOperationHandler());
    this.handlers.set(InPacketOpcode.GIVE_BUFF,          new GiveBuffHandler());
    this.handlers.set(InPacketOpcode.CANCEL_BUFF,        new CancelBuffHandler());
    this.handlers.set(InPacketOpcode.UPDATE_SKILLS,      new UpdateSkillsHandler());

    // Channel server — map entities
    this.handlers.set(InPacketOpcode.SPAWN_MONSTER,         new SpawnMonsterHandler());
    this.handlers.set(InPacketOpcode.SPAWN_MONSTER_CONTROL, new SpawnMonsterControlHandler());
    this.handlers.set(InPacketOpcode.KILL_MONSTER,          new KillMonsterHandler());
    this.handlers.set(InPacketOpcode.MOVE_MONSTER,          new MoveMonsterHandler());
    this.handlers.set(InPacketOpcode.DAMAGE_MONSTER,        new DamageMonsterHandler());
    this.handlers.set(InPacketOpcode.SPAWN_NPC,             new SpawnNpcHandler());
    this.handlers.set(InPacketOpcode.REMOVE_NPC,            new RemoveNpcHandler());
    this.handlers.set(InPacketOpcode.DROP_ITEM_FROM_MAPOBJECT, new DropItemFromMapObjectHandler());
    this.handlers.set(InPacketOpcode.REMOVE_ITEM_FROM_MAP,  new RemoveItemFromMapHandler());

    // Channel server — multiplayer
    this.handlers.set(InPacketOpcode.SPAWN_PLAYER,          new SpawnPlayerHandler());
    this.handlers.set(InPacketOpcode.REMOVE_PLAYER_FROM_MAP,new RemovePlayerHandler());
    this.handlers.set(InPacketOpcode.MOVE_PLAYER,           new MovePlayerHandler());

    // Chat
    this.handlers.set(InPacketOpcode.CHATTEXT,  new ChatTextHandler());
    this.handlers.set(InPacketOpcode.CHATTEXT1, new ChatTextHandler());

    // NPC
    this.handlers.set(InPacketOpcode.NPC_TALK,        new NpcTalkHandler());
    this.handlers.set(InPacketOpcode.OPEN_NPC_SHOP,   new OpenNpcShopHandler());

    // Map messages
    this.handlers.set(InPacketOpcode.SERVERMESSAGE,   new ServerMessageHandler());
    this.handlers.set(InPacketOpcode.SHOW_STATUS_INFO,new ShowStatusInfoHandler());
    this.handlers.set(InPacketOpcode.NOTIFY_LEVELUP,  new NotifyLevelUpHandler());
    this.handlers.set(InPacketOpcode.SHOW_MONSTER_HP, new ShowMonsterHpHandler());
    this.handlers.set(InPacketOpcode.BUDDYLIST,       new BuddyListHandler());
    this.handlers.set(InPacketOpcode.CLOSE_RANGE_ATTACK, new RemoteAttackHandler());
    this.handlers.set(InPacketOpcode.RANGED_ATTACK,   new RemoteAttackHandler());
    this.handlers.set(InPacketOpcode.COOLDOWN,             new CooldownHandler());
    this.handlers.set(InPacketOpcode.PARTY_OPERATION,      new PartyOperationHandler());
    this.handlers.set(InPacketOpcode.UPDATE_PARTYMEMBER_HP,new UpdatePartyMemberHpHandler());
  }

  getHandler(opcode: InPacketOpcode): IPacketHandler | undefined {
    return this.handlers.get(opcode);
  }
}
