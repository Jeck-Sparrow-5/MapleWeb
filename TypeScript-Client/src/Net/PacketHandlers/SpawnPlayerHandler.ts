import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MapleMap from '../../MapleMap';
import MapleCharacter from '../../MapleCharacter';
import Stats from '../../Stats/Stats';
import Inventory from '../../Inventory/Inventory';
import { JobsMainType } from '../../Constants/Jobs';

function readString(data: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return s;
}

export class SpawnPlayerHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const charId = data.getInt32(offset, true); offset += 4;
    const nameLen = data.getUint16(offset, true); offset += 2;
    const name = readString(data, offset, nameLen); offset += nameLen;
    // skip guild info
    const guildLen = data.getUint16(offset, true); offset += 2;
    offset += guildLen;
    offset += 6; // guild logo bytes

    const level = data.getUint8(offset); offset += 1;
    const job = data.getInt16(offset, true); offset += 2;
    const gender = data.getUint8(offset); offset += 1;
    const skinColor = data.getUint8(offset); offset += 1;
    const face = data.getInt32(offset, true); offset += 4;
    const hair = data.getInt32(offset, true); offset += 4;

    const x = data.getInt16(offset, true); offset += 2;
    const y = data.getInt16(offset, true); offset += 2;
    const stance = data.getUint8(offset); offset += 1;
    const fh = data.getInt16(offset, true); offset += 2;

    // Don't re-add if already in map
    if (MapleMap.characters?.some((c: any) => c.id === charId)) return;

    try {
      const char = new MapleCharacter({
        name,
        hp: 100, maxHp: 100, mp: 100, maxMp: 100,
        exp: 0, fame: 0,
        Hair: hair,
        inventory: new Inventory({}),
        stats: new Stats({ level, job: JobsMainType.Begginer, jobType: 'Begginer', str: 0, dex: 0, int: 0, luk: 0, maxHp: 100, maxMp: 100 }),
      });
      char.id = charId;
      char.gender = gender;
      char.face = face;
      char.Hair = hair;
      try { await char.load(); } catch (_) {}
      char.pos = char.pos ?? { x, y } as any;
      if (char.pos) { char.pos.x = x; char.pos.y = y; }
      MapleMap.characters.push(char);
    } catch (e) {
      console.warn('[SpawnPlayer] failed', charId, e);
    }
  }
}

export class RemovePlayerHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true);
    if (!MapleMap.characters) return;
    const idx = MapleMap.characters.findIndex((c: any) => c.id === charId);
    if (idx >= 0) MapleMap.characters.splice(idx, 1);
  }
}

export class MovePlayerHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    offset += 4; // portal count + unknown

    const movesCount = data.getUint8(offset); offset += 1;
    if (!movesCount) return;

    const char = MapleMap.characters?.find((c: any) => c.id === charId) as any;
    if (!char) return;

    for (let i = 0; i < movesCount; i++) {
      const moveType = data.getUint8(offset); offset += 1;
      const x = data.getInt16(offset, true); offset += 2;
      const y = data.getInt16(offset, true); offset += 2;
      offset += 2 + 2 + 1 + 2 + 1;
      if (i === movesCount - 1) {
        if (char.pos) { char.pos.x = x; char.pos.y = y; }
        else char.x = x, char.y = y;
      }
    }
  }
}
