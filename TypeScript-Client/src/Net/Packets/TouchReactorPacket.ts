import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class TouchReactorPacket extends OutPacket {
  constructor(reactorObjectId: number) {
    super(OutPacketOpcode.TOUCHING_REACTOR);
    this.writeInt(reactorObjectId);
  }
}
