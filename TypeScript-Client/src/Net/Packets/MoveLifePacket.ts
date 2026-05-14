import { OutPacket, OutPacketOpcode } from '../OutPacket';

interface LifeMovement {
  x: number;
  y: number;
  vx: number;
  vy: number;
  newstate: number;
  duration: number;
  foothold: number;
}

export default class MoveLifePacket extends OutPacket {
  constructor(objectId: number, skillId: number, skillLevel: number, movements: LifeMovement[]) {
    super(OutPacketOpcode.MOVE_LIFE);
    this.writeInt(objectId);
    this.writeShort(0);        // movement flags
    this.writeByte(skillId > 0 ? skillId : 0xff);
    this.writeByte(skillLevel);
    this.writeShort(0);        // unk
    this.writeShort(0);        // unk HP
    this.writeByte(movements.length);
    for (const mv of movements) {
      this.writeByte(0);       // movement type = absolute
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
