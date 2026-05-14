import { OutPacket, OutPacketOpcode } from '../OutPacket';

export const enum PartyOp {
  CREATE   = 1,
  LEAVE    = 2,
  JOIN     = 3,
  INVITE   = 4,
  EXPEL    = 5,
  CHANGE_LEADER = 6,
}

export class PartyOperationPacket extends OutPacket {
  constructor(op: PartyOp, targetCharId = 0) {
    super(OutPacketOpcode.PARTY_OPERATION);
    this.writeByte(op);
    if (targetCharId) this.writeInt(targetCharId);
  }
}

export class DenyPartyRequestPacket extends OutPacket {
  constructor(leaderName: string) {
    super(OutPacketOpcode.DENY_PARTY_REQUEST);
    this.writeString(leaderName);
  }
}
