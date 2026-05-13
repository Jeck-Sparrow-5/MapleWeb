import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UILogin from '../../UI/UILogin';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import { clearCache } from '../../UI/CharSelectPreview';

function readString(data: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return s;
}

// opcode 13 — char name check response
export class CharNameResponseHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const nameLen = data.getUint16(offset, true); offset += 2;
    const name = readString(data, offset, nameLen); offset += nameLen;
    const taken = data.getUint8(offset) === 1;

    if (taken) {
      UIStatusMessenger.show(`"${name}" is already taken`, '#FF8888');
    } else {
      UIStatusMessenger.show(`"${name}" is available`, '#88FF88');
    }
  }
}

// opcode 15 — delete char response
export class DeleteCharResponseHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const charId = data.getInt32(offset, true); offset += 4;
    const state = data.getUint8(offset);

    if (state === 0) {
      // Success — remove from list
      clearCache();
      UILogin.characters = UILogin.characters.filter((c) => c.stat.characterId !== charId);
      if (UILogin.selectedCharacterId === charId) {
        UILogin.selectedCharacterId = UILogin.characters[0]?.stat.characterId ?? null;
      }
      UILogin.createCharacterSlotButtons();
      UIStatusMessenger.show('Character deleted', '#AAAAAA');
    } else if (state === 10) {
      UIStatusMessenger.show('Incorrect birthday', '#FF8888');
    } else if (state === 20) {
      UIStatusMessenger.show('Incorrect PIN', '#FF8888');
    } else {
      UIStatusMessenger.show('Failed to delete character', '#FF8888');
    }
  }
}
