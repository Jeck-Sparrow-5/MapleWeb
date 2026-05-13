import { OutPacket, OutPacketOpcode } from '../OutPacket';

interface Movement {
  x: number;
  y: number;
  vx: number;
  vy: number;
  newstate: number;
  duration: number;
  foothold: number;
}

export default class MovePlayerPacket extends OutPacket {
  constructor(portalCount: number, movements: Movement[]) {
    super(OutPacketOpcode.MOVE_PLAYER);

    this.writeByte(portalCount);
    this.writeInt(0); // unknown
    this.writeByte(movements.length);

    for (const mv of movements) {
      this.writeByte(0); // movement type = normal
      this.writeShort(mv.x);
      this.writeShort(mv.y);
      this.writeShort(mv.vx);
      this.writeShort(mv.vy);
      this.writeByte(mv.newstate);
      this.writeShort(mv.duration);
      this.writeShort(mv.foothold);
    }
  }
}
