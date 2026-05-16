import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import SessionManager from '../SessionManager';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import { getItemIconSync } from '../wz-utils/ItemIconLoader';
import { getItemNameSync } from '../wz-utils/ItemNameLoader';

export interface CashItem {
  sn: number;       // serial number (from CashShop.wz)
  itemId: number;
  name: string;
  price: number;    // NX price
  icon: any;
}

type CashCategory = 'New' | 'Equipment' | 'Consumables' | 'Pets' | 'Misc';
const CATEGORIES: CashCategory[] = ['New', 'Equipment', 'Consumables', 'Pets', 'Misc'];

// Item ID ranges per category
const CATEGORY_RANGES: Record<CashCategory, [number, number][]> = {
  'New':         [],
  'Equipment':   [[5000000, 5099999], [5100000, 5199999]],
  'Consumables': [[5200000, 5299999], [5500000, 5599999]],
  'Pets':        [[5000000, 5099999]],
  'Misc':        [[5700000, 5999999]],
};

const UICashShop = {
  isHidden: true,
  initialized: false,
  buttons:   [] as MapleStanceButton[],
  tabBtns:   [] as MapleStanceButton[],
  bgImg:     null as any,
  x: 0,
  y: 0,
  W: 700,
  H: 520,
  activeTab: 'New' as CashCategory,
  allItems:  [] as CashItem[],
  scroll:    0,
  selectedIdx: -1,
  nx: 0,        // Nexon Cash balance
  mp: 0,        // MaplePoints balance
  loading: false,

  async initialize(canvas: GameCanvas) {
    this.x = Math.floor((800 - this.W) / 2);
    this.y = Math.floor((600 - this.H) / 2);

    const uiWin = await NXManager.get('UI.wz/UIWindow.img');

    // Close / Return button
    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.leave(canvas),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Buy button
    const btOK = uiWin?.nGet('BtOK');
    if (btOK) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 100, y: this.y + this.H - 30,
        img: btOK.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.buySelected(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Category tab buttons
    CATEGORIES.forEach((cat, i) => {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 140 + i * 110, y: this.y + 28,
        img: uiWin?.nGet('BtOK')?.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => { this.activeTab = cat; this.scroll = 0; this.selectedIdx = -1; },
      });
      ClickManager.addButton(btn);
      this.tabBtns.push(btn);
      this.buttons.push(btn);
    });

    this.initialized = true;
    await this.loadItems();
  },

  async loadItems() {
    this.loading = true;
    this.allItems = [];
    try {
      // Load cash item names from String.wz/Cash.img
      const cashStr = await NXManager.get('String.wz/Cash.img');
      if (cashStr?.nChildren) {
        for (const child of cashStr.nChildren) {
          const id = parseInt(child.nName);
          if (isNaN(id)) continue;
          const name = child.name?.nValue ?? child.nGet?.('name')?.nValue ?? `Item ${id}`;
          const icon = getItemIconSync(id);
          this.allItems.push({ sn: id, itemId: id, name, price: 1200, icon });
        }
      }
    } catch (_) {}

    // Fallback: a curated list of well-known cash items with NX prices
    if (this.allItems.length === 0) {
      const defaults: [number, string, number][] = [
        [5000028, 'White Bunny', 3000],
        [5000029, 'Brown Bunny', 3000],
        [5000045, 'Pink Bunny', 3000],
        [5062000, 'Safety Charm', 1200],
        [5330000, 'Megaphone', 1200],
        [5370000, 'Scissors of Karma', 2200],
        [5530000, 'Super Megaphone', 2200],
        [5222000, 'Name Change Coupon', 5000],
      ];
      defaults.forEach(([id, name, price]) => {
        this.allItems.push({ sn: id, itemId: id, name, price, icon: null });
      });
    }

    this.loading = false;
  },

  get filteredItems(): CashItem[] {
    if (this.activeTab === 'New') return this.allItems.slice(0, 20);
    const ranges = CATEGORY_RANGES[this.activeTab];
    if (!ranges.length) return this.allItems;
    return this.allItems.filter(item =>
      ranges.some(([lo, hi]) => item.itemId >= lo && item.itemId <= hi)
    );
  },

  open(canvas: GameCanvas) {
    if (!this.initialized) { this.initialize(canvas); }
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
    // Request NX balance from server
    if (SessionManager.isConnected()) {
      const pkt = new OutPacket(OutPacketOpcode.CHECK_CASH);
      pkt.dispatch();
    }
  },

  leave(canvas?: GameCanvas) {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
  },

  buySelected() {
    if (this.selectedIdx < 0) return;
    const items = this.filteredItems;
    const item = items[this.scroll + this.selectedIdx];
    if (!item) return;
    if (!SessionManager.isConnected()) return;

    if (!confirm(`Buy "${item.name}" for ${item.price} NX?`)) return;

    // CASHSHOP_OPERATION: writeByte(3=BUY) + writeInt(nxType) + writeInt(sn) + writeShort(qty)
    const pkt = new OutPacket(OutPacketOpcode.CASHSHOP_OPERATION);
    (pkt as any).writeByte(3);          // BUY action
    (pkt as any).writeInt(0);           // NX type (0 = Nexon Cash)
    (pkt as any).writeInt(item.sn);     // serial number
    (pkt as any).writeShort(1);         // quantity
    pkt.dispatch();
  },

  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;

    // Item grid click
    const gridX = this.x + 140; const gridY = this.y + 55;
    const cols = 4; const cellW = 130; const cellH = 100;
    const items = this.filteredItems;
    const perPage = cols * 4;
    const visible = items.slice(this.scroll * cols, this.scroll * cols + perPage);

    for (let i = 0; i < visible.length; i++) {
      const col = i % cols; const row = Math.floor(i / cols);
      const cx = gridX + col * cellW; const cy = gridY + row * cellH;
      if (mx >= cx && mx < cx + cellW - 4 && my >= cy && my < cy + cellH - 4) {
        this.selectedIdx = i;
        return true;
      }
    }
    return true;
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    // Background
    canvas.context.save();
    canvas.context.fillStyle = 'rgba(8,12,28,0.98)';
    canvas.context.fillRect(this.x, this.y, this.W, this.H);
    canvas.context.strokeStyle = '#AA8833';
    canvas.context.lineWidth = 2;
    canvas.context.strokeRect(this.x, this.y, this.W, this.H);
    canvas.context.lineWidth = 1;
    canvas.context.restore();

    // Title
    canvas.drawText({ text: '✦ CASH SHOP ✦', color: '#FFDD44', x: this.x + 10, y: this.y + 18, fontSize: 14 });

    // NX balance
    canvas.drawText({ text: `NX: ${this.nx.toLocaleString()}`, color: '#FFAA00', x: this.x + this.W - 170, y: this.y + 18, fontSize: 11 });
    canvas.drawText({ text: `MP: ${this.mp.toLocaleString()}`, color: '#AA88FF', x: this.x + this.W - 80, y: this.y + 18, fontSize: 11 });

    // Category tabs
    CATEGORIES.forEach((cat, i) => {
      const tx = this.x + 140 + i * 110;
      const active = this.activeTab === cat;
      canvas.context.save();
      canvas.context.fillStyle = active ? 'rgba(180,140,40,0.9)' : 'rgba(40,50,80,0.8)';
      canvas.context.fillRect(tx, this.y + 28, 106, 20);
      canvas.context.strokeStyle = active ? '#FFCC44' : '#334466';
      canvas.context.strokeRect(tx, this.y + 28, 106, 20);
      canvas.context.restore();
      canvas.drawText({ text: cat, color: active ? '#000000' : '#AAAACC', x: tx + 10, y: this.y + 41, fontSize: 10 });
    });

    // Sidebar (categories)
    canvas.context.save();
    canvas.context.fillStyle = 'rgba(20,25,50,0.9)';
    canvas.context.fillRect(this.x + 4, this.y + 50, 130, this.H - 90);
    canvas.context.restore();

    canvas.drawText({ text: 'Categories', color: '#FFCC44', x: this.x + 10, y: this.y + 66, fontSize: 10 });
    CATEGORIES.forEach((cat, i) => {
      const active = this.activeTab === cat;
      canvas.drawText({
        text: (active ? '▶ ' : '  ') + cat,
        color: active ? '#FFDD88' : '#888899',
        x: this.x + 10, y: this.y + 82 + i * 20, fontSize: 10,
      });
    });

    // Item grid
    const gridX = this.x + 140; const gridY = this.y + 55;
    const cols = 4; const cellW = 130; const cellH = 100;
    const items = this.filteredItems;
    const perPage = cols * 4;
    const pageItems = items.slice(this.scroll * cols, this.scroll * cols + perPage);

    if (this.loading) {
      canvas.drawText({ text: 'Loading...', color: '#888888', x: gridX + 150, y: gridY + 150, fontSize: 13 });
    } else if (pageItems.length === 0) {
      canvas.drawText({ text: 'No items in this category', color: '#666688', x: gridX + 80, y: gridY + 150, fontSize: 12 });
    }

    pageItems.forEach((item, i) => {
      const col = i % cols; const row = Math.floor(i / cols);
      const cx = gridX + col * cellW; const cy = gridY + row * cellH;
      const isSelected = i === this.selectedIdx;

      canvas.context.save();
      canvas.context.fillStyle = isSelected ? 'rgba(180,140,20,0.3)' : 'rgba(20,25,50,0.8)';
      canvas.context.strokeStyle = isSelected ? '#FFCC44' : '#334466';
      canvas.context.fillRect(cx, cy, cellW - 4, cellH - 4);
      canvas.context.strokeRect(cx, cy, cellW - 4, cellH - 4);

      // Item icon
      const icon = item.icon ?? getItemIconSync(item.itemId);
      if (icon) {
        try { canvas.context.drawImage(icon, cx + 44, cy + 8, 40, 40); } catch (_) {}
      } else {
        canvas.context.fillStyle = '#223355';
        canvas.context.fillRect(cx + 44, cy + 8, 40, 40);
      }

      // Item name (truncated)
      const name = item.name.length > 14 ? item.name.substring(0, 13) + '…' : item.name;
      canvas.context.restore();
      canvas.drawText({ text: name, color: '#FFFFFF', x: cx + (cellW - 4) / 2, y: cy + 56, fontSize: 9, align: 'center' } as any);
      canvas.drawText({ text: `${item.price} NX`, color: '#FFAA00', x: cx + (cellW - 4) / 2, y: cy + 70, fontSize: 9, align: 'center' } as any);
    });

    // Scroll indicator
    const totalPages = Math.ceil(items.length / (cols * 4));
    if (totalPages > 1) {
      canvas.drawText({ text: `Page ${this.scroll + 1}/${totalPages}`, color: '#888888', x: this.x + this.W - 170, y: this.y + this.H - 14, fontSize: 9 });
    }

    // Selected item detail
    if (this.selectedIdx >= 0 && this.selectedIdx < pageItems.length) {
      const sel = pageItems[this.selectedIdx];
      canvas.drawText({ text: sel.name, color: '#FFDD88', x: this.x + 10, y: this.y + this.H - 50, fontSize: 11 });
      canvas.drawText({ text: `Price: ${sel.price} NX`, color: '#FFAA00', x: this.x + 10, y: this.y + this.H - 34, fontSize: 10 });
      canvas.drawText({ text: 'Buy', color: '#AAFFAA', x: this.x + this.W - 68, y: this.y + this.H - 14, fontSize: 10 });
    } else {
      canvas.drawText({ text: 'Click an item to select', color: '#555577', x: this.x + 10, y: this.y + this.H - 34, fontSize: 10 });
    }

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UICashShop;
