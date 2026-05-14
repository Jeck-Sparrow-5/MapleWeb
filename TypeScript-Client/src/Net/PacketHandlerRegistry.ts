import { IPacketHandler } from './PacketHandler';
import { InPacketOpcode } from './InPacket';

// Login handlers
import { LoginStatusHandler } from './PacketHandlers/LoginStatusHandler';
import { PingHandler } from './PacketHandlers/PingHandler';
import { ServerListHandler } from './PacketHandlers/ServerListHandler';
import { CharacterListHandler } from './PacketHandlers/CharacterListHandler';
import { ServerIPHandler } from './PacketHandlers/ServerIPHandler';
import { GenderDoneHandler } from './PacketHandlers/GenderDoneHandler';
import { AddNewCharEntryHandler } from './PacketHandlers/AddNewCharHandler';
import { CharNameResponseHandler, DeleteCharResponseHandler } from './PacketHandlers/CharManageHandlers';

// Chat
import { ChatTextHandler } from './PacketHandlers/ChatTextHandler';

// Channel — character state
import { SetFieldHandler } from './PacketHandlers/SetFieldHandler';
import { StatChangedHandler } from './PacketHandlers/StatChangedHandler';
import { InventoryOperationHandler } from './PacketHandlers/InventoryOperationHandler';
import { GiveBuffHandler, CancelBuffHandler, UpdateSkillsHandler } from './PacketHandlers/BuffSkillHandlers';

// Channel — map entities
import {
  SpawnMonsterHandler, SpawnMonsterControlHandler,
  KillMonsterHandler, MoveMonsterHandler, DamageMonsterHandler,
} from './PacketHandlers/SpawnMonsterHandler';
import { SpawnNpcHandler, RemoveNpcHandler } from './PacketHandlers/SpawnNpcHandler';
import { DropItemFromMapObjectHandler, RemoveItemFromMapHandler } from './PacketHandlers/DropItemHandler';

// Channel — multiplayer
import { SpawnPlayerHandler, RemovePlayerHandler, MovePlayerHandler } from './PacketHandlers/SpawnPlayerHandler';

// NPC
import { NpcTalkHandler, OpenNpcShopHandler } from './PacketHandlers/NpcHandlers';

// Map messages / status
import {
  ServerMessageHandler, ShowStatusInfoHandler, NotifyLevelUpHandler,
  ShowMonsterHpHandler, BuddyListHandler, RemoteAttackHandler,
  CooldownHandler, PartyOperationHandler, UpdatePartyMemberHpHandler,
} from './PacketHandlers/MapMessageHandlers';

// Critical gameplay
import {
  DamagePlayerHandler, UpdateCharLookHandler, InventoryGrowHandler,
  ApplyMonsterStatusHandler, CancelMonsterStatusHandler, MoveMonsterResponseHandler,
} from './PacketHandlers/CriticalHandlers';

// Flow
import {
  ConfirmShopTransactionHandler, ChannelSelectedHandler,
  RelogResponseHandler, KeymapHandler,
} from './PacketHandlers/FlowHandlers';

// Chat / quest
import {
  MultiChatHandler, WhisperHandler, ShowItemGainInChatHandler,
  CharInfoHandler, SetQuestClearHandler, SetQuestTimeHandler, UpdateQuestInfoHandler,
} from './PacketHandlers/ChatQuestHandlers';

// Misc
import {
  RecalculateStatsHandler, GatherResultHandler, SortResultHandler,
  WeekEventMessageHandler, SkillMacrosHandler, FieldEffectHandler,
  ScrollResultHandler, SpawnPetHandler, MovePetHandler,
  ShowForeignEffectHandler, HitReactorHandler, SpawnReactorHandler, RemoveReactorHandler,
} from './PacketHandlers/GameplayHandlers';
import {
  StorageHandler, PlayerInteractionHandler, FacialExpressionHandler,
  NpcActionHandler, ClockHandler, MinimapOnOffHandler, OpenUIHandler,
  SpawnMistHandler, SpawnDoorHandler, RemoveDoorHandler,
  UpdateCharBoxHandler, PlayerHintHandler, FameResponseHandler,
  SkillUseResultHandler, SpawnPortalHandler,
} from './PacketHandlers/MiscHandlers';

export class PacketHandlerRegistry {
  private static instance: PacketHandlerRegistry | null = null;
  private handlers: Map<InPacketOpcode, IPacketHandler> = new Map();

  private constructor() { this.registerHandlers(); }

  static getInstance(): PacketHandlerRegistry {
    if (!PacketHandlerRegistry.instance) {
      PacketHandlerRegistry.instance = new PacketHandlerRegistry();
    }
    return PacketHandlerRegistry.instance;
  }

