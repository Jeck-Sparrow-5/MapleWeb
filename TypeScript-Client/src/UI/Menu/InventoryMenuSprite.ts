import WZManager from "../../wz-utils/WZManager";
import WZFiles from "../../Constants/enums/WZFiles";
import SessionManager from "../../SessionManager";
import { getItemIconSync } from "../../wz-utils/ItemIconLoader";
import ClickManager from "../ClickManager";
import { MapleStanceButton } from "../MapleStanceButton";
import DragableMenu from "./DragableMenu";
import TooltipRenderer from "../TooltipRenderer";
import { MapleInventoryType } from "../../Constants/Inventory/MapleInventory";
import { CameraInterface } from "../../Camera";
import { Position } from "../../Effects/DamageIndicator";
import GameCanvas from "../../GameCanvas";
import { getItemNameSync } from "../../wz-utils/ItemNameLoader";
import { ItemSortPacket } from "../../Net/Packets/ItemPackets";

class InventoryMenuSprite extends DragableMenu {
  opts: any;
  inventoryNode: any;
  charecter: any;
  currentTab: MapleInventoryType = MapleInventoryType.EQUIP;
  buttons: MapleStanceButton[] = [];
  isNotFirstDraw: boolean = false;
  destroyed: boolean = false;
  delay: number = 0;
  id: number = 0;
  originalX: number = 0;
  originalY: number = 0;
  // Holds the full composite background image.
  fullBackgroundImage: any = null;

  static async fromOpts(opts: any) {
    const object = new InventoryMenuSprite(opts);
    await object.load();
    return object;
  }

  constructor(opts: any) {
    super(opts);
    this.opts = opts;
  }

  async load() {
    const opts = this.opts;
    this.id = opts.id;
    this.charecter = opts.charecter;
    this.x = opts.x;
    this.y = opts.y;
    this.originalX = opts.x;
    this.originalY = opts.y;
    this.isHidden = opts.isHidden;
    this.charecter = opts.charecter;

    try {
      this.inventoryNode = await WZManager.get(`${WZFiles.UI}/UIWindow.img/Item`);
      console.log("Loaded inventory UI node:", this.inventoryNode);
    } catch (e) {
      console.error("Error loading inventory UI node:", e);
    }

    this.currentTab = MapleInventoryType.EQUIP;
    this.buttons = [];

    // Load the full composite background image.
    await this.loadBackground();
    ClickManager.addDragableMenu(this);
  }

  async loadBackground() {
    if (!this.inventoryNode || !this.inventoryNode.FullBackgrnd) {
      console.error("Missing inventory background node");
      return;
    }
    try {
      this.fullBackgroundImage = this.inventoryNode.FullBackgrnd.nGetImage();
    } catch (e) {
      console.error("Error loading inventory background:", e);
    }
  }

  getRect(camera: CameraInterface) {
    if (!this.fullBackgroundImage) {
      return { x: this.x, y: this.y, width: 300, height: 400 };
    }
    // Calculate the width of one region. We assume the composite image is split into 4 parts.
    const cropWidth = this.fullBackgroundImage.width / 4;
    const cropHeight = this.fullBackgroundImage.height;
    return { x: this.x, y: this.y, width: cropWidth, height: cropHeight };
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach(button => (button.isHidden = isHidden));
  }

  // Draw only the leftmost portion of the composite background (cutting off the right side)
  drawBackground(canvas: GameCanvas) {
    if (!this.fullBackgroundImage) return;
    const totalRegions = 5;

    // Always use the leftmost region (sx = 0) to preserve the original left margin.
    canvas.drawImage({
      img: this.fullBackgroundImage,
      sx: 0,
      sy: 0,
      dx: this.x,
      dy: this.y,
    });
  }

