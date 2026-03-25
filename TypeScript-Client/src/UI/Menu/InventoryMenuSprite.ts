import WZManager from "../../wz-utils/WZManager";
import WZFiles from "../../Constants/enums/WZFiles";
import ClickManager from "../ClickManager";
import { MapleStanceButton } from "../MapleStanceButton";
import DragableMenu from "./DragableMenu";
import { MapleInventoryType } from "../../Constants/Inventory/MapleInventory";
import { CameraInterface } from "../../Camera";
import { Position } from "../../Effects/DamageIndicator";
import GameCanvas from "../../GameCanvas";
import DropItemSprite from "../../DropItem/DropItemSprite";
import UIMesoDropDialog from "../UIMesoDropDialog";

class InventoryMenuSprite extends DragableMenu {
  opts: any;
  inventoryNode: any;
  charecter: any;
  currentTab: MapleInventoryType = MapleInventoryType.EQUIP;
  buttons: MapleStanceButton[] = [];
  isNotFirstDraw: boolean = false;
  destroyed: boolean = false;
  delay: number = 0;
  map: any;
  id: number = 0;
  originalX: number = 0;
  originalY: number = 0;
  // Holds the full composite background image.
  fullBackgroundImage: any = null;
  // Reference to GameCanvas for mouse position tracking
  GameCanvas: GameCanvas;
  mesoDropDialog: UIMesoDropDialog | null = null;

  static async fromOpts(opts: any) {
    const object = new InventoryMenuSprite(opts);
    await object.load();
    return object;
  }

  constructor(opts: any) {
    super(opts);
    this.opts = opts;
    this.GameCanvas = opts.canvas;
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

    // Load the meso drop dialog (auto-centers on screen)
    this.mesoDropDialog = await UIMesoDropDialog.fromOpts({
      canvas: this.GameCanvas,
    });

    ClickManager.addDragableMenu(this);
  }

  async dropMesos(amount: number = 10) {
    console.log(this.charecter);
    if (this.charecter.inventory.mesos < amount) {
      console.warn("Not enough mesos to drop.");
      return;
    }
  
    const dropPosition = {
      x: this.charecter.pos.x,
      y: this.charecter.pos.y,
      vx: 0,
      vy: 0,
    };
  
    try {
      // Reduce mesos from inventory
      this.charecter.inventory.mesos -= amount;
      
      // Create a DropItemSprite for the mesos
      const mesosDrop = await DropItemSprite.fromOpts({
        id: 0, // 0 is used for mesos in the DropItemSprite class
        amount: amount,
        monster: {
          pos: {
            x: this.charecter.pos.x,
            y: this.charecter.pos.y - 20, // Drop slightly above character
            vx: 0,
            vy: 0
          }
        }
      });
      
      // Add the drop to the map
      if (this.charecter.map && !mesosDrop.destroyed) {
        this.charecter.map.addItemDrop(mesosDrop);
        console.log(`Dropped ${amount} mesos`);
      }
    } catch (err) {
      console.error("Error dropping mesos:", err);
    }
  }

  // Drop an item from the inventory
  async dropItem(item: any, quantity: number, slotIndex: number) {
    if (!item || quantity <= 0) {
      console.warn("Invalid item or quantity");
      return;
    }
    
    // Get the appropriate inventory array based on the current tab
    let inventoryArray: any[] = [];
    switch (this.currentTab) {
      case MapleInventoryType.EQUIP:
        inventoryArray = this.charecter.inventory.equip;
        break;
      case MapleInventoryType.USE:
        inventoryArray = this.charecter.inventory.use;
        break;
      case MapleInventoryType.SETUP:
        inventoryArray = this.charecter.inventory.setup;
        break;
      case MapleInventoryType.ETC:
        inventoryArray = this.charecter.inventory.etc;
        break;
      case MapleInventoryType.CASH:
        inventoryArray = this.charecter.inventory.cash;
        break;
    }
    
    // Find the actual item in the inventory
    let actualItem = inventoryArray[slotIndex];
    if (!actualItem || actualItem.itemId !== item.itemId) {
      // If we can't find the exact item, try to find by itemId
      actualItem = inventoryArray.find(i => i.itemId === item.itemId);
      
      if (!actualItem) {
        console.warn("Item not found in inventory");
        return;
      }
    }
    
    try {
      // Handle quantity for stackable items
      const originalQuantity = actualItem.quantity || 1;
      if (quantity >= originalQuantity) {
        // Remove the entire item if dropping all
        const itemIndex = inventoryArray.indexOf(actualItem);
        if (itemIndex !== -1) {
          inventoryArray.splice(itemIndex, 1);
        }
      } else {
        // Reduce the quantity
        actualItem.quantity -= quantity;
      }
      
      // Create a DropItemSprite for the item
      const itemDrop = await DropItemSprite.fromOpts({
        id: item.itemId,
        amount: quantity,
        monster: {
          pos: {
            x: this.charecter.pos.x,
            y: this.charecter.pos.y - 20, // Drop slightly above character
            vx: 0,
            vy: 0
          }
        }
      });
      
      // Add the drop to the map
      if (this.charecter.map && !itemDrop.destroyed) {
        this.charecter.map.addItemDrop(itemDrop);
        console.log(`Dropped ${quantity} of item ${item.itemId}`);
      }
    } catch (err) {
      console.error("Error dropping item:", err);
    }
  }

