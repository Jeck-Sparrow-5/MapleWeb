import WZManager from "../../wz-utils/WZManager";
import WZFiles from "../../Constants/enums/WZFiles";
import GeneralMenuSprite from "./GeneralMenuSprite";
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
  generalMenuSprites: GeneralMenuSprite[] = [];
  buttons: MapleStanceButton[] = [];
  isNotFirstDraw: boolean = false;
  equipNode: any;
  useNode: any;
  setupNode: any;
  etcNode: any;
  cashNode: any;
  destroyed: boolean = false;
  delay: number = 0;
  id: number = 0;
  originalX: number = 0;
  originalY: number = 0;

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
    this.generalMenuSprites = [];
    this.buttons = [];

    await this.loadBackgound();
    ClickManager.addDragableMenu(this);
  }

  getRect(camera: CameraInterface) {
    if (!this.inventoryNode || !this.inventoryNode.FullBackgrnd) {
      return {
        x: this.x,
        y: this.y,
        width: 300,
        height: 400,
      };
    }
    
    return {
      x: this.x,
      y: this.y,
      width: this.inventoryNode.FullBackgrnd.nGetImage().width,
      height: this.inventoryNode.FullBackgrnd.nGetImage().height,
    };
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach((button) => {
      button.isHidden = isHidden;
    });
  }

  async loadBackgound() {
    if (!this.inventoryNode || !this.inventoryNode.FullBackgrnd) {
      console.error("Missing inventory background node");
      return;
    }
    
    try {
      this.generalMenuSprites.push(
        await GeneralMenuSprite.fromOpts({
          wzImage: this.inventoryNode.FullBackgrnd,
          x: this.x,
          y: this.y,
          z: 1,
        })
      );
    } catch (e) {
      console.error("Error loading inventory background:", e);
    }
  }

  drawItems(canvas: GameCanvas) {
    if (!this.charecter || !this.charecter.inventory) {
      console.warn("Character or inventory not available");
      return;
    }
    
    // Get current inventory items based on selected tab
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
    
    // Get slot positions from the WZ file if possible, or use default values
    const slotStartX = this.x + 14;
    const slotStartY = this.y + 55;
    const slotColumns = 4;  // Number of slots per row
    const slotRows = 6;     // Number of slots per column
    const slotSize = 30;    // Size of each slot in pixels
    const slotPadding = 4;  // Padding between slots
    
    // Draw inventory slots and items
    for (let row = 0; row < slotRows; row++) {
      for (let col = 0; col < slotColumns; col++) {
        const slotIndex = row * slotColumns + col;
        const slotX = slotStartX + col * (slotSize + slotPadding);
        const slotY = slotStartY + row * (slotSize + slotPadding);
        
        // Try to draw slot from WZ file if available
        if (this.inventoryNode && this.inventoryNode.SlotBackgrnd) {
          try {
            const slotImg = this.inventoryNode.SlotBackgrnd.nGetImage();
            canvas.drawImage({
              img: slotImg,
              dx: slotX,
              dy: slotY,
            });
          } catch (e) {
            // Fallback to drawing a simple slot rectangle
            canvas.drawRect({
              x: slotX-3,
              y: slotY-6,
              width: slotSize,
              height: slotSize,
              color: "transparent",
              alpha: 0.5,
            });
          }
        } else {
          // drawing the actual inventory slot rectangle
          canvas.drawRect({
            x: slotX-3,
            y: slotY-6,
            width: slotSize,
            height: slotSize,
            color: "transparent",
            alpha: 0.5,
          });
        }
        
        // Draw item if exists in this slot
        if (slotIndex < items.length && items[slotIndex]) {
          const item = items[slotIndex];
          
          // Try to get item icon
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
          
          // If we have an icon, draw it
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
            
            // Draw quantity for stackable items
            if (item.quantity > 1) {
              canvas.drawText({
                text: item.quantity.toString(),
                x: slotX + slotSize - 5,
                y: slotY + slotSize - 5,
                color: "#FFFFFF",
                align: "right",
                fontSize: 10,
              });
            }
          } else {
            // Draw placeholder text if no icon
            canvas.drawText({
              text: `${item.itemId}`,
              x: slotX + slotSize / 2,
              y: slotY + slotSize / 2,
              color: "#FFFFFF",
              align: "center",
              fontSize: 8,
            });
          }
        }
      }
    }
    
    // Draw tabs
    this.drawTabs(canvas);
  }
  
  drawTabs(canvas: GameCanvas) {
    // Define tab positions based on the official UI
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
    
    // Draw tab buttons using the style from official UI
    tabs.forEach((tab, index) => {
      const tabX = tabStartX + index * (tabWidth + tabSpacing);
      const isActive = this.currentTab === tab.type;
      
      // Try to draw tab from WZ file if available
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
          // Fallback to drawing a simple tab rectangle
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
        // Fallback to drawing a simple tab rectangle
        canvas.drawRect({
          x: tabX,
          y: tabStartY,
          width: tabWidth,
          height: tabHeight,
          color: isActive ? "#5566AA" : "#333333",
          alpha: isActive ? 0.9 : 0.6,
        });
      }
      
      // Draw tab label
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
    const tabStartX = this.x + 10;
    const tabStartY = this.y + 30;
    const tabWidth = 47;
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
      
      // Check if mouse is over this tab
      if (mouseX >= tabX && mouseX < tabX + tabWidth &&
          mouseY >= tabStartY && mouseY < tabStartY + tabHeight) {
        // Change the current tab
        this.currentTab = tabs[i];
        console.log(`Switched to tab: ${this.currentTab}`);
        return true;
      }
    }
    
    return false;
  }
  
  onMouseDown(mouseX: number, mouseY: number) {
    if (this.isHidden) return false;
    
    // Handle tab clicking
    return this.handleTabClick(mouseX, mouseY);
  }

  async drawText(canvas: GameCanvas) {
    // Draw mesos with commas
    const mesosWithCommas = this.charecter.inventory.mesos
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    canvas.drawText({
      text: mesosWithCommas,
      //color: "#FFDD22", // Gold color for mesos
      x: this.x + 96,
      y: this.y + 270,
      //fontWeight: "bold",
    });
    
    // Draw inventory count for current tab
    let currentItems = [];
    switch (this.currentTab) {
      case MapleInventoryType.EQUIP:
        currentItems = this.charecter.inventory.equip;
        break;
      case MapleInventoryType.USE:
        currentItems = this.charecter.inventory.use;
        break;
      case MapleInventoryType.SETUP:
        currentItems = this.charecter.inventory.setup;
        break;
      case MapleInventoryType.ETC:
        currentItems = this.charecter.inventory.etc;
        break;
      case MapleInventoryType.CASH:
        currentItems = this.charecter.inventory.cash;
        break;
    }
  }

  loadButtons(canvas: GameCanvas) {
    // Only add the meso button if its sprites exist
    try {
      if (this.inventoryNode && 
          this.inventoryNode.BtCoin && 
          this.inventoryNode.BtCoin.nChildren && 
          this.inventoryNode.BtCoin.nChildren.length > 0) {
        
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
    
    // Update button positions
    this.buttons.forEach((button) => {
      button.x += deltaX;
      button.y += deltaY;
    });
    
    // Reload background for new position
    this.generalMenuSprites = [];
    this.loadBackgound();
    
    // Update original position
    this.originalX = position.x;
    this.originalY = position.y;
  }

  destroy() {
    this.destroyed = true;
  }

  update(msPerTick: number) {
    this.delay += msPerTick;
    
    // Update all sprites
    this.generalMenuSprites.forEach((generalMenuSprite) => {
      generalMenuSprite.update(msPerTick);
    });
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (this.isHidden) {
      return;
    }
    
    // Initialize buttons on first draw
    if (!this.isNotFirstDraw) {
      this.loadButtons(canvas);
      this.isNotFirstDraw = true;
    }
    
    // Draw background
    this.generalMenuSprites
      .sort((a, b) => a.z - b.z)
      .forEach((generalMenuSprite) => {
        generalMenuSprite.draw(canvas, camera, lag, msPerTick, tdelta);
      });
    
    // Draw inventory items and tabs
    this.drawItems(canvas);
    
    // Draw mesos and other text
    this.drawText(canvas);
  }
}

export default InventoryMenuSprite;