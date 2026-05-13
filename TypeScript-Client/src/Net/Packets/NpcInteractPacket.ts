import { OutPacket, OutPacketOpcode } from '../OutPacket';

export class NpcTalkPacket extends OutPacket {
  constructor(npcObjectId: number) {
    super(OutPacketOpcode.NPC_TALK);
    this.writeInt(npcObjectId);
  }
}

export class NpcTalkMorePacket extends OutPacket {
  constructor(type: number, selection: number) {
    super(OutPacketOpcode.NPC_TALK_MORE);
    this.writeByte(type);
    this.writeByte(selection);
  }
}
