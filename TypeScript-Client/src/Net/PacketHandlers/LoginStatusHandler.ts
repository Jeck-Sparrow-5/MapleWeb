import { PacketHandler } from '../PacketHandler';
import { OutPacket, OutPacketOpcode } from '../OutPacket';
import { Cryptography } from '../Cryptography';
import UILogin from '../../UI/UILogin';
import { NoticeMessage, NoticeType } from '../../UI/UILoginNotice';

export class LoginStatusHandler extends PacketHandler {
  handle(data: DataView): void {
    const reasonCode = data.getUint8(Cryptography.HEADER_LENGTH + 2);
    console.log('Login status is:', reasonCode);

    switch (reasonCode) {
      case 0:
        // Login success
        const accountId = data.getInt32(Cryptography.HEADER_LENGTH + 8, true);
        const female = data.getInt8(Cryptography.HEADER_LENGTH + 12);
        const admin = data.getInt8(Cryptography.HEADER_LENGTH + 14);
        console.log('accountId:', accountId);
        console.log('female:', female);
        console.log('admin:', admin);
        UILogin.hideLoading();
        new OutPacket(OutPacketOpcode.SERVER_LIST_REQUEST).dispatch();
        break;
      case 2:
      case 5:
      case 7:
      case 13:
        UILogin.showNotice(NoticeType.NORMAL, reasonCode as NoticeMessage);
        break;
      case 23:
        UILogin.showTOS();
        break;
      default:
        break;
    }
  }
}
