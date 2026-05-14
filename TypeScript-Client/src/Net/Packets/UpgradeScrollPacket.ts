import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class UpgradeScrollPacket extends OutPacket {
  constructor(scrollSlot: number, equipSlot: number, whiteScroll = false) {
    super(OutPacketOpcode.USE_UPGRADE_SCROLL);
    this.writeShort(scrollSlot);  // scroll inventory slot
    this.writeShort(equipSlot);   // target equip slot (negative)
    this.writeShort(whiteScroll ? 1 : 0);
  }
}

export class UseSkillBookPacket extends OutPacket {
  constructor(itemSlot: number, itemId: number) {
    super(OutPacketOpcode.USE_SKILL_BOOK);
    this.writeInt(0); // timestamp
    this.writeShort(itemSlot);
    this.writeInt(itemId);
  }
}

export class CancelBuffPacket extends OutPacket {
  constructor(buffId: number) {
    super(OutPacketOpcode.CANCEL_BUFF_CLIENT);
    this.writeInt(buffId);
  }
}
