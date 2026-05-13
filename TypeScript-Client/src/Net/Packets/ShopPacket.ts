import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class ShopBuyPacket extends OutPacket {
  constructor(itemSlot: number, itemId: number, quantity: number) {
    super(OutPacketOpcode.NPC_SHOP);
    this.writeByte(0); // buy
    this.writeShort(itemSlot);
    this.writeInt(itemId);
    this.writeShort(quantity);
  }
}

export class ShopSellPacket extends OutPacket {
  constructor(inventorySlot: number, itemId: number, quantity: number) {
    super(OutPacketOpcode.NPC_SHOP);
    this.writeByte(1); // sell
    this.writeShort(inventorySlot);
    this.writeInt(itemId);
    this.writeShort(quantity);
  }
}
