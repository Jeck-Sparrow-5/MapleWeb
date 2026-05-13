import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MapleMap from '../../MapleMap';
import DropItemSprite from '../../DropItem/DropItemSprite';

export class DropItemFromMapObjectHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const dropType = data.getUint8(offset); offset += 1;
    const objectId = data.getInt32(offset, true); offset += 4;
    const itemId = data.getInt32(offset, true); offset += 4;
    const isMeso = data.getUint8(offset); offset += 1;

    let qty = 0;
    if (isMeso) {
      qty = data.getInt32(offset, true); offset += 4;
    }

    const x = data.getInt16(offset, true); offset += 2;
    const y = data.getInt16(offset, true); offset += 2;

    try {
      const drop = await DropItemSprite.fromOpts({
        itemId: isMeso ? 0 : itemId,
        mesos: isMeso ? qty : 0,
        x,
        y,
        objectId,
        map: MapleMap,
      });
      MapleMap.addItemDrop(drop);
    } catch (e) {
      console.warn('[DropItem] failed', itemId, e);
    }
  }
}

export class RemoveItemFromMapHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const animationType = data.getUint8(offset); offset += 1;
    const objectId = data.getInt32(offset, true);

    if (!MapleMap.itemDrops) return;
    const idx = MapleMap.itemDrops.findIndex((d: any) => d.objectId === objectId);
    if (idx >= 0) MapleMap.itemDrops.splice(idx, 1);
  }
}
