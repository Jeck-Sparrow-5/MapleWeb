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
  
  // Custom MapleStory-style meso drop dialog
  showMesoDropDialog() {
    // Create a div to overlay the entire page
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    // Create the dialog box
    const dialogBox = document.createElement('div');
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
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'Drop Mesos';
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
    
    // Add message
    const message = document.createElement('div');
    message.textContent = 'How many mesos would you like to drop?';
    message.style.width = '100%';
    message.style.color = '#4A2511';
    message.style.marginBottom = '10px';
    message.style.textAlign = 'center';
    message.style.fontSize = '12px';
    dialogBox.appendChild(message);
    
    // Add input field
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.marginBottom = '15px';
    
    const mesoIcon = document.createElement('div');
    mesoIcon.textContent = '💰';
    mesoIcon.style.marginRight = '5px';
    mesoIcon.style.fontSize = '16px';
    inputContainer.appendChild(mesoIcon);
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = '10';
    input.min = '1';
    input.max = this.charecter.inventory.mesos.toString();
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
    
    // Add max button
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
      input.value = this.charecter.inventory.mesos.toString();
    };
    dialogBox.appendChild(maxButton);
    
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
      const amount = parseInt(input.value);
      if (amount > 0 && amount <= this.charecter.inventory.mesos) {
        document.body.removeChild(overlay);
        this.dropMesos(amount);
      } else if (amount <= 0) {
        message.textContent = 'Please enter a valid amount!';
        message.style.color = '#CC0000';
      } else {
        message.textContent = 'You don\'t have enough mesos!';
        message.style.color = '#CC0000';
      }
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
    
    // Focus the input field
    input.focus();
    input.select();
    
    // Submit on Enter key
    input.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        okButton.click();
      }
    });
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
  }
}

export default InventoryMenuSprite;
