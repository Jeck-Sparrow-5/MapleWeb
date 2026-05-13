/**
 * Handlers for critical gameplay packets not yet implemented:
 * DAMAGE_PLAYER (192), UPDATE_CHAR_LOOK (197), INVENTORY_GROW (30),
 * APPLY_MONSTER_STATUS (242), CANCEL_MONSTER_STATUS (243),
 * MOVE_MONSTER_RESPONSE (240)
 */
import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import MapleMap from '../../MapleMap';
import UIStatusMessenger from '../../UI/UIStatusMessenger';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

// opcode 192 — player takes damage from mob/map hazard
export class DamagePlayerHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getInt8(offset); offset += 1; // -1=mob, -2=map, etc.
    const damage = data.getInt32(offset, true); offset += 4;

    if (damage > 0) {
      MyCharacter.hp = Math.max(0, MyCharacter.hp - damage);
      // Trigger hit animation if available
      if (typeof (MyCharacter as any).setAlert === 'function') {
        (MyCharacter as any).setAlert();
      }
    }
  }
}

// opcode 197 — another player's look changed (equipped/unequipped item)
export class UpdateCharLookHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    offset += 1; // unknown flag

    const gender   = data.getUint8(offset); offset += 1;
    const skinColor= data.getUint8(offset); offset += 1;
    const face     = data.getInt32(offset, true); offset += 4;
    const mega     = data.getUint8(offset); offset += 1;
    const hair     = data.getInt32(offset, true); offset += 4;

    const char = MapleMap.characters?.find((c: any) => c.id === charId) as any;
    if (!char) return;
    char.face = face;
    char.Hair = hair;
    char.skinColor = skinColor;
    char.gender = gender;
    // Re-load character appearance asynchronously
    try { char.load?.(); } catch (_) {}
  }
}

// opcode 30 — inventory tab grew (more slots)
export class InventoryGrowHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const invType = data.getUint8(offset); offset += 1;
    const newSlots = data.getUint8(offset);
    UIStatusMessenger.show(`Inventory expanded to ${newSlots} slots`, '#AADDFF');
  }
}

// opcode 242 — mob gains a status effect (stun, freeze, etc.)
export class ApplyMonsterStatusHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    offset += 4; // stat mask hi
    const statMask = data.getInt32(offset, true); offset += 4;

    const mob = MapleMap.monsters?.find((m: any) => m.oId === objectId) as any;
    if (!mob) return;
    // Mark mob as stunned/frozen for visual indicator
    mob.statusMask = (mob.statusMask ?? 0) | statMask;
    mob.statusExpiry = Date.now() + 5000; // approximate 5s duration
  }
}

// opcode 243 — mob status effect removed
export class CancelMonsterStatusHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    const statMask = data.getInt32(offset, true);

    const mob = MapleMap.monsters?.find((m: any) => m.oId === objectId) as any;
    if (mob) mob.statusMask = (mob.statusMask ?? 0) & ~statMask;
  }
}

// opcode 240 — server acks mob movement (we just send an empty response)
export class MoveMonsterResponseHandler extends PacketHandler {
  handle(_data: DataView): void {
    // No client action needed; server just confirms our mob control
  }
}
