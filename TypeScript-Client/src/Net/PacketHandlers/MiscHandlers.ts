/**
 * Miscellaneous handlers:
 * STORAGE (309), PLAYER_INTERACTION (314), FACIAL_EXPRESSION (193),
 * NPC_ACTION (260), CLOCK (147), MINIMAP_ON_OFF (86), OPEN_UI (220),
 * SPAWN_MIST (273), SPAWN_DOOR (275), REMOVE_DOOR (276),
 * UPDATE_CHAR_BOX (165), PLAYER_HINT (214), FAME_RESPONSE (38),
 * SKILL_USE_RESULT (37), SPAWN_PORTAL (67)
 */
import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import UIMap from '../../UI/UIMap';
import UIClock from '../../UI/UIClock';
import MapleMap from '../../MapleMap';
import MyCharacter from '../../MyCharacter';
import { getItemIconSync } from '../../wz-utils/ItemIconLoader';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

// opcode 309 — storage NPC opens
export class StorageHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const npcId  = data.getInt32(offset, true); offset += 4;
    const slots  = data.getUint8(offset); offset += 1;
    offset += 2; // inv type mask
    const mesos  = data.getInt32(offset, true); offset += 4;
    const count  = data.getUint8(offset); offset += 1;

    const items: any[] = [];
    for (let i = 0; i < count; i++) {
      const invType = data.getUint8(offset); offset += 1;
      const slot    = data.getInt8(offset); offset += 1;
      const itemId  = data.getInt32(offset, true); offset += 4;
      const isCash  = data.getUint8(offset); offset += 1;
      if (isCash) offset += 8; // cash item unique id
      offset += 8; // expiry
      if (invType === 1) {
        offset += 35; // equip stats
      } else {
        const qty = data.getInt16(offset, true); offset += 2;
        offset += 2; // flags
        items.push({ itemId, quantity: qty, slot });
      }
    }

    const canvas = document.getElementById('game') as any;
    const { default: UIStorage } = await import('../../UI/UIStorage');
    await UIStorage.open(canvas, mesos, slots, items);
  }
}

// opcode 314 — player interaction (trade, minigame, etc.)
export class PlayerInteractionHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const command = data.getUint8(offset); offset += 1;
    const UITrade = (window as any).UITrade;
    switch (command) {
      case 2: { // room created / entered
        const { str: partnerName } = readString(data, offset);
        if (UITrade) UITrade.open(partnerName);
        break;
      }
      case 3: { // trade invite received
        const { str: inviter } = readString(data, offset);
        UIStatusMessenger.show(`${inviter} wants to trade. Accept? (open Trade window)`, '#FFDD88');
        if (UITrade) UITrade.open(inviter);
        break;
      }
      case 0x0B: { // item added by partner
        const slotIdx = data.getUint8(offset); offset += 1;
        const itemId  = data.getInt32(offset, true); offset += 4;
        const qty     = data.getInt16(offset, true);
        if (UITrade) UITrade.partnerSlots[slotIdx] = { itemId, quantity: qty };
        break;
      }
      case 0x0D: { // mesos set by partner
        const mesos = data.getInt32(offset, true);
        if (UITrade) UITrade.partnerMesos = mesos;
        break;
      }
      case 0x0F: { // partner confirmed
        if (UITrade) UITrade.partnerConfirmed = true;
        UIStatusMessenger.show('Trade partner confirmed!', '#AAFFAA');
        break;
      }
      case 0x10: { // trade complete
        if (UITrade) UITrade.close();
        UIStatusMessenger.show('Trade completed!', '#AAFFAA');
        break;
      }
      case 0x11: { // trade cancelled
        if (UITrade) UITrade.close();
        UIStatusMessenger.show('Trade cancelled.', '#FF8888');
        break;
      }
    }
  }
}

// opcode 193 — facial expression of another character
export class FacialExpressionHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const face   = data.getInt32(offset, true);
    const char = MapleMap.characters?.find((c: any) => c.id === charId) as any;
    if (char && char.setFaceExpression) char.setFaceExpression(face);
  }
}

// opcode 260 — NPC action (server-driven animation)
export class NpcActionHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    const move     = data.getUint8(offset); offset += 1;
    if (move === 1) {
      offset += 2 + 2; // x, y
      const flipped = data.getUint8(offset) === 1;
      const npc = MapleMap.npcs?.find((n: any) => n.oId === objectId) as any;
      if (npc) npc.flipped = flipped;
    }
  }
}

