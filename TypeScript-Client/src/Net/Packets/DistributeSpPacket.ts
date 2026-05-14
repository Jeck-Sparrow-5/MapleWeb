import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class DistributeSpPacket extends OutPacket {
  constructor(skillId: number) {
    super(OutPacketOpcode.DISTRIBUTE_SP);
    this.writeInt(skillId);
  }
}
