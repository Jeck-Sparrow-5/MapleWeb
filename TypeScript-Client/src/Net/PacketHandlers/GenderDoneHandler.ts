import { PacketHandler } from '../PacketHandler';
import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class GenderDoneHandler extends PacketHandler {
  handle(_data: DataView): void {
    new OutPacket(OutPacketOpcode.SERVER_LIST_REQUEST).dispatch();
  }
}
