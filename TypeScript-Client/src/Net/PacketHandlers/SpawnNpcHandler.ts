import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MapleMap from '../../MapleMap';
import NPC from '../../NPC';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let str = '';
  for (let i = 0; i < len; i++) str += String.fromCharCode(data.getUint8(offset + i));
  return { str, offset: offset + len };
}

export class SpawnNpcHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const objectId = data.getInt32(offset, true); offset += 4;
    const npcId = data.getInt32(offset, true); offset += 4;
    const x = data.getInt16(offset, true); offset += 2;
    const cy = data.getInt16(offset, true); offset += 2;
    const flipped = data.getUint8(offset) === 1; offset += 1;
    const fh = data.getInt16(offset, true); offset += 2;
    const rx0 = data.getInt16(offset, true); offset += 2;
    const rx1 = data.getInt16(offset, true); offset += 2;

    if (MapleMap.npcs?.some((n: any) => n.oId === objectId)) return;

    try {
      const npc = await NPC.fromOpts({ id: npcId, oId: objectId, x, cy, flipped, fh, rx0, rx1 });
      MapleMap.npcs.push(npc);
    } catch (e) {
      console.warn('[SpawnNpc] failed to spawn npc', npcId, e);
    }
  }
}

export class RemoveNpcHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true);
    if (!MapleMap.npcs) return;
    const idx = MapleMap.npcs.findIndex((n: any) => n.oId === objectId);
    if (idx >= 0) MapleMap.npcs.splice(idx, 1);
  }
}
