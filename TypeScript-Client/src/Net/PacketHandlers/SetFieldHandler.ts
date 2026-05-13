import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import MapState from '../../MapState';
import LoginState from '../../LoginState';
import StateManager from '../../StateManager';
import { skillLevels, skillSPTotal } from '../../UI/UISkillBook';

function readString(data: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return s;
}

export class SetFieldHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    offset += 4; // channel/port
    offset += 1; // char slot

    const type = data.getUint8(offset); offset += 1;

    if (type === 0) {
      // Full character data — first login to channel
      await this.parseFirstLogin(data, offset);
    } else {
      // Warp to map
      const mapId = data.getInt32(offset, true); offset += 4;
      const spawnPoint = data.getUint8(offset); offset += 1;
      const hp = data.getInt16(offset, true); offset += 2;

      MyCharacter.hp = hp;
      await this.enterMap(mapId, spawnPoint);
    }
  }

  private async parseFirstLogin(data: DataView, offset: number): Promise<void> {
    // Character stats (same layout as CharacterListHandler.parseStat)
    const charId = data.getInt32(offset, true); offset += 4;
    const name = readString(data, offset, 13); offset += 13;
    const gender = data.getInt8(offset); offset += 1;
    offset += 1; // skinColor
    const face = data.getInt32(offset, true); offset += 4;
    const hair = data.getInt32(offset, true); offset += 4;
    offset += 24; // 3 pet IDs (3 × int64)
    const level = data.getInt8(offset); offset += 1;
    const job = data.getInt16(offset, true); offset += 2;
    const str = data.getInt16(offset, true); offset += 2;
    const dex = data.getInt16(offset, true); offset += 2;
    const int_ = data.getInt16(offset, true); offset += 2;
    const luk = data.getInt16(offset, true); offset += 2;
    const hp = data.getInt16(offset, true); offset += 2;
    const maxHp = data.getInt16(offset, true); offset += 2;
    const mp = data.getInt16(offset, true); offset += 2;
    const maxMp = data.getInt16(offset, true); offset += 2;
    const ap = data.getInt16(offset, true); offset += 2;
    const sp = data.getInt16(offset, true); offset += 2;
    const exp = data.getInt32(offset, true); offset += 4;
    const fame = data.getInt16(offset, true); offset += 2;
    offset += 4; // gachaExp
    const mapId = data.getInt32(offset, true); offset += 4;
    const spawnPoint = data.getInt8(offset); offset += 1;
    offset += 1; // skip

    // Apply to MyCharacter
    MyCharacter.id = charId;
    MyCharacter.name = name;
    MyCharacter.gender = gender;
    MyCharacter.face = face;
    MyCharacter.Hair = hair;
    MyCharacter.hp = hp;
    MyCharacter.maxHp = maxHp;
    MyCharacter.mp = mp;
    MyCharacter.maxMp = maxMp;
    MyCharacter.exp = exp;
    MyCharacter.fame = fame;
    MyCharacter.stats.level = level;
    MyCharacter.stats.str = str;
    MyCharacter.stats.dex = dex;
    MyCharacter.stats.int = int_;
    MyCharacter.stats.luk = luk;
    MyCharacter.stats.abilityPoints = ap;
    skillSPTotal.sp = sp;

    // Parse inventory (simplified — read slot counts then iterate equip items)
    try {
      offset = this.parseInventory(data, offset);
    } catch (e) {
      console.warn('[SetFieldHandler] inventory parse error, skipping:', e);
    }

    // Skip skills, quests, etc. — parse only what we need for map entry
    // Remaining data leads to map portal info; try to trust mapId from stats block
    await this.enterMap(mapId, spawnPoint);
  }

  private parseInventory(data: DataView, offset: number): number {
    MyCharacter.inventory.mesos = data.getInt32(offset, true); offset += 4;

    // 5 tab slot counts
    const slotCounts: number[] = [];
    for (let i = 0; i < 5; i++) { slotCounts.push(data.getUint8(offset)); offset += 1; }

    // Parse each tab (Equip=0, Use=1, Setup=2, Etc=3, Cash=4)
    for (let tab = 0; tab < 5; tab++) {
      let slotId = data.getInt8(offset); offset += 1;
      while (slotId !== 0) {
        const itemId = data.getInt32(offset, true); offset += 4;
        const isCash = data.getUint8(offset); offset += 1;
        if (isCash) offset += 8; // unique id
        offset += 8; // expiration time
        if (tab === 0) {
          // Equip item — read equip stats
          offset += 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 2; // ~35 bytes of stats
          MyCharacter.inventory.equip.push({ itemId, slot: slotId, quantity: 1 } as any);
        } else {
          const quantity = data.getInt16(offset, true); offset += 2;
          offset += 2; // flags
          if (tab === 1) MyCharacter.inventory.use.push({ itemId, quantity } as any);
          else if (tab === 2) MyCharacter.inventory.setup.push({ itemId, quantity } as any);
          else if (tab === 3) MyCharacter.inventory.etc.push({ itemId, quantity } as any);
          else if (tab === 4) MyCharacter.inventory.cash.push({ itemId, quantity } as any);
        }
        slotId = data.getInt8(offset); offset += 1;
      }
    }
    return offset;
  }

  private async enterMap(mapId: number, _spawnPoint: number): Promise<void> {
    if (mapId <= 0) return;
    if (StateManager.currentState !== MapState) {
      await StateManager.setState(MapState);
    }
    await (MapState as any).changeMap(mapId);
  }
}
