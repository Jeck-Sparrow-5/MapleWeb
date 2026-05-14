import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MyCharacter from '../../MyCharacter';
import Item from '../../Inventory/Item';

function getTab(invType: number) {
  const inv = MyCharacter.inventory;
  switch (invType) {
    case 1: return inv.equip;
    case 2: return inv.use;
    case 3: return inv.setup;
    case 4: return inv.etc;
    case 5: return inv.cash;
    default: return null;
  }
}

export class InventoryOperationHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    offset += 1; // enable actions
    const opCount = data.getUint8(offset); offset += 1;

    for (let i = 0; i < opCount; i++) {
      const op = data.getUint8(offset); offset += 1;
      const invType = data.getUint8(offset); offset += 1;
      const slot = data.getInt16(offset, true); offset += 2;

      const tab = getTab(invType);

      switch (op) {
        case 0: { // ADD
          const itemId = data.getInt32(offset, true); offset += 4;
          if (invType === 1) {
            const isCash = data.getUint8(offset); offset += 1;
            if (isCash) offset += 8; // unique id
            offset += 8; // expiration
            // Equip stats: 15 shorts + 1 short(unk) + 2 bytes + 2 shorts + 2 bytes + 8 bytes = 48
            const str   = data.getInt16(offset, true); offset += 2;
            const dex   = data.getInt16(offset, true); offset += 2;
            const int_  = data.getInt16(offset, true); offset += 2;
            const luk   = data.getInt16(offset, true); offset += 2;
            const hp    = data.getInt16(offset, true); offset += 2;
            const mp    = data.getInt16(offset, true); offset += 2;
            const wAtk  = data.getInt16(offset, true); offset += 2;
            const mAtk  = data.getInt16(offset, true); offset += 2;
            const wDef  = data.getInt16(offset, true); offset += 2;
            const mDef  = data.getInt16(offset, true); offset += 2;
            const acc   = data.getInt16(offset, true); offset += 2;
            const avoid = data.getInt16(offset, true); offset += 2;
            const hands = data.getInt16(offset, true); offset += 2;
            const speed = data.getInt16(offset, true); offset += 2;
            const jump  = data.getInt16(offset, true); offset += 2;
            offset += 2; // unk short
            const upgradeSlots = data.getUint8(offset); offset += 1;
            const itemLevel    = data.getUint8(offset); offset += 1;
            offset += 2; // itemExp
            offset += 2; // viciousHammer
            offset += 1; // itemState
            offset += 1; // covered
            offset += 8; // crafterAccountId
            tab?.push({ itemId, slot, quantity: 1,
              str, dex, int: int_, luk, hp, mp, wAtk, mAtk, wDef, mDef,
              acc, avoid, hands, speed, jump, upgradeSlots, itemLevel } as any);
          } else {
            const qty = data.getInt16(offset, true); offset += 2;
            offset += 2; // flags
            tab?.push({ itemId, slot, quantity: qty } as any);
          }
          break;
        }
        case 1: { // UPDATE quantity
          const newQty = data.getInt16(offset, true); offset += 2;
          if (tab) {
            const idx = tab.findIndex((it: any) => it.slot === slot);
            if (idx >= 0) (tab[idx] as any).quantity = newQty;
          }
          break;
        }
        case 2: { // MOVE slot→slot2
          const slot2 = data.getInt16(offset, true); offset += 2;
          if (tab) {
            const idx = tab.findIndex((it: any) => it.slot === slot);
            if (idx >= 0) (tab[idx] as any).slot = slot2;
          }
          break;
        }
        case 3: { // REMOVE
          if (tab) {
            const idx = tab.findIndex((it: any) => it.slot === slot);
            if (idx >= 0) tab.splice(idx, 1);
          }
          break;
        }
        default:
          break;
      }
    }
  }
}
