import { PacketHandler } from '../PacketHandler';
import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class PingHandler extends PacketHandler {
  handle(data: DataView): void {
    new OutPacket(OutPacketOpcode.PONG).dispatch();
  }
}
