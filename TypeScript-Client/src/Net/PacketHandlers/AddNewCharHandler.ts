import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UILogin from '../../UI/UILogin';
import { OutPacket, OutPacketOpcode } from '../OutPacket';
import { clearCache } from '../../UI/CharSelectPreview';

export class AddNewCharEntryHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    offset += 1; // status byte

    // Server sends new char ID — re-request the full char list to get proper data
    // rather than constructing a placeholder with require()
    clearCache();
    const worldId = UILogin.selectedWorldId ?? 0;
    const channelId = UILogin.selectedChannelIndex ?? 0;
    UILogin.hideLoading();

    // Request fresh character list so we get proper stat/look data
    const pkt = new OutPacket(OutPacketOpcode.CHARACTER_LIST_REQUEST);
    (pkt as any).writeByte(0);
    (pkt as any).writeByte(worldId);
    (pkt as any).writeByte(channelId + 1);
    pkt.dispatch();
  }
}
