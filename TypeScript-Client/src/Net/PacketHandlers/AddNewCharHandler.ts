import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UILogin from '../../UI/UILogin';
import { Character, Stat, Look, Rank } from '../Models/Character';

// Reuse the parseStat/parseLook logic from CharacterListHandler
// Simplified version: just parse enough to add the new char to the list
export class AddNewCharEntryHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;

    offset += 1; // skip status byte

    const charId = data.getInt32(offset, true); offset += 4;

    // Skip to just add an entry — real implementation would parse full char data
    // For now: push a placeholder and refresh the slot buttons
    const exists = UILogin.characters.some((c) => c.stat.characterId === charId);
    if (!exists) {
      // Minimal stat placeholder — server will send full char list on next request
      const stat = new (require('../Models/Character').Stat)(
        charId, 'New Character', 0, 0, 20000, 30000, [], 1, 0,
        4, 4, 4, 4, 50, 50, 5, 5, 0, 0, 0, 0, 0, 100000000, 0
      );
      const look = new (require('../Models/Character').Look)(0, 0, 20000, 0, 30000, new Map(), new Map(), []);
      UILogin.characters.push(new Character(stat, look, null));
      UILogin.selectedCharacterId = charId;
      UILogin.createCharacterSlotButtons();
    }
  }
}
