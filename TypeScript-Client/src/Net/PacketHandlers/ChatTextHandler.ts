import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UIMap from '../../UI/UIMap';
import ChatBubbleRenderer from '../../UI/ChatBubbleRenderer';
import MapleMap from '../../MapleMap';

export class ChatTextHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const charId = data.getInt32(offset, true); offset += 4;
    const isAdmin = data.getUint8(offset); offset += 1;

    const nameLen = data.getUint16(offset, true); offset += 2;
    let name = '';
    for (let i = 0; i < nameLen; i++) {
      name += String.fromCharCode(data.getUint8(offset + i));
    }
    offset += nameLen;

    const msgLen = data.getUint16(offset, true); offset += 2;
    let msg = '';
    for (let i = 0; i < msgLen; i++) {
      msg += String.fromCharCode(data.getUint8(offset + i));
    }

    UIMap.addChatMessage(`${name}: ${msg}`, '#FFFFFF');
    // Show bubble above the speaking character
    const speaker = MapleMap.characters?.find((c: any) => c.id === charId);
    if (speaker) ChatBubbleRenderer.show(charId, msg);
  }
}
