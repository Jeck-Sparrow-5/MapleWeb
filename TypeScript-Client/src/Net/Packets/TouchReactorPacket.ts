import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class TouchReactorPacket extends OutPacket {
  constructor(reactorObjectId: number) {
    super(OutPacketOpcode.TOUCH_REACTOR);
    this.writeInt(reactorObjectId);
  }
}
