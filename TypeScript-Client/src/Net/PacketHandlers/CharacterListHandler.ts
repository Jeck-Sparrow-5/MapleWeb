import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import { clearCache } from '../../UI/CharSelectPreview';
import UILogin from '../../UI/UILogin';
import LoginState, {LoginSubState} from '../../LoginState';
import { Character, Look, Rank, Stat } from '../Models/Character';

export class CharacterListHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const channelStatus = data.getInt8(offset); offset += 1;
    const characterCount = data.getInt8(offset); offset += 1;

    const characters: Character[] = [];
    if (characterCount > 0) {
      for (let i = 0; i < characterCount; i++) {
        const { stat, newOffset } = this.parseStat(data, offset);
        const { look, newOffset: newOffset2 } = this.parseLook(data, newOffset);
        const hasRankData = data.getInt8(newOffset2);
        offset = newOffset2 + 1;
        let rank: Rank | null = null;
        if (hasRankData === 1) {
          const currentRank = data.getInt32(offset);
          offset += 4;
          const rankMovement = data.getInt32(offset);
          offset += 4;
          const currentJobRank = data.getInt32(offset);
          offset += 4;
          const jobRankMovement = data.getInt32(offset);
          offset += 4;
          new Rank(
            currentRank,
            rankMovement,
            currentJobRank,
            jobRankMovement,
          )
        }
        characters.push(new Character(
          stat,
          look,
          rank,
        ));
      }
    }

    console.log('Character:', characters);
    const pic = data.getInt8(offset);
    offset += 1;
    const slots = data.getInt32(offset, true);
    offset += 4;
    UILogin.hideLoading();
    UILogin.requirePic = pic;
    UILogin.maxCharacterSlots = slots;
    clearCache();
    UILogin.characters = characters;
    UILogin.selectedCharacterId = characters.length > 0 ? characters[0].stat.characterId : null;
    UILogin.createCharacterSlotButtons();
    await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
  }

  private readString(data: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const charCode = data.getUint8(offset + i);
      result += String.fromCharCode(charCode);
    }
    return result;
  }

  private parseStat(data: DataView, offset: number): { stat: Stat, newOffset: number } {
    const characterId = data.getInt32(offset, true);
    offset += 4;

    const characterName = this.readString(data, offset, 13);
    offset += 13;

    const gender = data.getInt8(offset);
    offset += 1;

    const skinColor = data.getInt8(offset);
    offset += 1;

    const face = data.getInt32(offset, true);
    offset += 4;

    const hair = data.getInt32(offset, true);
    offset += 4;

    const pets = [
      data.getBigInt64(offset, true),
      data.getBigInt64(offset + 8, true),
      data.getBigInt64(offset + 16, true),
    ];
    offset += 24;

    const level = data.getInt8(offset);
    offset += 1;

    const job = data.getInt16(offset, true);
    offset += 2;

    const str = data.getInt16(offset, true);
    offset += 2;

    const dex = data.getInt16(offset, true);
    offset += 2;

    const int = data.getInt16(offset, true);
    offset += 2;

    const luk = data.getInt16(offset, true);
    offset += 2;

    const hp = data.getInt16(offset, true);
    offset += 2;

    const maxHp = data.getInt16(offset, true);
    offset += 2;

    const mp = data.getInt16(offset, true);
    offset += 2;

    const maxMp = data.getInt16(offset, true);
    offset += 2;

    const ap = data.getInt16(offset, true);
    offset += 2;

    const exp = data.getInt32(offset, true);
    offset += 4;

    const fame = data.getInt32(offset, true);
    offset += 4;

    const gachaExp = data.getInt32(offset, true);
    offset += 4;

    const mapId = data.getInt32(offset, true);
    offset += 4;

    const spawnPoint = data.getInt8(offset);
    offset += 1;
    offset += 4; // writeInt(0) padding

    return {
      stat: new Stat(
        characterId,
        characterName,
        gender,
        skinColor,
        face,
        hair,
        pets,
        level,
        job,
        str,
        dex,
        int,
        luk,
        hp,
        maxHp,
        mp,
        maxMp,
        ap,
        0,  // sp — not sent in this server's CHARACTER_LIST packet
        exp,
        fame,
        gachaExp,
        mapId,
        spawnPoint,
      ),
      newOffset: offset,
    };
  }

  private parseLook(data: DataView, offset: number): { look: Look, newOffset: number } {
    const gender = data.getInt8(offset);
    offset += 1;

    const skinColor = data.getInt8(offset);
    offset += 1;

    const face = data.getInt32(offset, true);
    offset += 4;

    const mega = data.getInt8(offset);
    offset += 1;

    const hair = data.getInt32(offset, true);
    offset += 4;

    const eqSlots = new Map();
    let eqPosition = data.getInt8(offset);
    offset += 1;
    while (eqPosition !== -1) {
      const itemId = data.getInt32(offset, true);
      offset += 4;
      eqSlots.set(eqPosition, itemId);

      eqPosition = data.getInt8(offset);
      offset += 1;
      console.log('eqPosition', eqPosition);
    }
    console.log('eqSlots', eqSlots);

    const maskedEqSlots = new Map();
    let maskedEqPosition = data.getInt8(offset);
    offset += 1;
    while (maskedEqPosition !== -1) {
      const itemId = data.getInt32(offset, true);
      offset += 4;
      maskedEqSlots.set(maskedEqPosition, itemId);

      maskedEqPosition = data.getInt8(offset);
      offset += 1;
      console.log('maskedEqPosition', maskedEqPosition);
    }
    const weaponItemId = data.getInt32(offset, true);
    offset += 4;
    maskedEqSlots.set(-111, weaponItemId);
    console.log('maskedEqSlots', maskedEqSlots);

    const petIds = [];
    for (let i = 0; i < 3; i++) {
      const petId = data.getInt32(offset, true);
      offset += 4;
      petIds.push(petId);
    }
    offset += 1; // extra byte after pets (cash pet flag or padding)

    return {
      look: new Look(
        gender,
        skinColor,
        face,
        mega,
        hair,
        eqSlots,
        maskedEqSlots,
        petIds
      ),
      newOffset: offset,
    }
  }
}
