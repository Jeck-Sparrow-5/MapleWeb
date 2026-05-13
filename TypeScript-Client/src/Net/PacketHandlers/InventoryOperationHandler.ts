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
            // equip item — skip full equip stats blob
            offset += 1 + 8; // isCash + expiration
            offset += 35;    // equip stats (approximate)
            tab?.push({ itemId, slot, quantity: 1 } as any);
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
