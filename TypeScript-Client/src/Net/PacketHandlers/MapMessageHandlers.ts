import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import MapleMap from '../../MapleMap';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import UIBuffList from '../../UI/UIBuffList';
import { setCooldown } from '../../UI/UISkillHotbar';
import { partyMembers, PartyMember } from '../../UI/UIPartyHP';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

// opcode 68 — server broadcast message (scrolling text / notice)
export class ServerMessageHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getUint8(offset); offset += 1;
    if (type === 4) offset += 1; // megaphone flag
    const { str } = readString(data, offset);
    UIStatusMessenger.show(str, type === 1 ? '#FFFF88' : '#FFFFFF');
  }
}

// opcode 39 — show status info (item gain, exp, meso)
export class ShowStatusInfoHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getUint8(offset); offset += 1;
    switch (type) {
      case 3: { // EXP
        const amount = data.getInt32(offset, true);
        UIStatusMessenger.show(`+${amount} EXP`, '#FFFFAA');
        break;
      }
      case 4: { // FAME
        const amount = data.getInt32(offset, true);
        UIStatusMessenger.show(`${amount > 0 ? '+' : ''}${amount} Fame`, '#FFAAFF');
        break;
      }
      case 5: { // MESO
        const amount = data.getInt32(offset, true);
        UIStatusMessenger.show(`+${amount} Mesos`, '#FFEE66');
        break;
      }
      case 7: { // ITEM
        const itemId = data.getInt32(offset, true); offset += 4;
        const qty = data.getInt32(offset, true);
        UIStatusMessenger.show(`Obtained: ${itemId} × ${qty}`, '#AAFFAA');
        break;
      }
    }
  }
}

// opcode 105 — level up notification
export class NotifyLevelUpHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true);
    if (charId === MyCharacter.id) {
      MyCharacter.playLevelUp?.();
      UIStatusMessenger.show('LEVEL UP!', '#FFFF00');
    }
  }
}

// opcode 250 — show monster HP bar
export class ShowMonsterHpHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const objectId = data.getInt32(offset, true); offset += 4;
    const hpPercent = data.getUint8(offset);

    const mob = MapleMap.monsters?.find((m: any) => m.oId === objectId) as any;
    if (mob) {
      mob.hpPercent = hpPercent;
      mob.isShotHpBar = true;
      mob.afterHitShowHpBarTime = 5000;
    }
  }
}

// opcode 63 — buddy list
export class BuddyListHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const op = data.getUint8(offset); offset += 1;
    if (op !== 7) return; // 7 = full buddy list update

    const { buddyList } = require('../../UI/UIUserList');
    buddyList.length = 0;

    const count = data.getUint8(offset); offset += 1;
    for (let i = 0; i < count; i++) {
      const charId = data.getInt32(offset, true); offset += 4;
      const { str: name, offset: o1 } = readString(data, offset);
      offset = o1;
      offset += 1; // relationship
      offset += 4; // mapId
      const channel = data.getInt32(offset, true); offset += 4;
      offset += 1; // visible
      buddyList.push({ charId, name, channel: channel === 0 ? -1 : channel - 1 });
    }
  }
}

// opcode 234 — skill cooldown
export class CooldownHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const skillId = data.getInt32(offset, true); offset += 4;
    const coolMs = data.getUint16(offset, true) * 1000;
    setCooldown(skillId, coolMs);
  }
}

// opcode 62 — party operation (join/leave/update)
export class PartyOperationHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const op = data.getUint8(offset); offset += 1;
    if (op !== 0x23) return; // only handle full party list (op 35 = update)

    partyMembers.length = 0;
    for (let i = 0; i < 6; i++) {
      const charId = data.getInt32(offset, true); offset += 4;
      if (charId === 0) { offset += 4 * 5; continue; }
      const { str: name, offset: o1 } = readString(data, offset);
      offset = o1;
      const job    = data.getInt32(offset, true); offset += 4;
      const level  = data.getInt32(offset, true); offset += 4;
      const channel = data.getInt32(offset, true); offset += 4;
      const mapId  = data.getInt32(offset, true); offset += 4;
      partyMembers.push({ charId, name, hp: 0, maxHp: 1, level, job, channel, mapId });
    }
  }
}

// opcode 201 — update party member HP
export class UpdatePartyMemberHpHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const hp     = data.getInt32(offset, true); offset += 4;
    const maxHp  = data.getInt32(offset, true);
    const member = partyMembers.find((m) => m.charId === charId);
    if (member) { member.hp = hp; member.maxHp = maxHp; }
  }
}

// opcodes 186/187 — other players' attacks (visual feedback only)
export class RemoteAttackHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    // Just show a brief status message or skip — no client-side effect needed
    // Future: play attack animation on the remote character
  }
}