  private registerHandlers(): void {
    // ── Login server ──────────────────────────────────────────────
    this.handlers.set(InPacketOpcode.LOGIN_STATUS,          new LoginStatusHandler());
    this.handlers.set(InPacketOpcode.GENDER_DONE,           new GenderDoneHandler());
    this.handlers.set(InPacketOpcode.ADD_NEW_CHAR_ENTRY,    new AddNewCharEntryHandler());
    this.handlers.set(InPacketOpcode.CHAR_NAME_RESPONSE,    new CharNameResponseHandler());
    this.handlers.set(InPacketOpcode.DELETE_CHAR_RESPONSE,  new DeleteCharResponseHandler());
    this.handlers.set(InPacketOpcode.SERVER_LIST,           new ServerListHandler());
    this.handlers.set(InPacketOpcode.CHARACTER_LIST,        new CharacterListHandler());
    this.handlers.set(InPacketOpcode.SERVER_IP,             new ServerIPHandler());
    this.handlers.set(InPacketOpcode.PING,                  new PingHandler());

    // ── Channel server — character state ─────────────────────────
    this.handlers.set(InPacketOpcode.SET_FIELD,             new SetFieldHandler());
    this.handlers.set(InPacketOpcode.STAT_CHANGED,          new StatChangedHandler());
    this.handlers.set(InPacketOpcode.INVENTORY_OPERATION,   new InventoryOperationHandler());
    this.handlers.set(InPacketOpcode.INVENTORY_GROW,        new InventoryGrowHandler());
    this.handlers.set(InPacketOpcode.GIVE_BUFF,             new GiveBuffHandler());
    this.handlers.set(InPacketOpcode.CANCEL_BUFF,           new CancelBuffHandler());
    this.handlers.set(InPacketOpcode.UPDATE_SKILLS,         new UpdateSkillsHandler());
    this.handlers.set(InPacketOpcode.DAMAGE_PLAYER,         new DamagePlayerHandler());
    this.handlers.set(InPacketOpcode.SKILL_USE_RESULT,      new SkillUseResultHandler());
    this.handlers.set(InPacketOpcode.FAME_RESPONSE,         new FameResponseHandler());
    this.handlers.set(InPacketOpcode.KEYMAP,                new KeymapHandler());
    this.handlers.set(InPacketOpcode.CHANNEL_SELECTED,      new ChannelSelectedHandler());
    this.handlers.set(InPacketOpcode.RELOG_RESPONSE,        new RelogResponseHandler());

    // ── Channel server — map entities ────────────────────────────
    this.handlers.set(InPacketOpcode.SPAWN_MONSTER,              new SpawnMonsterHandler());
    this.handlers.set(InPacketOpcode.SPAWN_MONSTER_CONTROL,      new SpawnMonsterControlHandler());
    this.handlers.set(InPacketOpcode.KILL_MONSTER,               new KillMonsterHandler());
    this.handlers.set(InPacketOpcode.MOVE_MONSTER,               new MoveMonsterHandler());
    this.handlers.set(InPacketOpcode.MOVE_MONSTER_RESPONSE,      new MoveMonsterResponseHandler());
    this.handlers.set(InPacketOpcode.DAMAGE_MONSTER,             new DamageMonsterHandler());
    this.handlers.set(InPacketOpcode.APPLY_MONSTER_STATUS,       new ApplyMonsterStatusHandler());
    this.handlers.set(InPacketOpcode.CANCEL_MONSTER_STATUS,      new CancelMonsterStatusHandler());
    this.handlers.set(InPacketOpcode.SPAWN_NPC,                  new SpawnNpcHandler());
    this.handlers.set(InPacketOpcode.REMOVE_NPC,                 new RemoveNpcHandler());
    this.handlers.set(InPacketOpcode.NPC_ACTION,                 new NpcActionHandler());
    this.handlers.set(InPacketOpcode.DROP_ITEM_FROM_MAPOBJECT,   new DropItemFromMapObjectHandler());
    this.handlers.set(InPacketOpcode.REMOVE_ITEM_FROM_MAP,       new RemoveItemFromMapHandler());
    this.handlers.set(InPacketOpcode.SPAWN_MIST,                 new SpawnMistHandler());
    this.handlers.set(InPacketOpcode.SPAWN_DOOR,                 new SpawnDoorHandler());
    this.handlers.set(InPacketOpcode.REMOVE_DOOR,                new RemoveDoorHandler());
    this.handlers.set(InPacketOpcode.SPAWN_PORTAL,               new SpawnPortalHandler());

    // ── Channel server — multiplayer ──────────────────────────────
    this.handlers.set(InPacketOpcode.SPAWN_PLAYER,               new SpawnPlayerHandler());
    this.handlers.set(InPacketOpcode.REMOVE_PLAYER_FROM_MAP,     new RemovePlayerHandler());
    this.handlers.set(InPacketOpcode.MOVE_PLAYER,                new MovePlayerHandler());
    this.handlers.set(InPacketOpcode.UPDATE_CHAR_LOOK,           new UpdateCharLookHandler());
    this.handlers.set(InPacketOpcode.FACIAL_EXPRESSION,          new FacialExpressionHandler());
    this.handlers.set(InPacketOpcode.UPDATE_CHAR_BOX,            new UpdateCharBoxHandler());

    // ── NPC / shop ────────────────────────────────────────────────
    this.handlers.set(InPacketOpcode.NPC_TALK,                   new NpcTalkHandler());
    this.handlers.set(InPacketOpcode.OPEN_NPC_SHOP,              new OpenNpcShopHandler());
    this.handlers.set(InPacketOpcode.CONFIRM_SHOP_TRANSACTION,   new ConfirmShopTransactionHandler());
    this.handlers.set(InPacketOpcode.STORAGE,                    new StorageHandler());
    this.handlers.set(InPacketOpcode.PLAYER_INTERACTION,         new PlayerInteractionHandler());

    // ── Map messages / UI ─────────────────────────────────────────
    this.handlers.set(InPacketOpcode.SERVERMESSAGE,              new ServerMessageHandler());
    this.handlers.set(InPacketOpcode.SHOW_STATUS_INFO,           new ShowStatusInfoHandler());
    this.handlers.set(InPacketOpcode.SHOW_ITEM_GAIN_INCHAT,      new ShowItemGainInChatHandler());
    this.handlers.set(InPacketOpcode.NOTIFY_LEVELUP,             new NotifyLevelUpHandler());
    this.handlers.set(InPacketOpcode.SHOW_MONSTER_HP,            new ShowMonsterHpHandler());
    this.handlers.set(InPacketOpcode.PLAYER_HINT,                new PlayerHintHandler());
    this.handlers.set(InPacketOpcode.OPEN_UI,                    new OpenUIHandler());
    this.handlers.set(InPacketOpcode.CLOCK,                      new ClockHandler());
    this.handlers.set(InPacketOpcode.MINIMAP_ON_OFF,             new MinimapOnOffHandler());

    // ── Chat ──────────────────────────────────────────────────────
    this.handlers.set(InPacketOpcode.CHATTEXT,                   new ChatTextHandler());
    this.handlers.set(InPacketOpcode.CHATTEXT1,                  new ChatTextHandler());
    this.handlers.set(InPacketOpcode.MULTICHAT,                  new MultiChatHandler());
    this.handlers.set(InPacketOpcode.WHISPER,                    new WhisperHandler());

    // ── Party / social ────────────────────────────────────────────
    this.handlers.set(InPacketOpcode.BUDDYLIST,                  new BuddyListHandler());
    this.handlers.set(InPacketOpcode.PARTY_OPERATION,            new PartyOperationHandler());
    this.handlers.set(InPacketOpcode.UPDATE_PARTYMEMBER_HP,      new UpdatePartyMemberHpHandler());
    this.handlers.set(InPacketOpcode.CHAR_INFO,                  new CharInfoHandler());

    // ── Quests ────────────────────────────────────────────────────
    this.handlers.set(InPacketOpcode.SET_QUEST_CLEAR,            new SetQuestClearHandler());
    this.handlers.set(InPacketOpcode.SET_QUEST_TIME,             new SetQuestTimeHandler());
    this.handlers.set(InPacketOpcode.UPDATE_QUEST_INFO,          new UpdateQuestInfoHandler());

    // ── Cooldowns / combat feedback ───────────────────────────────
    this.handlers.set(InPacketOpcode.COOLDOWN,                   new CooldownHandler());
    this.handlers.set(InPacketOpcode.CLOSE_RANGE_ATTACK,         new RemoteAttackHandler());
    this.handlers.set(InPacketOpcode.RANGED_ATTACK,              new RemoteAttackHandler());

    // Gameplay
    this.handlers.set(InPacketOpcode.RECALCULATE_STATS,  new RecalculateStatsHandler());
    this.handlers.set(InPacketOpcode.GATHER_RESULT,      new GatherResultHandler());
    this.handlers.set(InPacketOpcode.SORT_RESULT,        new SortResultHandler());
    this.handlers.set(InPacketOpcode.WEEK_EVENT_MESSAGE, new WeekEventMessageHandler());
    this.handlers.set(InPacketOpcode.SKILL_MACROS,       new SkillMacrosHandler());
    this.handlers.set(InPacketOpcode.FIELD_EFFECT,       new FieldEffectHandler());
    this.handlers.set(InPacketOpcode.SCROLL_RESULT,      new ScrollResultHandler());
    this.handlers.set(InPacketOpcode.SPAWN_PET,          new SpawnPetHandler());
    this.handlers.set(InPacketOpcode.MOVE_PET,           new MovePetHandler());
    this.handlers.set(InPacketOpcode.SHOW_FOREIGN_EFFECT,new ShowForeignEffectHandler());
    this.handlers.set(InPacketOpcode.HIT_REACTOR,        new HitReactorHandler());
    this.handlers.set(InPacketOpcode.SPAWN_REACTOR,      new SpawnReactorHandler());
    this.handlers.set(InPacketOpcode.REMOVE_REACTOR,     new RemoveReactorHandler());
  }

  getHandler(opcode: InPacketOpcode): IPacketHandler | undefined {
    return this.handlers.get(opcode);
  }
}
