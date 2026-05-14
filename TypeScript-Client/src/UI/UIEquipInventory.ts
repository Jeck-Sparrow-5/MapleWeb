import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { Position } from '../Effects/DamageIndicator';
import MyCharacter from '../MyCharacter';
import SessionManager from '../SessionManager';
import { getItemNameSync } from '../wz-utils/ItemNameLoader';
import { getItemIconSync } from '../wz-utils/ItemIconLoader';
import TooltipRenderer from './TooltipRenderer';

// Full v83 equip slot layout (column, row) relative to window origin
// Using slot names matching server slot IDs (negative = equipped)
const SLOTS: { name: string; label: string; slotId: number; cx: number; cy: number; tab: number }[] = [
  // Equipment tab (tab 0)
  { name: 'hat',      label: 'Hat',      slotId: -1,   cx: 73,  cy: 28,  tab: 0 },
  { name: 'face',     label: 'Face',     slotId: -2,   cx: 40,  cy: 60,  tab: 0 },
  { name: 'eye',      label: 'Eye',      slotId: -3,   cx: 107, cy: 60,  tab: 0 },
  { name: 'earring',  label: 'Ear',      slotId: -4,   cx: 40,  cy: 28,  tab: 0 },
  { name: 'top',      label: 'Top',      slotId: -5,   cx: 73,  cy: 95,  tab: 0 },
  { name: 'gloves',   label: 'Glove',    slotId: -6,   cx: 107, cy: 130, tab: 0 },
  { name: 'bottom',   label: 'Bot',      slotId: -7,   cx: 73,  cy: 130, tab: 0 },
  { name: 'shoes',    label: 'Shoe',     slotId: -8,   cx: 73,  cy: 165, tab: 0 },
  { name: 'cape',     label: 'Cape',     slotId: -9,   cx: 40,  cy: 95,  tab: 0 },
  { name: 'weapon',   label: 'Wep',      slotId: -10,  cx: 107, cy: 95,  tab: 0 },
  { name: 'shield',   label: 'Shield',   slotId: -11,  cx: 40,  cy: 130, tab: 0 },
  { name: 'ring1',    label: 'Ring',     slotId: -12,  cx: 40,  cy: 195, tab: 0 },
  { name: 'ring2',    label: 'Ring',     slotId: -13,  cx: 73,  cy: 195, tab: 0 },
  { name: 'ring3',    label: 'Ring',     slotId: -15,  cx: 107, cy: 195, tab: 0 },
  { name: 'ring4',    label: 'Ring',     slotId: -16,  cx: 40,  cy: 228, tab: 0 },
  { name: 'pendant',  label: 'Pend',     slotId: -17,  cx: 107, cy: 165, tab: 0 },
  { name: 'belt',     label: 'Belt',     slotId: -49,  cx: 73,  cy: 228, tab: 0 },
  { name: 'medal',    label: 'Medal',    slotId: -50,  cx: 40,  cy: 262, tab: 0 },
  { name: 'emblem',   label: 'Emblem',   slotId: -18,  cx: 107, cy: 228, tab: 0 },
  { name: 'shoulder', label: 'Shldr',    slotId: -19,  cx: 107, cy: 262, tab: 0 },
];

type TabType = 'equip' | 'cash' | 'pet' | 'android';
const TABS: TabType[] = ['equip', 'cash', 'pet', 'android'];

class UIEquipInventory extends DragableMenu {
  bgImg: any = null;
  buttons: MapleStanceButton[] = [];
  tabBtns: MapleStanceButton[] = [];
  loaded = false;
  currentTab: TabType = 'equip';
  selectedSlot = -1;
  lastClickTime = 0;
  lastClickSlot = -1;
  readonly W = 175;
  readonly H = 310;

  static async fromOpts(opts: any) {
    const o = new UIEquipInventory(opts);
    await o.load(opts.canvas);
    return o;
  }

