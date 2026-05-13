import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class UseItemPacket extends OutPacket {
  constructor(inventorySlot: number, itemId: number) {
    super(OutPacketOpcode.USE_ITEM);
    this.writeInt(0); // timestamp
    this.writeShort(inventorySlot);
    this.writeInt(itemId);
  }
}

export class EquipItemPacket extends OutPacket {
  constructor(fromSlot: number, toSlot: number) {
    super(OutPacketOpcode.EQUIP_ITEM);
    this.writeShort(fromSlot);  // source slot in equip inventory
    this.writeShort(toSlot);    // destination equip slot (negative = body slot)
  }
}

export class UnequipItemPacket extends OutPacket {
  constructor(fromSlot: number, toSlot: number) {
    super(OutPacketOpcode.UNEQUIP_ITEM);
    this.writeShort(fromSlot);
    this.writeShort(toSlot);
  }
}

export class DropItemPacket extends OutPacket {
  constructor(inventoryType: number, slot: number, itemId: number, quantity: number) {
    super(OutPacketOpcode.DROP_ITEM);
    this.writeByte(inventoryType);
    this.writeShort(slot);
    this.writeShort(quantity);
    this.writeInt(itemId);
    this.writeInt(0); // x
    this.writeInt(0); // y
  }
}