  async loadBackground() {
    if (!this.inventoryNode || !this.inventoryNode.backgrnd) {
      console.error("Missing inventory background node");
      return;
    }
    try {
      this.fullBackgroundImage = this.inventoryNode.backgrnd.nGetImage();
    } catch (e) {
      console.error("Error loading inventory background:", e);
    }
  }

  getRect(camera: CameraInterface) {
    if (!this.fullBackgroundImage) {
      return { x: this.x, y: this.y, width: 300, height: 400 };
    }
    return { x: this.x, y: this.y, width: this.fullBackgroundImage.width, height: this.fullBackgroundImage.height };
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach(button => (button.isHidden = isHidden));
  }

  // Draw only the leftmost portion of the composite background (cutting off the right side)
  drawBackground(canvas: GameCanvas) {
    if (!this.fullBackgroundImage) return;
    canvas.drawImage({
      img: this.fullBackgroundImage,
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
            // Position at bottom-right corner of the slot
            const textX = slotX + slotSize - 5;
            const textY = slotY + slotSize - 8;
            
            // First draw a dark outline/shadow
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) { // Skip the center
                  canvas.drawText({
                    text: quantity.toString(),
                    x: textX + dx,
                    y: textY + dy,
                    color: "#000000",
                    align: "right",
                    fontSize: 12
                  });
                }
              }
            }
            
