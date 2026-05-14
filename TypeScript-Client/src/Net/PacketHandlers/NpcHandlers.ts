import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import MapleMap from '../../MapleMap';
import UIShop, { ShopItem } from '../../UI/UIShop';
import NpcTalkType from '../../Constants/NpcTalkType';
import WZManager from '../../wz-utils/WZManager';

function readString(data: DataView, offset: number): { str: string; offset: number } {
  const len = data.getUint16(offset, true); offset += 2;
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(data.getUint8(offset + i));
  return { str: s, offset: offset + len };
}

export class NpcTalkHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const npcObjectId = data.getInt32(offset, true); offset += 4;
    const talkType = data.getUint8(offset); offset += 1;
    const emotionId = data.getInt32(offset, true); offset += 4;

    const { str: message, offset: newOffset } = readString(data, offset);
    offset = newOffset;

    const prev = data.getUint8(offset); offset += 1;
    const next = data.getUint8(offset); offset += 1;

    if (!MapleMap.npcDialog) return;

    const npc = MapleMap.npcs?.find((n: any) => n.oId === npcObjectId);

    const hasPrev = prev === 1;
    const hasNext = next === 1;
    const type = this.mapTalkType(talkType);
    const npcName = npc?.strings?.name ?? 'NPC';
    await MapleMap.npcDialog.changeText(npcObjectId, type, npcName, message, hasPrev, hasNext);
    MapleMap.npcDialog.setIsHidden(false);
  }

  private mapTalkType(t: number): NpcTalkType {
    switch (t) {
      case 0:  return NpcTalkType.TextOnly;
      case 1:  return NpcTalkType.SendNextPrev;
      case 2:  return NpcTalkType.YesNo;
      case 3:  return NpcTalkType.GetNumber;
      case 4:  return NpcTalkType.Selection;
      case 5:  return NpcTalkType.GetText;
      case 6:  return NpcTalkType.TextOkOnly;
      case 9:  return NpcTalkType.AcceptDecline;
      case 12: return NpcTalkType.AcceptDecline;
      default: return NpcTalkType.TextOnly;
    }
  }
}

export class OpenNpcShopHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const npcId = data.getInt32(offset, true); offset += 4;
    const itemCount = data.getUint16(offset, true); offset += 2;

    // Load item names from String.wz
    let eqpNames: Record<number, string> = {};
    let etcNames: Record<number, string> = {};
    try {
      const eqpNode = await WZManager.get('String.wz/Eqp.img');
      eqpNode?.nChildren?.forEach((cat: any) => {
        cat.nChildren?.forEach((item: any) => {
          eqpNames[parseInt(item.nName)] = item.name?.nValue ?? item.nName;
        });
      });
      const etcNode = await WZManager.get('String.wz/Etc.img');
      etcNode?.nChildren?.forEach((cat: any) => {
        cat.nChildren?.forEach((item: any) => {
          etcNames[parseInt(item.nName)] = item.name?.nValue ?? item.nName;
        });
      });
    } catch (_) {}

    const items: ShopItem[] = [];
    for (let i = 0; i < itemCount; i++) {
      const itemId = data.getInt32(offset, true); offset += 4;
      offset += 4; // flags
      const price = data.getInt32(offset, true); offset += 4;
      offset += 4 + 1; // unit price + unknown
      const maxPerSlot = data.getInt16(offset, true); offset += 2;

      const name = eqpNames[itemId] ?? etcNames[itemId] ?? `${itemId}`;
      items.push({ itemId, name, price });
    }

    const canvas = document.getElementById('game') as any;
    await UIShop.open(canvas, items);
  }
}
