import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class PickupItemPacket extends OutPacket {
  constructor(objectId: number) {
    super(OutPacketOpcode.PICKUP_ITEM);
    this.writeByte(0); // unknown
    this.writeInt(0);  // timestamp
    this.writeShort(0); // x (unused)
    this.writeShort(0); // y (unused)
    this.writeInt(objectId);
  }
}
