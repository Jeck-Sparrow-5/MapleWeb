import NXManager from '../wz-utils/NXManager';
import { getItemIconSync } from '../wz-utils/ItemIconLoader';
import { getItemNameSync } from '../wz-utils/ItemNameLoader';
import { ShopBuyPacket, ShopSellPacket } from '../Net/Packets/ShopPacket';
import SessionManager from '../SessionManager';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import MyCharacter from '../MyCharacter';
import { Position } from '../Effects/DamageIndicator';

export interface ShopItem {
  itemId: number;
  name: string;
  price: number;
  icon?: any;
}

class UIShop extends DragableMenu {
  bgImg: any = null;
  selectImg: any = null;
  shopItems: ShopItem[] = [];
  sellItems: ShopItem[] = [];
  buttons: MapleStanceButton[] = [];
  tab: 'buy' | 'sell' = 'buy';
  scroll = 0;
  selectedIndex = -1;
  loaded = false;
  readonly W = 210;
  readonly H = 280;

  static instance: UIShop | null = null;

  static async open(canvas: GameCanvas, items: ShopItem[], npcName = 'Shop') {
    if (!UIShop.instance) {
      UIShop.instance = new UIShop({ x: 100, y: 100, isHidden: false });
      await UIShop.instance.load(canvas);
    }
    UIShop.instance.shopItems = items;
    UIShop.instance.buildSellList();
    UIShop.instance.setIsHidden(false);
    UIShop.instance.tab = 'buy';
    UIShop.instance.scroll = 0;
    UIShop.instance.selectedIndex = -1;
  }

  static close() {
    UIShop.instance?.setIsHidden(true);
  }

  buildSellList() {
    this.sellItems = [];
    const inv = MyCharacter.inventory;
    const allItems = [
      ...(inv.equip ?? []),
      ...(inv.use ?? []),
      ...(inv.etc ?? []),
    ];
    allItems.forEach((it: any) => {
      if (!it) return;
      this.sellItems.push({
        itemId: it.itemId,
        name: getItemNameSync(it.itemId) || `${it.itemId}`,
        price: Math.floor((it.price ?? 0) / 2),
        icon: getItemIconSync(it.itemId),
      });
    });
  }

  async load(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    const shopNode = uiWin?.nGet('Shop');
    this.selectImg = shopNode?.nGet('select')?.nGetImage?.() ?? null;

    // Buttons
    const btExit = uiWin?.nGet('BtUIClose');
    if (btExit) {
      const closeBtn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btExit.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (SessionManager.isConnected()) {
            new OutPacket(OutPacketOpcode.NPC_SHOP_CLOSE).dispatch();
          }
          UIShop.close();
        },
      });
      ClickManager.addButton(closeBtn);
      this.buttons.push(closeBtn);
    }

    const btBuy = uiWin?.nGet('BtBuy');
    if (btBuy) {
      const buyBtn = new MapleStanceButton(canvas, {
        x: this.x + 50, y: this.y + this.H - 28,
        img: btBuy.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (this.tab !== 'buy' || this.selectedIndex < 0) return;
          const item = this.shopItems[this.scroll + this.selectedIndex];
          if (!item) return;
          if (MyCharacter.inventory.mesos < item.price) return;
          if (SessionManager.isConnected()) {
            new ShopBuyPacket(this.scroll + this.selectedIndex, item.itemId, 1).dispatch();
          } else {
            MyCharacter.inventory.mesos -= item.price;
            (MyCharacter.inventory.etc as any[]).push({ itemId: item.itemId, quantity: 1 });
          }
        },
      });
      ClickManager.addButton(buyBtn);
      this.buttons.push(buyBtn);
    }

    const btSell = uiWin?.nGet('BtSell');
    if (btSell) {
      const sellBtn = new MapleStanceButton(canvas, {
        x: this.x + 110, y: this.y + this.H - 28,
        img: btSell.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (this.tab !== 'sell' || this.selectedIndex < 0) return;
          const item = this.sellItems[this.scroll + this.selectedIndex];
          if (!item) return;
          if (SessionManager.isConnected()) {
            new ShopSellPacket(this.scroll + this.selectedIndex, item.itemId, 1).dispatch();
          } else {
            MyCharacter.inventory.mesos += item.price;
            this.buildSellList();
          }
        },
      });
      ClickManager.addButton(sellBtn);
      this.buttons.push(sellBtn);
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

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.loaded) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
    canvas.context.fillRect(this.x, this.y, this.W, this.H);
    canvas.context.strokeStyle = '#557799';
    canvas.context.strokeRect(this.x, this.y, this.W, this.H);
    canvas.context.restore();

    canvas.drawText({ text: 'Shop', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });

    // Tabs
    ['buy', 'sell'].forEach((t, i) => {
      const tx = this.x + 10 + i * 80;
      canvas.context.save();
      canvas.context.fillStyle = this.tab === t ? 'rgba(80,100,160,0.9)' : 'rgba(40,40,70,0.8)';
      canvas.context.fillRect(tx, this.y + 22, 72, 16);
      canvas.context.restore();
      canvas.drawText({ text: t.toUpperCase(), color: '#FFFFFF', x: tx + 20, y: this.y + 32, fontSize: 10 });
    });

    // Click tab areas (primitive — just detect on draw)
    const items = this.tab === 'buy' ? this.shopItems : this.sellItems;
    const visible = items.slice(this.scroll, this.scroll + 6);
    visible.forEach((item, i) => {
      const iy = this.y + 42 + i * 32;
      const selected = i === this.selectedIndex;
      canvas.context.save();
      canvas.context.fillStyle = selected ? 'rgba(100,130,200,0.8)' : 'rgba(40,50,80,0.7)';
      canvas.context.fillRect(this.x + 6, iy, this.W - 12, 28);
      canvas.context.restore();
      const shopIcon = item.icon ?? getItemIconSync(item.itemId);
      if (shopIcon) {
        try { canvas.context.drawImage(shopIcon, this.x + 8, iy + 1, 26, 26); } catch (_) {}
      }
      canvas.drawText({ text: item.name.substring(0, 22), color: '#FFFFFF', x: this.x + 36, y: iy + 11, fontSize: 10 });
      canvas.drawText({ text: `${item.price} meso`, color: '#FFEE66', x: this.x + 36, y: iy + 22, fontSize: 9 });
    });

    // Meso display
    canvas.drawText({
      text: `Mesos: ${MyCharacter.inventory.mesos.toLocaleString()}`,
      color: '#FFEE66',
      x: this.x + 10,
      y: this.y + this.H - 10,
      fontSize: 10,
    });

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }

  onMouseDown(mouseX: number, mouseY: number): boolean {
    if (this.isHidden) return false;
    // Tab click
    if (mouseY >= this.y + 22 && mouseY < this.y + 38) {
      if (mouseX >= this.x + 10 && mouseX < this.x + 82) { this.tab = 'buy'; this.scroll = 0; this.selectedIndex = -1; return true; }
      if (mouseX >= this.x + 90 && mouseX < this.x + 162) { this.tab = 'sell'; this.scroll = 0; this.selectedIndex = -1; return true; }
    }
    // Item selection
    if (mouseY >= this.y + 42 && mouseY < this.y + 42 + 6 * 32) {
      const i = Math.floor((mouseY - (this.y + 42)) / 32);
      this.selectedIndex = i;
      return true;
    }
    return false;
  }
}

export default UIShop;
