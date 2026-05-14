import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class DistributeApPacket extends OutPacket {
  constructor(statType: 'str' | 'dex' | 'int' | 'luk') {
    super(OutPacketOpcode.DISTRIBUTE_AP);
    // Cosmic DistributeApHandler reads: int statType
    // 64=str, 128=dex, 256=int, 512=luk (standard v83 stat type constants)
    const typeMap: Record<string, number> = { str: 64, dex: 128, int: 256, luk: 512 };
    this.writeInt(typeMap[statType]);
  }
}