// opcode 147 — in-game clock
export class ClockHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getUint8(offset); offset += 1;
    if (type === 1) {
      const seconds = data.getInt32(offset, true);
      UIClock.setCountdown(seconds);
    } else {
      const h = data.getUint8(offset); offset += 1;
      const m = data.getUint8(offset); offset += 1;
      const s = data.getUint8(offset);
      UIClock.setRealTime(h, m, s);
    }
  }
}

// opcode 86 — minimap force on/off
export class MinimapOnOffHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const on = data.getUint8(offset) === 1;
    const miniMap = (window as any).MapStateInstance?.miniMap;
    if (miniMap) miniMap.initialized = on;
  }
}

// opcode 220 — server opens a UI element
export class OpenUIHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const uiType = data.getUint8(offset);
    // 0=equipment, 1=stat, 4=quest, etc. — show status message for now
    const names: Record<number, string> = {
      0: 'Equipment', 1: 'Stats', 4: 'Quests', 5: 'Worldmap',
    };
    if (names[uiType]) UIStatusMessenger.show(`Opening ${names[uiType]}`, '#AAAAFF');
  }
}

// opcode 273 — spawn mist (poison cloud, smoke)
export class SpawnMistHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    const type     = data.getUint8(offset); offset += 1;
    const skillId  = data.getInt32(offset, true); offset += 4;
    const level    = data.getInt32(offset, true); offset += 4;
    const l        = data.getInt16(offset, true); offset += 2;
    const r        = data.getInt16(offset, true); offset += 2;
    const t        = data.getInt16(offset, true); offset += 2;
    const b        = data.getInt16(offset, true);

    // Store mist for rendering (simple colored rect)
    if (!MapleMap.mists) (MapleMap as any).mists = [];
    (MapleMap as any).mists.push({
      id: objectId, type, skillId,
      rect: { l, r, t, b },
      expiry: Date.now() + 30000,
    });
  }
}

// opcode 275 — spawn mystic door
export class SpawnDoorHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const ownerId = data.getInt32(offset, true); offset += 4;
    const townX   = data.getInt16(offset, true); offset += 2;
    const townY   = data.getInt16(offset, true); offset += 2;
    const x       = data.getInt16(offset, true); offset += 2;
    const y       = data.getInt16(offset, true);

    if (!MapleMap.doors) (MapleMap as any).doors = [];
    (MapleMap as any).doors.push({ ownerId, x, y, townX, townY });
    UIStatusMessenger.show('Mystic Door appeared', '#AAAAFF');
  }
}

// opcode 276 — remove mystic door
export class RemoveDoorHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const ownerId = data.getInt32(offset, true);
    if (MapleMap.doors) {
      (MapleMap as any).doors = (MapleMap as any).doors.filter((d: any) => d.ownerId !== ownerId);
    }
  }
}

// opcode 165 — update character box (party HP display name)
export class UpdateCharBoxHandler extends PacketHandler {
  handle(data: DataView): void {
    // Party HP bar names update — handled by PARTY_OPERATION already
  }
}

// opcode 214 — player hint message
export class PlayerHintHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const { str: hint } = readString(data, offset);
    if (hint) UIStatusMessenger.show(hint, '#FFEE88');
  }
}

// opcode 38 — fame response
export class FameResponseHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const result = data.getUint8(offset); offset += 1;
    const msgs: Record<number, [string, string]> = {
      0: ['Fame given', '#88FF88'],
      1: ['Already famed today', '#FF8888'],
      2: ['Cannot fame this character', '#FF8888'],
      4: ['Fame received', '#FFDD88'],
      5: ['Defame received', '#FF8888'],
    };
    const [msg, color] = msgs[result] ?? ['Fame action', '#AAAAAA'];
    UIStatusMessenger.show(msg, color);
  }
}

// opcode 37 — skill use result
export class SkillUseResultHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const success = data.getUint8(offset);
    if (success === 0) UIStatusMessenger.show('Skill failed', '#FF8888');
  }
}

// opcode 67 — spawn portal (mini-dungeon entrance etc.)
export class SpawnPortalHandler extends PacketHandler {
  handle(data: DataView): void {
    // Portals on map are already loaded from WZ; dynamic portals rare
  }
}