  async load(canvas: GameCanvas) {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('Equip')?.nGetImage?.() ?? null;

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

    // Tab buttons
    const tabLabels = ['Equip', 'Cash', 'Pet', 'Android'];
    TABS.forEach((tab, i) => {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 4 + i * 42,
        y: this.y + 22,
        img: uiWin?.nGet('Item')?.nGet('Tab')?.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => { this.currentTab = tab; this.selectedSlot = -1; },
      });
      ClickManager.addButton(btn);
      this.tabBtns.push(btn);
      this.buttons.push(btn);
    });

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

  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;
    const now = Date.now();
    const visSlots = SLOTS.filter((s) => s.tab === TABS.indexOf(this.currentTab));
    for (const slot of visSlots) {
      const sx = this.x + slot.cx;
      const sy = this.y + slot.cy;
      if (mx >= sx && mx < sx + 28 && my >= sy && my < sy + 28) {
        if (this.lastClickSlot === slot.slotId && now - this.lastClickTime < 400) {
          this.unequipSlot(slot.slotId);
        }
        this.selectedSlot = slot.slotId;
        this.lastClickSlot = slot.slotId;
        this.lastClickTime = now;
        return true;
      }
    }
    return false;
  }

  private async unequipSlot(slotId: number) {
    if (!SessionManager.isConnected()) return;
    const { UnequipItemPacket } = await import('../Net/Packets/ItemPackets');
    new UnequipItemPacket(slotId, 0).dispatch();
  }

  private getEquippedItems(): Map<number, { itemId: number }> {
    const map = new Map<number, { itemId: number }>();
    const equips = (MyCharacter as any).equips ?? [];
    equips.forEach((e: any) => {
      const id = e.slot ?? e.slotId;
      if (id !== undefined) map.set(id, { itemId: e.itemId ?? e });
    });
    return map;
  }

  update(_ms: number) {}

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.loaded) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
      canvas.context.fillRect(this.x, this.y, this.W, this.H);
      canvas.context.strokeStyle = '#556688';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H);
      canvas.context.restore();
    }

    // Tab labels
    TABS.forEach((tab, i) => {
      const active = tab === this.currentTab;
      canvas.context.save();
      canvas.context.fillStyle = active ? 'rgba(80,100,160,0.9)' : 'rgba(40,40,70,0.7)';
      canvas.context.fillRect(this.x + 4 + i * 42, this.y + 22, 38, 14);
      canvas.context.fillStyle = '#FFFFFF';
      canvas.context.font = '9px Arial';
      canvas.context.textAlign = 'center';
      canvas.context.fillText(['Eq','$','Pet','Drd'][i], this.x + 23 + i * 42, this.y + 32);
      canvas.context.textAlign = 'left';
      canvas.context.restore();
    });

    canvas.drawText({ text: 'Equipment', color: '#FFDD88', x: this.x + 8, y: this.y + 14, fontSize: 11 });

    const equipped = this.getEquippedItems();
    const tabIdx = TABS.indexOf(this.currentTab);
    const visSlots = SLOTS.filter((s) => s.tab === tabIdx === (s.tab === 0));

    (tabIdx === 0 ? SLOTS : []).forEach((slot) => {
      const sx = this.x + slot.cx;
      const sy = this.y + slot.cy;
      const isSelected = slot.slotId === this.selectedSlot;
      const item = equipped.get(slot.slotId);

      canvas.context.save();
      canvas.context.fillStyle = isSelected ? 'rgba(100,130,200,0.8)' : 'rgba(40,50,80,0.6)';
      canvas.context.strokeStyle = isSelected ? '#AADDFF' : '#334455';
      canvas.context.fillRect(sx, sy, 28, 28);
      canvas.context.strokeRect(sx, sy, 28, 28);

      if (item) {
        const icon = getItemIconSync(item.itemId);
        if (icon) {
          try { canvas.context.drawImage(icon, sx + 1, sy + 1, 26, 26); } catch (_) {}
        } else {
          canvas.context.fillStyle = '#446688';
          canvas.context.fillRect(sx + 2, sy + 2, 24, 24);
        }
        // Tooltip
        const mx = (canvas as any).mouseX;
        const my = (canvas as any).mouseY;
        if (mx >= sx && mx < sx + 28 && my >= sy && my < sy + 28) {
          TooltipRenderer.drawItemTooltip(canvas, item.itemId, getItemNameSync(item.itemId), mx, my);
        }
      } else {
        canvas.context.fillStyle = '#444466';
        canvas.context.font = '7px Arial';
        canvas.context.textAlign = 'center';
        canvas.context.fillText(slot.label, sx + 14, sy + 16);
        canvas.context.textAlign = 'left';
      }
      canvas.context.restore();
    });

    if (tabIdx !== 0) {
      canvas.drawText({ text: 'No items', color: '#666688', x: this.x + 60, y: this.y + 150 });
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }
}

export default UIEquipInventory;
