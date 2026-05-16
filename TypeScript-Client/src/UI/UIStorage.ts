import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { Position } from '../Effects/DamageIndicator';
import { getItemIconSync } from '../wz-utils/ItemIconLoader';
import SessionManager from '../SessionManager';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';

export interface StorageItem { itemId: number; quantity: number; slot: number; invType?: number; }

class UIStorage extends DragableMenu {
  bgImg: any = null;
  buttons: MapleStanceButton[] = [];
  loaded = false;
  mesos = 0;
  maxSlots = 4;
  items: StorageItem[] = [];
  npcId = 0;
  selectedSlot = -1;
  readonly W = 240;
  readonly H = 310;

  static instance: UIStorage | null = null;

  static async open(canvas: GameCanvas, mesos: number, slots: number, items: StorageItem[]) {
    if (!UIStorage.instance) {
      UIStorage.instance = new UIStorage({ x: 200, y: 120, isHidden: false });
      await UIStorage.instance.load(canvas);
    }
    UIStorage.instance.npcId = 0; // set by StorageHandler when available
    UIStorage.instance.mesos = mesos;
    UIStorage.instance.maxSlots = slots;
    UIStorage.instance.items = items;
    UIStorage.instance.selectedSlot = -1;
    UIStorage.instance.setIsHidden(false);
  }

  async load(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('Trunk')?.nGetImage?.() ?? null;

    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => this.setIsHidden(true),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Get from storage
    const btGet = uiWin?.nGet('BtGet');
    if (btGet) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 10, y: this.y + this.H - 28,
        img: btGet.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (this.selectedSlot < 0 || !SessionManager.isConnected()) return;
          const item = this.items[this.selectedSlot];
          if (!item) return;
          // STORAGE take: writeByte(0x04) + writeInt(npcId) + writeByte(invType) + writeShort(storageSlot)
          const pkt = new OutPacket(OutPacketOpcode.STORAGE);
          (pkt as any).writeByte(0x04); // take
          (pkt as any).writeInt(this.npcId);
          (pkt as any).writeByte(item.invType ?? 2); // inv type (USE=2 default)
          (pkt as any).writeShort(item.slot);
          pkt.dispatch();
          this.items.splice(this.selectedSlot, 1);
          this.selectedSlot = -1;
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Put into storage
    const btPut = uiWin?.nGet('BtPut');
    if (btPut) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 80, y: this.y + this.H - 28,
        img: btPut.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: async () => {
          if (!SessionManager.isConnected()) return;
          const slotStr = prompt('Inventory slot to store (1-based):');
          if (!slotStr) return;
          const slot = parseInt(slotStr);
          if (!slot) return;
          // STORAGE put: writeByte(0x03) + writeInt(npcId) + writeByte(invType) + writeShort(invSlot) + writeShort(qty)
          const pkt = new OutPacket(OutPacketOpcode.STORAGE);
          (pkt as any).writeByte(0x03); // put
          (pkt as any).writeInt(this.npcId);
          (pkt as any).writeByte(2); // USE tab default
          (pkt as any).writeShort(slot);
          (pkt as any).writeShort(1); // quantity
          pkt.dispatch();
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.loaded = true;
  }

  setIsHidden(v: boolean) {
    this.isHidden = v;
    this.buttons.forEach((b) => (b.isHidden = v));
  }

  moveTo(pos: Position) {
    const dx = pos.x - this.x; const dy = pos.y - this.y;
    this.x = pos.x; this.y = pos.y;
    this.buttons.forEach((b) => { b.x += dx; b.y += dy; });
  }

  getRect(_cam: CameraInterface) {
    return { x: this.x, y: this.y, width: this.W, height: this.H };
  }

  update(_ms: number) {}

  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;
    const slotSize = 32; const gap = 4;
    const cols = 4;
    const startX = this.x + 10;
    const startY = this.y + 50;
    const rows = Math.ceil(this.maxSlots / cols);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = startX + col * (slotSize + gap);
        const sy = startY + row * (slotSize + gap);
        if (mx >= sx && mx < sx + slotSize && my >= sy && my < sy + slotSize) {
          this.selectedSlot = row * cols + col;
          return true;
        }
      }
    }
    return false;
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.loaded) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
      canvas.context.fillRect(this.x, this.y, this.W, this.H);
      canvas.context.strokeStyle = '#557799';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H);
      canvas.context.restore();
    }

    canvas.drawText({ text: 'Storage', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });
    canvas.drawText({ text: `${this.mesos.toLocaleString()} mesos`, color: '#FFEE66', x: this.x + 10, y: this.y + 28, fontSize: 10 });
    canvas.drawText({ text: `${this.items.length}/${this.maxSlots} items`, color: '#AAAACC', x: this.x + this.W - 80, y: this.y + 28, fontSize: 10 });

    const slotSize = 32; const gap = 4; const cols = 4;
    const startX = this.x + 10; const startY = this.y + 38;
    const rows = Math.ceil(this.maxSlots / cols);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const sx = startX + col * (slotSize + gap);
        const sy = startY + row * (slotSize + gap);
        const isSelected = idx === this.selectedSlot;
        const item = this.items[idx];

        canvas.context.save();
        canvas.context.fillStyle = isSelected ? 'rgba(100,130,200,0.8)' : 'rgba(40,50,80,0.7)';
        canvas.context.strokeStyle = isSelected ? '#AADDFF' : '#334455';
        canvas.context.fillRect(sx, sy, slotSize, slotSize);
        canvas.context.strokeRect(sx, sy, slotSize, slotSize);

        if (item) {
          const icon = getItemIconSync(item.itemId);
          if (icon) {
            try { canvas.context.drawImage(icon, sx + 2, sy + 2, slotSize - 4, slotSize - 4); } catch (_) {}
          } else {
            canvas.context.fillStyle = '#334466';
            canvas.context.fillRect(sx + 2, sy + 2, slotSize - 4, slotSize - 4);
            canvas.context.fillStyle = '#AAAAFF';
            canvas.context.font = '7px Arial';
            canvas.context.fillText(`${item.itemId}`.slice(-4), sx + 2, sy + 14);
          }
          if (item.quantity > 1) {
            canvas.context.fillStyle = '#FFFF66';
            canvas.context.font = '8px Arial';
            canvas.context.textAlign = 'right';
            canvas.context.fillText(`${item.quantity}`, sx + slotSize - 2, sy + slotSize - 2);
            canvas.context.textAlign = 'left';
          }
        }
        canvas.context.restore();
      }
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }
}

// Import for use inside UIStorage methods
import UIStatusMessenger from './UIStatusMessenger';

export default UIStorage;
