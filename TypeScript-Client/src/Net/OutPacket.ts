import SessionManager from '../SessionManager';

export enum OutPacketOpcode {
  // Auth / login server
  LOGIN             = 1,    // 0x01
  ACCEPT_TOS        = 7,    // 0x07
  SET_GENDER        = 8,    // 0x08
  CHECK_CHAR_NAME   = 21,   // 0x15
  CREATE_CHARACTER  = 22,   // 0x16
  DELETE_CHAR       = 23,   // 0x17
  SELECT_CHARACTER  = 19,   // 0x13
  SELECT_CHAR_PIC   = 30,   // 0x1E — was 24 (collided with PONG)
  REGISTER_PIC      = 29,   // 0x1D
  CHARACTER_LIST_REQUEST = 5, // 0x05
  SERVER_LIST_REQUEST = 11,   // 0x0B
  PLAYER_LOGIN      = 20,   // 0x14
  PONG              = 24,   // 0x18

  // Movement / map
  MOVE_PLAYER       = 41,   // 0x29
  CHANGE_MAP        = 38,   // 0x26
  CHANGE_CHANNEL    = 39,   // 0x27

  // Combat
  ATTACK_CLOSE      = 44,   // 0x2C
  ATTACK_RANGED     = 45,   // 0x2D
  ATTACK_MAGIC      = 46,   // 0x2E

  // Skills
  USE_SKILL         = 91,   // 0x5B

  // Items
  ITEM_MOVE         = 71,   // 0x47 — equip, unequip, move in inventory
  EQUIP_ITEM        = 71,   // alias
  UNEQUIP_ITEM      = 71,   // alias (same opcode, different slot params)
  USE_ITEM          = 72,   // 0x48 — was 44 (collided with ATTACK_CLOSE)
  DROP_ITEM         = 90,   // 0x5A
  PICKUP_ITEM       = 202,  // 0xCA — was 110

  // Chat
  CHATTEXT_SEND     = 49,   // 0x31
  WHISPER           = 115,  // 0x73

  // NPC / shop
  NPC_TALK          = 58,   // 0x3A
  NPC_TALK_MORE     = 60,   // 0x3C — was 59
  NPC_SHOP          = 61,   // 0x3D — was 62
  NPC_SHOP_CLOSE    = 63,   // 0x3F
  STORAGE           = 62,   // 0x3E

  // Social
  ADD_BUDDY         = 130,  // 0x82 — was 38 (collided with CHANGE_MAP)
  GIVE_FAME         = 95,   // 0x5F

  // Stats / skills
  DISTRIBUTE_AP     = 87,   // 0x57
  DISTRIBUTE_SP     = 89,   // 0x59

  // World interaction
  TOUCH_REACTOR     = 168,  // 0xA8 — activate reactor
  CHAR_INFO_REQUEST = 97,   // 0x61 — request another player's info
}

export class OutPacket {
  private buffer: number[] = [];
  private readonly opcode: OutPacketOpcode;

  constructor(opcode: OutPacketOpcode) {
    this.opcode = opcode;
    this.writeShort(this.opcode);
  }

  dispatch(): any {
    SessionManager.sendMessage(this.getBytes());
  }

  protected writeShort(value: number): void {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
  }

  protected writeByte(value: number): void {
    this.buffer.push(value & 0xFF);
  }

  protected writeInt(value: number): void {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    this.buffer.push((value >> 24) & 0xFF);
  }

  protected writeString(str: string): void {
    this.writeShort(str.length);
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
  }

  protected skip(bytes: number): void {
    for (let i = 0; i < bytes; i++) {
      this.buffer.push(0);
    }
  }

  protected hexToDec(hex: string): number {
    return parseInt(hex, 16);
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  public getBuffer(): ArrayBuffer {
    return this.getBytes().buffer;
  }
}
