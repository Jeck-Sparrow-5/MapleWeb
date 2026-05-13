/**
 * MULTICHAT (134), WHISPER (135), SHOW_ITEM_GAIN_INCHAT (206),
 * CHAR_INFO (61), SET_QUEST_CLEAR (150), SET_QUEST_TIME (151),
 * UPDATE_QUEST_INFO (211)
 */
import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UIMap from '../../UI/UIMap';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import { activeQuests } from '../../UI/UIQuestLog';
import { getItemIconSync } from '../../wz-utils/ItemIconLoader';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

// opcode 134 — multi-type chat (party/guild/buddy/expedition)
export class MultiChatHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getUint8(offset); offset += 1;
    const { str: sender, offset: o1 } = readString(data, offset); offset = o1;
    const { str: msg, offset: o2 }    = readString(data, offset);

    const colors: Record<number, string> = {
      0: '#FFFFAA', // party
      1: '#AAFFAA', // buddy
      2: '#FFAAFF', // guild
      3: '#AAFFFF', // expedition
    };
    const labels: Record<number, string> = {
      0: '[Party]', 1: '[Buddy]', 2: '[Guild]', 3: '[Exp]',
    };
    const color = colors[type] ?? '#CCCCCC';
    const label = labels[type] ?? '[Chat]';
    UIMap.addChatMessage(`${label} ${sender}: ${msg}`, color);
  }
}

// opcode 135 — whisper / find
export class WhisperHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type = data.getUint8(offset); offset += 1;
    const { str: sender, offset: o1 } = readString(data, offset); offset = o1;

    if (type === 18) {
      // Whisper received
      const { str: msg } = readString(data, offset);
      UIMap.addChatMessage(`[Whisper] ${sender}: ${msg}`, '#FF88FF');
    } else if (type === 20) {
      // Whisper reply / find result
      const channel = data.getInt8(offset);
      if (channel < 0) {
        UIStatusMessenger.show(`${sender} is offline`, '#888888');
      } else {
        UIStatusMessenger.show(`${sender} is on Ch.${channel + 1}`, '#AAFFFF');
      }
    }
  }
}

// opcode 206 — item gain shown in chat (pickup from map)
export class ShowItemGainInChatHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const itemId = data.getInt32(offset, true); offset += 4;
    const qty    = data.getInt32(offset, true);
    UIStatusMessenger.show(`Picked up item ${itemId} ×${qty}`, '#AAFFAA');
    UIMap.addChatMessage(`[Item] Obtained: ${itemId} ×${qty}`, '#AAFFAA');
  }
}

// opcode 61 — CHAR_INFO (right-click player info)
export class CharInfoHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const level  = data.getUint8(offset); offset += 1;
    const job    = data.getInt16(offset, true); offset += 2;
    offset += 4; // fame
    offset += 1; // married flag
    const { str: guildName, offset: o1 } = readString(data, offset); offset = o1;
    const { str: name, offset: o2 }      = readString(data, offset);

    // Show in UICharInfo
    const charInfo = (window as any).UICharInfo;
    if (charInfo) {
      charInfo.show(document.getElementById('game'), {
        name, level, job: `${job}`, guild: guildName,
        fame: 0, str: 0, dex: 0, int: 0, luk: 0,
        hp: 0, maxHp: 0, mp: 0, maxMp: 0,
      });
    }
  }
}

// opcode 150 — quest cleared
export class SetQuestClearHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const questId = data.getUint16(offset, true);
    const idx = activeQuests.findIndex((q) => q.id === questId);
    if (idx >= 0) {
      activeQuests[idx].state = 'completed';
    } else {
      activeQuests.push({ id: questId, name: `Quest ${questId}`, state: 'completed' });
    }
    UIStatusMessenger.show(`Quest ${questId} completed!`, '#FFDD88');
  }
}

// opcode 151 — quest timer
export class SetQuestTimeHandler extends PacketHandler {
  handle(data: DataView): void {
    // Quest timers not displayed yet — just acknowledge
  }
}

// opcode 211 — quest info update
export class UpdateQuestInfoHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const type    = data.getUint8(offset); offset += 1;
    const questId = data.getUint16(offset, true); offset += 2;

    if (type === 1) {
      // Quest started
      const existing = activeQuests.find((q) => q.id === questId);
      if (!existing) {
        activeQuests.push({ id: questId, name: `Quest ${questId}`, state: 'started' });
        UIStatusMessenger.show(`Quest ${questId} started`, '#FFEE88');
      }
    } else if (type === 0) {
      // Quest removed/given up
      const idx = activeQuests.findIndex((q) => q.id === questId);
      if (idx >= 0) activeQuests.splice(idx, 1);
    }
  }
}
