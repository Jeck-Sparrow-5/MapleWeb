import WZManager from "../../wz-utils/WZManager";
import WZFiles from "../../Constants/enums/WZFiles";
import ClickManager from "../ClickManager";
import { MapleStanceButton } from "../MapleStanceButton";
import DragableMenu from "./DragableMenu";
import { MapleInventoryType } from "../../Constants/Inventory/MapleInventory";
import { CameraInterface } from "../../Camera";
import { Position } from "../../Effects/DamageIndicator";
import GameCanvas from "../../GameCanvas";

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
          let icon = null;
          if (item.node && item.node.iconRaw) {
            try {
              icon = item.node.iconRaw.nGetImage();
            } catch (e) {
              console.warn(`Failed to get iconRaw image for item ${item.itemId}`);
            }
          }
          if (!icon && item.node && item.node.info && item.node.info.iconRaw) {
            try {
              icon = item.node.info.iconRaw.nGetImage();
            } catch (e) {
              console.warn(`Failed to get info.iconRaw image for item ${item.itemId}`);
            }
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
    return this.handleTabClick(mouseX, mouseY);
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
          onClick: () => {
            console.log("drop meso not implemented");
          },
        });
        ClickManager.addButton(dropMesoButton);
        this.buttons = [dropMesoButton];
      }
    } catch (e) {
      console.error("Error loading meso button:", e);
      this.buttons = [];
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
  }
}

export default InventoryMenuSprite;
