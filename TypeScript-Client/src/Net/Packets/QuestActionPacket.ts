import { OutPacket, OutPacketOpcode } from '../OutPacket';

// Quest action types (sent when starting/completing quests outside NPC talk flow)
export const enum QuestAction {
  START    = 1,
  COMPLETE = 2,
  FORFEIT  = 3,
}

export default class QuestActionPacket extends OutPacket {
  constructor(action: QuestAction, questId: number, npcId = 0) {
    super(OutPacketOpcode.QUEST_ACTION);
    this.writeByte(action);
    this.writeShort(questId);
    this.writeInt(npcId);
  }
}
