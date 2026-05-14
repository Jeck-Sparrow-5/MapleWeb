/**
 * New gameplay packet handlers:
 * RecalculateStats (35), GatherResult (52), SortResult (53),
 * WeekEventMessage (77), SkillMacros (124), FieldEffect (138),
 * ScrollResult (167), SpawnPet (168), MovePet (170),
 * ShowForeignEffect (198), HitReactor (277), SpawnReactor (279), RemoveReactor (280)
 */
import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import MapleMap from '../../MapleMap';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import UIMap from '../../UI/UIMap';
import { showSkillEffect } from '../../UI/SkillEffectRenderer';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

// opcode 35 — server tells client to recalculate all stats
export class RecalculateStatsHandler extends PacketHandler {
  handle(_data: DataView): void {
    // Stats are authoritative from server via STAT_CHANGED; nothing needed client-side
    // Trigger a visual refresh if needed
  }
}

// opcode 52 — inventory gather result
export class GatherResultHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const result = data.getUint8(offset);
    if (result === 0) {
      UIStatusMessenger.show('Items gathered', '#88FF88');
    } else {
      UIStatusMessenger.show('Gather failed — inventory full?', '#FF8888');
    }
  }
}

// opcode 53 — inventory sort result
export class SortResultHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const result = data.getUint8(offset);
    UIStatusMessenger.show(result === 0 ? 'Items sorted' : 'Sort failed', result === 0 ? '#88FF88' : '#FF8888');
  }
}

// opcode 77 — weekly event message
export class WeekEventMessageHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const { str } = readString(data, offset);
    if (str) UIStatusMessenger.show(str, '#FFEE88');
  }
}

// opcode 124 — skill macros (load saved skill macro assignments)
export class SkillMacrosHandler extends PacketHandler {
  handle(data: DataView): void {
    // Skill macros not rendered in UI yet — acknowledge silently
  }
}

// opcode 138 — field effect (ambient sound/visual for map entry)
export class FieldEffectHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getUint8(offset); offset += 1;
    if (type === 1) {
      // Sound effect
      const { str: sound } = readString(data, offset);
      console.log('[FieldEffect] sound:', sound);
    } else if (type === 3) {
      // Object effect (screen flash etc.)
    }
  }
}

// opcode 167 — scroll/enchant result
export class ScrollResultHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const scrollSlot = data.getInt16(offset, true); offset += 2;
    const equipSlot  = data.getInt16(offset, true); offset += 2;
    const success = data.getUint8(offset); offset += 1;
    const curseResult = data.getUint8(offset);

    const msgs: Record<number, [string, string]> = {
      1: ['Scroll succeeded!', '#88FF88'],
      2: ['Scroll failed', '#FF8888'],
      3: ['Item destroyed by scroll', '#FF4444'],
    };
    const [msg, color] = msgs[success] ?? ['Scroll applied', '#FFFFFF'];
    UIStatusMessenger.show(msg, color);
    UIMap.addChatMessage(`[System] ${msg}`, color);
  }
}

// opcode 168 — spawn pet
export class SpawnPetHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const petIndex = data.getUint8(offset); offset += 1;
    const petId    = data.getInt32(offset, true); offset += 4;
    const x        = data.getInt16(offset, true); offset += 2;
    const y        = data.getInt16(offset, true); offset += 2;

    // Store pet info on character
    const char = charId === MyCharacter.id
      ? MyCharacter as any
      : MapleMap.characters?.find((c: any) => c.id === charId) as any;
    if (!char) return;
    if (!char.pets) char.pets = [];
    char.pets[petIndex] = { petId, x, y, visible: true };
  }
}

// opcode 170 — move pet
export class MovePetHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId   = data.getInt32(offset, true); offset += 4;
    const petIndex = data.getUint8(offset); offset += 1;
    offset += 4; // unknown
    const movesCount = data.getUint8(offset); offset += 1;

    const char = charId === MyCharacter.id
      ? MyCharacter as any
      : MapleMap.characters?.find((c: any) => c.id === charId) as any;
    if (!char?.pets?.[petIndex]) return;

    for (let i = 0; i < movesCount; i++) {
      offset += 1; // move type
      const x = data.getInt16(offset, true); offset += 2;
      const y = data.getInt16(offset, true); offset += 2;
      offset += 2 + 2 + 1 + 2 + 1;
      if (i === movesCount - 1) {
        char.pets[petIndex].x = x;
        char.pets[petIndex].y = y;
      }
    }
  }
}

// opcode 198 — show foreign (other player) skill/item effect
export class ShowForeignEffectHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const type   = data.getUint8(offset); offset += 1;

    const char = MapleMap.characters?.find((c: any) => c.id === charId) as any;
    if (!char?.pos) return;

    if (type === 2) {
      // Skill effect
      const skillId = data.getInt32(offset, true);
      showSkillEffect(char.pos.x, char.pos.y - 40, skillId);
    } else if (type === 4) {
      // Item effect — show a brief flash
      showSkillEffect(char.pos.x, char.pos.y - 40, 0);
    }
  }
}

// opcode 277 — reactor was hit (client-controlled: animate hit frame)
export class HitReactorHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    const state    = data.getUint8(offset); offset += 1;

    const reactor = MapleMap.reactors?.find((r: any) => r.oId === objectId) as any;
    if (reactor) {
      reactor.frame = 0; // restart animation
      reactor.delay = 0;
    }
  }
}

// opcode 279 — server spawns reactor on map
export class SpawnReactorHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId  = data.getInt32(offset, true); offset += 4;
    const reactorId = data.getInt32(offset, true); offset += 4;
    const state     = data.getUint8(offset); offset += 1;
    const x         = data.getInt16(offset, true); offset += 2;
    const y         = data.getInt16(offset, true); offset += 2;
    const flipped   = data.getUint8(offset) === 1;

    if (MapleMap.reactors?.some((r: any) => r.oId === objectId)) return;

    let frames: any[] = [];
    try {
      const strId = `${reactorId}`.padStart(7, '0');
      const wzR = await (await import('../../wz-utils/WZManager')).default.get(`Reactor.wz/${strId}.img`);
      const state0 = wzR?.nGet('0');
      if (state0?.nChildren) {
        frames = state0.nChildren.map((f: any) => ({
          img: f.nGetImage?.(),
          ox: f.origin?.nX ?? 0,
          oy: f.origin?.nY ?? 0,
          delay: parseInt(f.delay?.nValue ?? '100'),
        })).filter((f: any) => f.img);
      }
    } catch (_) {}

    MapleMap.reactors.push({
      id: reactorId, oId: objectId, name: '',
      x, y, activated: false, flipped,
      frames, frame: 0, delay: 0,
    });
  }
}

// opcode 280 — server removes reactor from map
export class RemoveReactorHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true);
    if (MapleMap.reactors) {
      const idx = MapleMap.reactors.findIndex((r: any) => r.oId === objectId);
      if (idx >= 0) MapleMap.reactors.splice(idx, 1);
    }
  }
}
