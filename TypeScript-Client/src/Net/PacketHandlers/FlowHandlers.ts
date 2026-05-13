/**
 * CONFIRM_SHOP_TRANSACTION (306), CHANNEL_SELECTED (20), KEYMAP (335),
 * RELOG_RESPONSE (22), INVENTORY_GROW wrapper
 */
import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import UIStatusMessenger from '../../UI/UIStatusMessenger';
import SessionManager from '../../SessionManager';
import PlayerLoginPacket from '../Packets/PlayerLoginPacket';
import MyCharacter from '../../MyCharacter';
import { keyBindings } from '../../UI/UIKeyConfig';
import { hotbarSlots } from '../../UI/UISkillHotbar';

// opcode 306 — shop buy/sell result
export class ConfirmShopTransactionHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    const result = data.getUint8(offset);
    switch (result) {
      case 0:  UIStatusMessenger.show('Purchase successful', '#88FF88'); break;
      case 2:  UIStatusMessenger.show('Not enough mesos', '#FF8888'); break;
      case 3:  UIStatusMessenger.show('Inventory full', '#FF8888'); break;
      default: UIStatusMessenger.show('Shop transaction failed', '#FF8888'); break;
    }
  }
}

// opcode 20 — channel change successful; server sends new channel connection info
export class ChannelSelectedHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;
    offset += 4; // channel port (we read from the proxy URL)
    const port = data.getUint16(offset, true); offset += 2;
    const charId = data.getInt32(offset, true);

    UIStatusMessenger.show('Changing channel...', '#AADDFF');
    await SessionManager.reconnect(port);
    new PlayerLoginPacket(charId).dispatch();
  }
}

// opcode 22 — relog response (after disconnect/reconnect)
export class RelogResponseHandler extends PacketHandler {
  handle(_data: DataView): void {
    UIStatusMessenger.show('Reconnected', '#88FF88');
  }
}

// opcode 335 — server sends key bindings saved on account
export class KeymapHandler extends PacketHandler {
  handle(data: DataView): void {
    let offset = Cryptography.HEADER_LENGTH + 2;
    // Keymap: array of 90 key entries, each { type: byte, action: int }
    // type 0 = none, 1 = skill, 2 = item, 4 = face, 6 = menu action, etc.
    const KEY_COUNT = 90;
    const actionToName: Record<number, string> = {
      2: 'equip', 3: 'stats', 4: 'skill', 5: 'buddy',
      6: 'quest', 9: 'inventory', 10: 'minimap',
    };
    for (let i = 0; i < KEY_COUNT; i++) {
      const type = data.getUint8(offset); offset += 1;
      const action = data.getInt32(offset, true); offset += 4;

      if (type === 1 && action > 0) {
        // type 1 = skill — map key index to hotbar slot 0-9
        // Key indices 2-11 roughly correspond to keys 1-0
        const hotbarIdx = i - 2;
        if (hotbarIdx >= 0 && hotbarIdx < 10) {
          hotbarSlots[hotbarIdx] = action;
        }
      }
    }
  }
}