            // Then draw the white text on top
            canvas.drawText({
              text: quantity.toString(),
              x: textX,
              y: textY,
              color: "#FFFFFF",
              align: "right",
              fontSize: 12
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
    
    // First check if a tab was clicked
    if (this.handleTabClick(mouseX, mouseY)) {
      return true;
    }
    
    // Check if an item slot was clicked
    const slotStartX = this.x + 14;
    const slotStartY = this.y + 55;
    const slotColumns = 4;
    const slotRows = 6;
    const slotSize = 30;
    const slotPadding = 4;
    
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
    
    if (this.currentTab !== MapleInventoryType.EQUIP) {
      items = this.mergeStackableItems(items);
    }
    
    for (let row = 0; row < slotRows; row++) {
      for (let col = 0; col < slotColumns; col++) {
        const slotIndex = row * slotColumns + col;
        const slotX = slotStartX + col * (slotSize + slotPadding);
        const slotY = slotStartY + row * (slotSize + slotPadding);
        
        if (
          mouseX >= slotX && 
          mouseX < slotX + slotSize && 
          mouseY >= slotY && 
          mouseY < slotY + slotSize
        ) {
          // Check if there's an item in this slot
          if (slotIndex < items.length && items[slotIndex]) {
            const item = items[slotIndex];
            this.handleItemDrag(item, slotIndex);
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  // Handle dragging an item out of the inventory
  handleItemDrag(item: any, slotIndex: number) {
    // Set a flag to indicate we're dragging an item (prevents inventory window from moving)
    ClickManager.isDraggingItem = true;
    
    // Create a floating icon that follows the mouse
    const dragIcon = document.createElement('div');
    dragIcon.id = 'item-drag-icon';
    dragIcon.style.position = 'absolute';
    dragIcon.style.pointerEvents = 'none';
    dragIcon.style.zIndex = '2000';
    
    // Add animation styles to make the drag feel more responsive
    dragIcon.style.transition = 'transform 0.05s ease-out';
    dragIcon.style.transform = 'scale(1.1)'; // Slightly larger than normal
    dragIcon.style.cursor = 'grabbing';
    dragIcon.style.opacity = '0.9';
    dragIcon.style.filter = 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))'; // Add shadow
    
    // Set the icon background or content
    if (item.node && item.node.iconRaw) {
      // Try to use the item's icon if available
      try {
        const icon = item.node.iconRaw.nGetImage();
        if (icon && icon.src) {
          dragIcon.style.backgroundImage = `url(${icon.src})`;
          dragIcon.style.backgroundSize = 'contain';
          dragIcon.style.backgroundRepeat = 'no-repeat';
          dragIcon.style.backgroundPosition = 'center';
          dragIcon.style.width = `${icon.width}px`;
          dragIcon.style.height = `${icon.height}px`;
        }
      } catch (e) {
        console.warn(`Failed to get iconRaw image for item ${item.itemId}`);
        // Create a generic item icon instead of showing text
        dragIcon.style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAwElEQVR42u2X0Q2AIAxEOwpjMIoj6GY6gmOwIXyYQIBaBQymJI0JfPBeAiQkAGNMKkBKqBRQK2AKlwBdYwcgYfN0KAEE2O2jDRMy7D+QGbBpGIGTMQvDVYkRkAQwj8KBzHbdw/RXCZBx+ZKfKwHGpUtASIEUEBGz5v+m0H1d0c6rEkNEe7O7BJhSmDBh5wIGAwOJ0JWSHfnVAQ/6tqsLp5ZdQXsqqO+4hj+mcAVE0iBUASzRgCACGZiES0BagAfq5QU8cbl/jCEqXQAAAABJRU5ErkJggg==")';
        dragIcon.style.backgroundSize = 'contain';
        dragIcon.style.backgroundRepeat = 'no-repeat';
        dragIcon.style.backgroundPosition = 'center';
        dragIcon.style.width = '30px';
        dragIcon.style.height = '30px';
      }
    } else {
      // Fallback if no icon is available - use a generic item icon
      dragIcon.style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAwElEQVR42u2X0Q2AIAxEOwpjMIoj6GY6gmOwIXyYQIBaBQymJI0JfPBeAiQkAGNMKkBKqBRQK2AKlwBdYwcgYfN0KAEE2O2jDRMy7D+QGbBpGIGTMQvDVYkRkAQwj8KBzHbdw/RXCZBx+ZKfKwHGpUtASIEUEBGz5v+m0H1d0c6rEkNEe7O7BJhSmDBh5wIGAwOJ0JWSHfnVAQ/6tqsLp5ZdQXsqqO+4hj+mcAVE0iBUASzRgCACGZiES0BagAfq5QU8cbl/jCEqXQAAAABJRU5ErkJggg==")';
      dragIcon.style.backgroundSize = 'contain';
      dragIcon.style.backgroundRepeat = 'no-repeat';
      dragIcon.style.backgroundPosition = 'center';
      dragIcon.style.width = '30px';
      dragIcon.style.height = '30px';
    }
    
    // Add to body to make it visible
    document.body.appendChild(dragIcon);
    
    // Update icon position on mouse move
    const onMouseMove = (e: MouseEvent) => {
      // Get icon dimensions, with fallbacks to prevent NaN errors
      const width = parseInt(dragIcon.style.width) || 30;
      const height = parseInt(dragIcon.style.height) || 30;
      
      // Calculate the position so icon follows cursor with its center
      const left = e.clientX - (width / 2);
      const top = e.clientY - (height / 2);
      
      // Apply position with smooth transition
      dragIcon.style.left = `${left}px`;
      dragIcon.style.top = `${top}px`;
      
      // Subtle rotation effect for more dynamic feel
      const rotateAmount = Math.sin(Date.now() / 300) * 3; // Small oscillation
      dragIcon.style.transform = `scale(1.1) rotate(${rotateAmount}deg)`;
    };
    
    // Handle mouse up - remove icon and check if outside inventory
    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Reset the dragging flag to allow inventory movement again
      ClickManager.isDraggingItem = false;
      
      // Check if mouse is outside inventory window
      const rect = document.getElementById('game-wrapper')?.getBoundingClientRect();
      const inventoryRect = {
        x: this.x,
        y: this.y,
        width: 300, // Hardcoded fallback width
        height: 400 // Hardcoded fallback height
      };
      
      // Try to get actual dimensions if possible
      try {
        const rect = this.getRect({} as CameraInterface);
        inventoryRect.width = rect.width;
        inventoryRect.height = rect.height;
      } catch (e) {
        console.error("Error getting inventory dimensions:", e);
      }
      
      const isOutsideInventory = 
        e.clientX < this.x || 
        e.clientX > this.x + inventoryRect.width || 
        e.clientY < this.y || 
        e.clientY > this.y + inventoryRect.height;
      
      if (isOutsideInventory) {
        // Show drop dialog
        this.showItemDropDialog(item, slotIndex);
      }
      
      // Remove the drag icon
      if (document.body.contains(dragIcon)) {
        document.body.removeChild(dragIcon);
      }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Trigger initial position with a safer access
    try {
      // Use the current cursor position from GameCanvas or fallback to a position
      // relative to the inventory item slot
      if (this.GameCanvas && (this.GameCanvas.mouseX || this.GameCanvas.mouseY)) {
        onMouseMove({
          clientX: this.GameCanvas.mouseX || 0,
          clientY: this.GameCanvas.mouseY || 0
        } as MouseEvent);
      } else {
        // If GameCanvas position not available, position near the item in the inventory
        const slotColumns = 4;
        const slotSize = 30;
        const slotPadding = 4;
        const slotStartX = this.x + 14;
        const slotStartY = this.y + 55;
        
        const col = slotIndex % slotColumns;
        const row = Math.floor(slotIndex / slotColumns);
        
        const slotX = slotStartX + col * (slotSize + slotPadding) + slotSize/2;
        const slotY = slotStartY + row * (slotSize + slotPadding) + slotSize/2;
        
        onMouseMove({
          clientX: slotX,
          clientY: slotY
        } as MouseEvent);
      }
    } catch (e) {
      console.error("Error setting initial mouse position:", e);
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
          onClick: () => {
            this.showMesoDropDialog();
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
  
  // Show the WZ-based meso drop dialog
  showMesoDropDialog() {
    if (!this.mesoDropDialog || !this.mesoDropDialog.isHidden) return;
    this.mesoDropDialog.show(this.charecter.inventory.mesos, (amount: number) => {
      this.dropMesos(amount);
    });
  }
  
  // Show dialog for dropping items
  showItemDropDialog(item: any, slotIndex: number) {
    // Check if a dialog is already open
    if (document.getElementById('maple-drop-dialog')) {
      return;
    }
    
    // Create a div to overlay the entire page
    const overlay = document.createElement('div');
    overlay.id = 'maple-drop-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'; // More transparent
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    // Create the dialog box
    const dialogBox = document.createElement('div');
    dialogBox.id = 'maple-drop-dialog';
    dialogBox.style.width = '250px';
    dialogBox.style.padding = '10px';
    dialogBox.style.backgroundColor = '#EBE2CA';
    dialogBox.style.border = '2px solid #A67C52';
    dialogBox.style.borderRadius = '5px';
    dialogBox.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    dialogBox.style.display = 'flex';
    dialogBox.style.flexDirection = 'column';
    dialogBox.style.alignItems = 'center';
    dialogBox.style.position = 'relative';
    
    // Add title with item name if available
    const title = document.createElement('div');
    title.textContent = item.name || `Drop Item ${item.itemId}`;
    title.style.width = '100%';
    title.style.color = '#4A2511';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.textAlign = 'center';
    title.style.fontSize = '14px';
    dialogBox.appendChild(title);
    
    // Add close button
    const closeButton = document.createElement('div');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '18px';
    closeButton.style.color = '#4A2511';
    closeButton.style.fontWeight = 'bold';
    closeButton.onclick = () => {
      document.body.removeChild(overlay);
    };
    dialogBox.appendChild(closeButton);
    
    // Create icon container
    const iconContainer = document.createElement('div');
    iconContainer.style.width = '40px';
    iconContainer.style.height = '40px';
    iconContainer.style.marginBottom = '10px';
    iconContainer.style.display = 'flex';
    iconContainer.style.justifyContent = 'center';
    iconContainer.style.alignItems = 'center';
    
    // Try to display item icon
    if (item.node && item.node.iconRaw) {
      try {
        const icon = item.node.iconRaw.nGetImage();
        if (icon && icon.src) {
          const iconImg = document.createElement('div');
          iconImg.style.backgroundImage = `url(${icon.src})`;
          iconImg.style.backgroundSize = 'contain';
          iconImg.style.backgroundRepeat = 'no-repeat';
          iconImg.style.backgroundPosition = 'center';
          iconImg.style.width = '36px';
          iconImg.style.height = '36px';
          iconContainer.appendChild(iconImg);
        }
      } catch (e) {
        const fallbackIcon = document.createElement('div');
        fallbackIcon.textContent = item.itemId.toString();
        fallbackIcon.style.backgroundColor = '#555';
        fallbackIcon.style.color = '#fff';
        fallbackIcon.style.width = '36px';
        fallbackIcon.style.height = '36px';
        fallbackIcon.style.display = 'flex';
        fallbackIcon.style.justifyContent = 'center';
        fallbackIcon.style.alignItems = 'center';
        fallbackIcon.style.fontSize = '10px';
        iconContainer.appendChild(fallbackIcon);
      }
    }
    
    dialogBox.appendChild(iconContainer);
    
    // Add message
    const message = document.createElement('div');
    
    // Check if item is stackable (has quantity)
    const maxQuantity = item.quantity || 1;
    
    if (maxQuantity > 1) {
      message.textContent = `How many do you want to drop? (Max: ${maxQuantity})`;
    } else {
      message.textContent = 'Do you want to drop this item?';
    }
    
    message.style.width = '100%';
    message.style.color = '#4A2511';
    message.style.marginBottom = '10px';
    message.style.textAlign = 'center';
    message.style.fontSize = '12px';
    dialogBox.appendChild(message);
    
    // Add input field for stackable items
    let input: HTMLInputElement | null = null;
    
    if (maxQuantity > 1) {
      const inputContainer = document.createElement('div');
      inputContainer.style.display = 'flex';
      inputContainer.style.alignItems = 'center';
      inputContainer.style.marginBottom = '15px';
      
      input = document.createElement('input');
      input.type = 'number';
      input.value = '1';
      input.min = '1';
      input.max = maxQuantity.toString();
      input.style.width = '150px';
      input.style.padding = '5px';
      input.style.border = '1px solid #A67C52';
      input.style.borderRadius = '3px';
      input.style.backgroundColor = '#F5F0E0';
      input.style.color = '#4A2511';
      input.style.fontSize = '12px';
      input.style.textAlign = 'right';
      inputContainer.appendChild(input);
      
      dialogBox.appendChild(inputContainer);
      
      // Add max button for stackable items
      const maxButton = document.createElement('button');
      maxButton.textContent = 'Max';
      maxButton.style.padding = '3px 10px';
      maxButton.style.backgroundColor = '#D0A870';
      maxButton.style.border = '1px solid #A67C52';
      maxButton.style.borderRadius = '3px';
      maxButton.style.color = '#4A2511';
      maxButton.style.marginBottom = '15px';
      maxButton.style.cursor = 'pointer';
      maxButton.style.fontSize = '12px';
      maxButton.onclick = () => {
        if (input) input.value = maxQuantity.toString();
      };
      dialogBox.appendChild(maxButton);
    }
    
    // Add buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'space-between';
    buttonsContainer.style.width = '100%';
    
    // Add OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.padding = '5px 20px';
    okButton.style.backgroundColor = '#D0A870';
    okButton.style.border = '1px solid #A67C52';
    okButton.style.borderRadius = '3px';
    okButton.style.color = '#4A2511';
    okButton.style.cursor = 'pointer';
    okButton.style.fontSize = '12px';
    okButton.onclick = () => {
      // Get drop quantity
      let dropQuantity = 1;
      
      if (input) {
        dropQuantity = parseInt(input.value);
        
        if (dropQuantity <= 0 || isNaN(dropQuantity)) {
          message.textContent = 'Please enter a valid amount!';
          message.style.color = '#CC0000';
          return;
        }
        
        if (dropQuantity > maxQuantity) {
          message.textContent = `You only have ${maxQuantity} of this item!`;
          message.style.color = '#CC0000';
          return;
        }
      }
      
      document.body.removeChild(overlay);
      this.dropItem(item, dropQuantity, slotIndex);
    };
    buttonsContainer.appendChild(okButton);
    
    // Add Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '5px 20px';
    cancelButton.style.backgroundColor = '#D0A870';
    cancelButton.style.border = '1px solid #A67C52';
    cancelButton.style.borderRadius = '3px';
    cancelButton.style.color = '#4A2511';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '12px';
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
    };
    buttonsContainer.appendChild(cancelButton);
    
    dialogBox.appendChild(buttonsContainer);
    
    // Add dialog to overlay
    overlay.appendChild(dialogBox);
    
    // Add overlay to document
    document.body.appendChild(overlay);
    
    // Focus the input field if it exists
    if (input) {
      input.focus();
      input.select();
      
      // Submit on Enter key
      input.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          okButton.click();
        }
      });
    }
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

    // Draw meso drop dialog on top
    if (this.mesoDropDialog) {
      this.mesoDropDialog.update(msPerTick);
      this.mesoDropDialog.draw(canvas, camera, lag, msPerTick, tdelta);
    }
  }
}

export default InventoryMenuSprite;
