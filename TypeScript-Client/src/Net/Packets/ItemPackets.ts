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
  // Drop = ITEM_MOVE with destination slot 0 (floor). Quantity for stackables only.
  constructor(inventoryType: number, slot: number, _itemId: number, quantity: number) {
    super(OutPacketOpcode.ITEM_MOVE);
    this.writeByte(inventoryType);
    this.writeShort(slot);
    this.writeShort(0);        // destination 0 = drop to map
    this.writeShort(quantity);
  }
}

export class ItemSortPacket extends OutPacket {
  constructor(inventoryType: number) {
    super(OutPacketOpcode.ITEM_SORT);
    this.writeByte(inventoryType);
  }
}