  // Merge stackable items (for non-EQUIP tabs) by summing their quantities.
  mergeStackableItems(items: any[]) {
    const mergedMap = new Map();
    for (const item of items) {
      const qty = item.quantity || 1;
      const key = item.itemId;
      if (this.currentTab === MapleInventoryType.EQUIP) {
        mergedMap.set(Symbol(), item);
      } else {
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          existing.quantity = (existing.quantity || 1) + qty;
        } else {
          mergedMap.set(key, { ...item, quantity: qty });
        }
      }
    }
    return Array.from(mergedMap.values());
  }

  drawItems(canvas: GameCanvas) {
    if (!this.charecter || !this.charecter.inventory) {
      console.warn("Character or inventory not available");
      return;
    }

    let items = [];
    switch (this.currentTab) {
      case MapleInventoryType.EQUIP:
        items = this.charecter.inventory.equip || [];
        break;
      case MapleInventoryType.USE:
        items = this.charecter.inventory.use || [];
        break;
      case MapleInventoryType.SETUP:
        items = this.charecter.inventory.setup || [];
        break;
      case MapleInventoryType.ETC:
        items = this.charecter.inventory.etc || [];
        break;
      case MapleInventoryType.CASH:
        items = this.charecter.inventory.cash || [];
        break;
    }

    console.log(`Drawing ${items.length} items for tab ${this.currentTab}`);

    if (this.currentTab !== MapleInventoryType.EQUIP) {
      items = this.mergeStackableItems(items);
    }

    // Define the starting position and layout for item slots.
    const slotStartX = this.x + 14;
    const slotStartY = this.y + 55;
    const slotColumns = 4;
    const slotRows = 6;
    const slotSize = 30;
    const slotPadding = 4;

    for (let row = 0; row < slotRows; row++) {
      for (let col = 0; col < slotColumns; col++) {
        const slotIndex = row * slotColumns + col;
        const slotX = slotStartX + col * (slotSize + slotPadding);
        const slotY = slotStartY + row * (slotSize + slotPadding);

        // Draw slot background (using .wz file image if available)
        if (this.inventoryNode && this.inventoryNode.SlotBackgrnd) {
          try {
            const slotImg = this.inventoryNode.SlotBackgrnd.nGetImage();
            canvas.drawImage({
              img: slotImg,
              dx: slotX,
              dy: slotY,
            });
          } catch (e) {
            canvas.drawRect({
              x: slotX,
              y: slotY,
              width: slotSize,
              height: slotSize,
              color: "transparent",
              alpha: 0.5,
            });
          }
        } else {
          canvas.drawRect({
            x: slotX,
            y: slotY,
            width: slotSize,
            height: slotSize,
            color: "transparent",
            alpha: 0.5,
          });
        }

        // Draw the item in this slot if present.
        if (slotIndex < items.length && items[slotIndex]) {
          const item = items[slotIndex];
          // Try Item.wz icon first, then fall back to node-attached icon
          let icon = getItemIconSync(item.itemId);
          if (!icon && item.node?.iconRaw) {
            try { icon = item.node.iconRaw.nGetImage(); } catch (_) {}
          }
          if (!icon && item.node?.info?.iconRaw) {
            try { icon = item.node.info.iconRaw.nGetImage(); } catch (_) {}
          }

          if (icon) {
            try {
              canvas.drawImage({
                img: icon,
                dx: slotX + (slotSize - icon.width) / 2,
                dy: slotY + (slotSize - icon.height) / 2,
              });
            } catch (e) {
              console.warn(`Failed to draw icon for item ${item.itemId}`);
            }
          } else {
            canvas.drawText({
              text: `${item.itemId}`,
              x: slotX + slotSize / 2,
              y: slotY + slotSize / 2,
              color: "#FFFFFF",
              align: "center",
              fontSize: 8,
            });
          }

          // Draw quantity in the lower-right if greater than 1.
          const quantity = item.quantity || 1;
          if (quantity > 1) {
            canvas.drawText({
              text: quantity.toString(),
              x: slotX + slotSize - 3,
              y: slotY + slotSize - 3,
              color: "#FFFFFF",
              align: "right",
              fontSize: 12,
            });
          }
        }
      }
    }

    // Draw the tabs over the items.
    this.drawTabs(canvas);
  }

  drawTabs(canvas: GameCanvas) {
    const tabStartX = this.x + 3;
    const tabStartY = this.y + 25;
    const tabWidth = 29;
    const tabHeight = 18;
    const tabSpacing = 1;

    const tabs = [
      { type: MapleInventoryType.EQUIP, label: "Equip" },
      { type: MapleInventoryType.USE, label: "Use" },
      { type: MapleInventoryType.SETUP, label: "Setup" },
      { type: MapleInventoryType.ETC, label: "Etc" },
      { type: MapleInventoryType.CASH, label: "Cash" }
    ];

    tabs.forEach((tab, index) => {
      const tabX = tabStartX + index * (tabWidth + tabSpacing);
      const isActive = this.currentTab === tab.type;

      if (this.inventoryNode && this.inventoryNode.Tab) {
        try {
          const tabImg = isActive
            ? this.inventoryNode.Tab.tabSelected.nGetImage()
            : this.inventoryNode.Tab.tabNormal.nGetImage();
          canvas.drawImage({
            img: tabImg,
            dx: tabX,
            dy: tabStartY,
          });
        } catch (e) {
          canvas.drawRect({
            x: tabX,
            y: tabStartY,
            width: tabWidth,
            height: tabHeight,
            color: isActive ? "#5566AA" : "#333333",
            alpha: isActive ? 0.9 : 0.6,
          });
        }
      } else {
        canvas.drawRect({
          x: tabX,
          y: tabStartY,
          width: tabWidth,
          height: tabHeight,
          color: isActive ? "#5566AA" : "#333333",
          alpha: isActive ? 0.9 : 0.6,
        });
      }

      canvas.drawText({
        text: tab.label,
        x: tabX + tabWidth / 2,
        y: tabStartY + tabHeight / 2 - 5,
        color: "#FFFFFF",
        align: "center",
        fontSize: 10,
      });
    });
  }

  handleTabClick(mouseX: number, mouseY: number) {
    const tabStartX = this.x + 3;
    const tabStartY = this.y + 25;
    const tabWidth = 29;
    const tabHeight = 18;
    const tabSpacing = 1;

    const tabs = [
      MapleInventoryType.EQUIP,
      MapleInventoryType.USE,
      MapleInventoryType.SETUP,
      MapleInventoryType.ETC,
      MapleInventoryType.CASH
    ];

    for (let i = 0; i < tabs.length; i++) {
      const tabX = tabStartX + i * (tabWidth + tabSpacing);
      if (
        mouseX >= tabX &&
        mouseX < tabX + tabWidth &&
        mouseY >= tabStartY &&
        mouseY < tabStartY + tabHeight
      ) {
        this.currentTab = tabs[i];
        console.log(`Switched to tab: ${this.currentTab}`);
        return true;
      }
    }
    return false;
  }

  onMouseDown(mouseX: number, mouseY: number) {
    if (this.isHidden) return false;
    if (this.handleTabClick(mouseX, mouseY)) return true;

    // Double-click detection for item use/equip
    const now = Date.now();
    const slotStartX = this.x + 14;
    const slotStartY = this.y + 55;
    const slotSize = 30;
    const slotPadding = 4;
    const cols = 4;
    const rows = 6;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = slotStartX + col * (slotSize + slotPadding);
        const sy = slotStartY + row * (slotSize + slotPadding);
        if (mouseX >= sx && mouseX < sx + slotSize && mouseY >= sy && mouseY < sy + slotSize) {
          const slotIndex = row * cols + col;
          const items = this.getItemsForCurrentTab();
          if (slotIndex < items.length && items[slotIndex]) {
            const item = items[slotIndex];
            if ((this as any)._lastClickSlot === slotIndex && now - (this as any)._lastClickTime < 400) {
              // Double-click — use or equip
              this.useOrEquipItem(item, slotIndex);
            }
            (this as any)._lastClickSlot = slotIndex;
            (this as any)._lastClickTime = now;
          }
          return true;
        }
      }
    }
    return false;
  }

  private getItemsForCurrentTab(): any[] {
    const inv = this.charecter?.inventory;
    if (!inv) return [];
    switch (this.currentTab) {
      case 1: return inv.equip || [];  // MapleInventoryType.EQUIP = 1
      case 2: return inv.use || [];
      case 3: return inv.setup || [];
      case 4: return inv.etc || [];
      case 5: return inv.cash || [];
      default: return inv.equip || [];
    }
  }

  private async useOrEquipItem(item: any, slotIndex: number) {
    const { default: SessionManager } = await import('../../SessionManager');
    if (!SessionManager.isConnected()) return;
    const itemId = item.itemId;
    const invType = this.currentTabNumber();
    if (invType === 2) {
      // USE tab — use item (potion etc.)
      const { UseItemPacket } = await import('../../Net/Packets/ItemPackets');
      new UseItemPacket(slotIndex + 1, itemId).dispatch();
    } else if (invType === 1) {
      // EQUIP tab — equip item
      const { EquipItemPacket } = await import('../../Net/Packets/ItemPackets');
      new EquipItemPacket(slotIndex + 1, -1).dispatch(); // -1 = auto-equip
    }
  }

  private currentTabNumber(): number {
    switch (this.currentTab) {
      case MapleInventoryType.EQUIP: return 1;
      case MapleInventoryType.USE:   return 2;
      case MapleInventoryType.SETUP: return 3;
      case MapleInventoryType.ETC:   return 4;
      case MapleInventoryType.CASH:  return 5;
      default: return 1;
    }
  }

  async drawText(canvas: GameCanvas) {
    const mesosWithCommas = this.charecter.inventory.mesos
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    canvas.drawText({
      text: mesosWithCommas,
      x: this.x + 96,
      y: this.y + 270,
    });
  }

  loadButtons(canvas: GameCanvas) {
    try {
      if (
        this.inventoryNode &&
        this.inventoryNode.BtCoin &&
        this.inventoryNode.BtCoin.nChildren &&
        this.inventoryNode.BtCoin.nChildren.length > 0
      ) {
        const dropMesoButton = new MapleStanceButton(canvas, {
          x: this.x + 8,
          y: this.y + 267,
          img: this.inventoryNode.BtCoin.nChildren,
          isRelativeToCamera: true,
          isPartOfUI: true,
          onClick: async () => {
            const amount = parseInt(prompt('Amount of mesos to drop:') ?? '0');
            if (!amount || amount <= 0) return;
            if (SessionManager.isConnected()) {
              const { DropItemPacket } = await import('../../Net/Packets/ItemPackets');
              new DropItemPacket(0, 0, 0, amount).dispatch();
            } else {
              this.charecter.inventory.mesos = Math.max(0, this.charecter.inventory.mesos - amount);
            }
          },
        });
        ClickManager.addButton(dropMesoButton);
        this.buttons = [dropMesoButton];
      }
      // Sort button
      if (this.inventoryNode?.BtSortNormal) {
        const sortBtn = new MapleStanceButton(canvas, {
          x: this.x + 130, y: this.y + 267,
          img: this.inventoryNode.BtSortNormal.nChildren,
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => {
            if (SessionManager.isConnected()) {
              new ItemSortPacket(this.currentTabNumber()).dispatch();
            } else {
              this.charecter.inventory[this.currentTabKey()]?.sort((a: any, b: any) => a.itemId - b.itemId);
            }
          },
        });
        ClickManager.addButton(sortBtn);
        this.buttons.push(sortBtn);
      }

      // Gather button (merge stacks)
      if (this.inventoryNode?.BtGather) {
        const gatherBtn = new MapleStanceButton(canvas, {
          x: this.x + 100, y: this.y + 267,
          img: this.inventoryNode.BtGather.nChildren,
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => {
            if (SessionManager.isConnected()) {
              // Opcode 52 = GATHER_RESULT inbound; outbound is ITEM_SORT2 (70)
              import('../../Net/OutPacket').then(({ OutPacket, OutPacketOpcode }) => {
                const pkt = new OutPacket(OutPacketOpcode.ITEM_SORT2);
                (pkt as any).writeByte(this.currentTabNumber());
                pkt.dispatch();
              });
            }
          },
        });
        ClickManager.addButton(gatherBtn);
        this.buttons.push(gatherBtn);
      }
    } catch (e) {
      console.error("Error loading meso button:", e);
      this.buttons = [];
    }
  }

  private currentTabKey(): string {
    switch (this.currentTab) {
      case MapleInventoryType.EQUIP: return 'equip';
      case MapleInventoryType.USE:   return 'use';
      case MapleInventoryType.SETUP: return 'setup';
      case MapleInventoryType.ETC:   return 'etc';
      case MapleInventoryType.CASH:  return 'cash';
      default: return 'equip';
    }
  }

  moveTo(position: Position) {
    const deltaX = position.x - this.x;
    const deltaY = position.y - this.y;
    this.x = position.x;
    this.y = position.y;
    this.buttons.forEach((button) => {
      button.x += deltaX;
      button.y += deltaY;
    });
    this.loadBackground();
    this.originalX = position.x;
    this.originalY = position.y;
  }

  destroy() {
    this.destroyed = true;
  }

  update(msPerTick: number) {
    this.delay += msPerTick;
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    if (this.isHidden) return;
    if (!this.isNotFirstDraw) {
      this.loadButtons(canvas);
      this.isNotFirstDraw = true;
    }
    this.drawBackground(canvas);
    this.drawItems(canvas);
    this.drawText(canvas);
    this.buttons.forEach((obj) => {
      obj.draw(canvas, camera, lag, msPerTick, tdelta);
    });

    // Tooltip on hover
    const mx = canvas.mouseX;
    const my = canvas.mouseY;
    if (mx !== undefined && my !== undefined) {
      const slotStartX = this.x + 14;
      const slotStartY = this.y + 55;
      const slotSize = 30;
      const slotPadding = 4;
      const items = this.getItemsForCurrentTab();
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 4; col++) {
          const sx = slotStartX + col * (slotSize + slotPadding);
          const sy = slotStartY + row * (slotSize + slotPadding);
          if (mx >= sx && mx < sx + slotSize && my >= sy && my < sy + slotSize) {
            const idx = row * 4 + col;
            const item = items[idx];
            if (item) {
              TooltipRenderer.drawItemTooltip(canvas, item.itemId, getItemNameSync(item.itemId) || `Item ${item.itemId}`, mx, my);
            }
          }
        }
      }
    }
  }
}

export default InventoryMenuSprite;
