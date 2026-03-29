export interface IPacketHandler {
  handle(data: DataView): void;
}

export abstract class PacketHandler implements IPacketHandler {
  abstract handle(data: DataView): void;
}
