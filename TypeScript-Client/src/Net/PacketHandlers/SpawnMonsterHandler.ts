import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MapleMap from '../../MapleMap';
import Monster from '../../Monster';

function readString(data: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return s;
}

export class SpawnMonsterHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const objectId = data.getInt32(offset, true); offset += 4;
    const controlType = data.getUint8(offset); offset += 1;
    const mobId = data.getInt32(offset, true); offset += 4;
    offset += 2; // some flags
    const x = data.getInt16(offset, true); offset += 2;
    const y = data.getInt16(offset, true); offset += 2;
    const stance = data.getUint8(offset); offset += 1;
    const foothold = data.getInt16(offset, true); offset += 2;
    offset += 2; // origin foothold
    const effect = data.getInt8(offset); offset += 1;
    if (effect > 0) offset += 2; // effect delay

    // Check not already spawned
    if (MapleMap.monsters?.some((m: any) => m.oId === objectId)) return;

    try {
      const mob = await Monster.fromOpts({
        id: mobId,
        oId: objectId,
        x,
        y,
        foothold,
        isMovementEnabled: controlType > 0,
        map: MapleMap,
      });
      MapleMap.monsters.push(mob);
    } catch (e) {
      console.warn('[SpawnMonster] failed to spawn mob', mobId, e);
    }
  }
}

export class SpawnMonsterControlHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const controlType = data.getUint8(offset); offset += 1;
    if (controlType === 0) return; // loss of control

    const objectId = data.getInt32(offset, true); offset += 4;
    offset += 1; // flags
    const mobId = data.getInt32(offset, true); offset += 4;
    offset += 2;
    const x = data.getInt16(offset, true); offset += 2;
    const y = data.getInt16(offset, true); offset += 2;
    const stance = data.getUint8(offset); offset += 1;
    const foothold = data.getInt16(offset, true); offset += 2;
    offset += 2 + 1;

    if (MapleMap.monsters?.some((m: any) => m.oId === objectId)) return;

    try {
      const mob = await Monster.fromOpts({
        id: mobId, oId: objectId, x, y, foothold,
        isMovementEnabled: true, map: MapleMap,
      });
      MapleMap.monsters.push(mob);
    } catch (e) {
      console.warn('[SpawnMonsterControl] failed', mobId, e);
    }
  }
}

export class KillMonsterHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true);

    if (!MapleMap.monsters) return;
    const idx = MapleMap.monsters.findIndex((m: any) => m.oId === objectId);
    if (idx >= 0) {
      const mob = MapleMap.monsters[idx] as any;
      mob.dying = true;
      setTimeout(() => { MapleMap.monsters.splice(idx, 1); }, 1000);
    }
  }
}

export class MoveMonsterHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    offset += 2 + 1 + 4 + 2 + 2; // flags, skill data
    // movement data: series of (type, x, y, foothold, ...)
    const movesCount = data.getUint8(offset); offset += 1;
    if (!movesCount) return;

    const mob = MapleMap.monsters?.find((m: any) => m.oId === objectId) as any;
    if (!mob) return;

    // Read last movement entry for final position
    for (let i = 0; i < movesCount; i++) {
      const moveType = data.getUint8(offset); offset += 1;
      const x = data.getInt16(offset, true); offset += 2;
      const y = data.getInt16(offset, true); offset += 2;
      offset += 2 + 2 + 1 + 2 + 1; // vx, vy, newstate, duration, fh
      if (i === movesCount - 1) {
        mob.x = x;
        mob.y = y;
        if (mob.pos) { mob.pos.x = x; mob.pos.y = y; }
      }
    }
  }
}

export class DamageMonsterHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    offset += 1; // damage type
    const damage = data.getInt32(offset, true); offset += 4;

    const mob = MapleMap.monsters?.find((m: any) => m.oId === objectId) as any;
    if (mob) {
      mob.hp = Math.max(0, mob.hp - damage);
      if (mob.hp <= 0) { mob.dying = true; }
    }
  }
}
