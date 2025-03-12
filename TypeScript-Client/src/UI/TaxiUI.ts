import WZManager from "../wz-utils/WZManager";
import GameCanvas from "../GameCanvas";
import MapStateInstance from "../MapState";
import { CameraInterface } from "../Camera";

export interface TaxiDestination {
  mapId: number;
  name: string;
  cost: number;
}

export interface TaxiDialog {
  show: (canvas: GameCanvas, destinations: TaxiDestination[]) => void;
  hide: () => void;
  isVisible: boolean;
  update: (msPerTick: number) => void;
  render: (canvas: GameCanvas, camera: CameraInterface) => void;
}

// Singleton TaxiUI that manages the taxi dialog
const TaxiUI: TaxiDialog = {
  isVisible: false,
  backgroundImg: null,
  titleImg: null,
  destinations: [] as TaxiDestination[],
  selectedIndex: -1,
  hoverIndex: -1,
  driverImg: null,
  playerMesos: 0,
  x: 0,
  y: 0,
  width: 300,
  height: 260,
  show: async function(canvas: GameCanvas, destinations: TaxiDestination[]) {
    // Return if already visible
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.destinations = destinations;
    this.selectedIndex = -1;
    this.hoverIndex = -1;
    
    // Center the dialog on screen
    this.x = (canvas.width - this.width) / 2;
    this.y = (canvas.height - this.height) / 2;
    
    // Load taxi UI elements if not loaded yet
    if (!this.backgroundImg) {
      try {
        const uiNode = await WZManager.get("UI.wz/UIWindow.img/Taxi");
        this.backgroundImg = uiNode.backgrnd.nGetImage();
        this.titleImg = uiNode.title.nGetImage();
        this.driverImg = uiNode.driver.nGetImage();
      } catch (e) {
        console.error("Error loading taxi UI:", e);
        
        // Create fallback UI elements
        this.backgroundImg = {
          width: this.width,
          height: this.height
        };
        this.titleImg = { width: 100, height: 30 };
        this.driverImg = { width: 80, height: 80 };
      }
    }
    
    // Get player's mesos
    if (window.MapStateInstance && 
        window.MapStateInstance.PlayerCharacter && 
        window.MapStateInstance.PlayerCharacter.inventory) {
      this.playerMesos = window.MapStateInstance.PlayerCharacter.inventory.mesos;
    } else {
      this.playerMesos = 0;
    }
    
    // Preload map names if needed
    this.destinations.forEach(async (dest) => {
      if (!dest.name) {
        try {
          const mapNames = await window.MapStateInstance.getMapName(dest.mapId);
          dest.name = mapNames.mapName;
        } catch (e) {
          dest.name = `Map ${dest.mapId}`;
        }
      }
    });
  },
  
  hide: function() {
    this.isVisible = false;
    this.selectedIndex = -1;
  },
  
  update: function(msPerTick: number) {
    if (!this.isVisible) return;
    
    // Check for mouse hover over destination list
    const canvas = window.ClickManager?.GameCanvas;
    if (canvas) {
      const mouseX = canvas.mouseX;
      const mouseY = canvas.mouseY;
      
      // Check if mouse is within the destination list area
      const listX = this.x + 20;
      const listY = this.y + 70;
      const listWidth = this.width - 40;
      const itemHeight = 25;
      
      if (mouseX >= listX && mouseX <= listX + listWidth) {
        for (let i = 0; i < this.destinations.length; i++) {
          const itemY = listY + (i * itemHeight);
          if (mouseY >= itemY && mouseY <= itemY + itemHeight) {
            this.hoverIndex = i;
            return;
          }
        }
      }
      
      this.hoverIndex = -1;
      
      // Check for mouse clicks
      if (canvas.mouseDown && !canvas.mousePrevDown) {
        // Check if clicked on a destination
        if (this.hoverIndex !== -1) {
          this.selectedIndex = this.hoverIndex;
        }
        
        // Check if clicked on the OK button
        const okButtonX = this.x + this.width - 70;
        const okButtonY = this.y + this.height - 40;
        const okButtonWidth = 50;
        const okButtonHeight = 25;
        
        if (mouseX >= okButtonX && mouseX <= okButtonX + okButtonWidth &&
            mouseY >= okButtonY && mouseY <= okButtonY + okButtonHeight) {
          this.teleportToSelectedDestination();
        }
        
        // Check if clicked on the Close button
        const closeButtonX = this.x + this.width - 30;
        const closeButtonY = this.y + 10;
        const closeButtonSize = 20;
        
        if (mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonSize &&
            mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonSize) {
          this.hide();
        }
      }
    }
  },
  
  teleportToSelectedDestination: function() {
    if (this.selectedIndex === -1) return;
    
    const dest = this.destinations[this.selectedIndex];
    
    // Check if player has enough mesos
    if (this.playerMesos < dest.cost) {
      console.log("Not enough mesos to travel!");
      // Show error message
      return;
    }
    
    // Deduct mesos from player
    if (window.MapStateInstance && 
        window.MapStateInstance.PlayerCharacter && 
        window.MapStateInstance.PlayerCharacter.inventory) {
      window.MapStateInstance.PlayerCharacter.inventory.mesos -= dest.cost;
    }
    
    // Teleport to destination
    console.log(`Teleporting to map ${dest.mapId}`);
    this.hide();
    MapStateInstance.changeMap(dest.mapId);
  },
  
  render: function(canvas: GameCanvas, camera: CameraInterface) {
    if (!this.isVisible) return;
    
    // Draw semi-transparent overlay
    canvas.drawRect({
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      color: "#000000",
      alpha: 0.5
    });
    
    // Draw background
    if (this.backgroundImg) {
      canvas.drawImage({
        img: this.backgroundImg,
        dx: this.x,
        dy: this.y
      });
    } else {
      // Fallback - draw a styled rectangle
      canvas.drawRect({
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        color: "#E0D2B8",
        alpha: 1
      });
      
      canvas.drawRect({
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        color: "#A67C52",
        alpha: 1,
        lineWidth: 2,
        fill: false
      });
    }
    
    // Draw title
    if (this.titleImg) {
      canvas.drawImage({
        img: this.titleImg,
        dx: this.x + (this.width - this.titleImg.width) / 2,
        dy: this.y + 10
      });
    } else {
      canvas.drawText({
        text: "Taxi",
        x: this.x + this.width / 2,
        y: this.y + 25,
        color: "#4A2511",
        align: "center",
        fontSize: 16,
        fontWeight: "bold"
      });
    }
    
    // Draw driver image
    if (this.driverImg) {
      canvas.drawImage({
        img: this.driverImg,
        dx: this.x + 20,
        dy: this.y + this.height - this.driverImg.height - 20
      });
    }
    
    // Draw destination list
    const listX = this.x + 20;
    const listY = this.y + 70;
    const listWidth = this.width - 40;
    const itemHeight = 25;
    
    // Draw list background
    canvas.drawRect({
      x: listX,
      y: listY,
      width: listWidth,
      height: itemHeight * this.destinations.length,
      color: "#F5F0E0",
      alpha: 1
    });
    
    canvas.drawRect({
      x: listX,
      y: listY,
      width: listWidth,
      height: itemHeight * this.destinations.length,
      color: "#A67C52",
      alpha: 1,
      lineWidth: 1,
      fill: false
    });
    
    // Draw destination items
    for (let i = 0; i < this.destinations.length; i++) {
      const dest = this.destinations[i];
      const itemY = listY + (i * itemHeight);
      
      // Draw selected/hover highlight
      if (i === this.selectedIndex) {
        canvas.drawRect({
          x: listX,
          y: itemY,
          width: listWidth,
          height: itemHeight,
          color: "#D0A870",
          alpha: 0.8
        });
      } else if (i === this.hoverIndex) {
        canvas.drawRect({
          x: listX,
          y: itemY,
          width: listWidth,
          height: itemHeight,
          color: "#E8D5B5",
          alpha: 0.8
        });
      }
      
      // Draw destination name
      canvas.drawText({
        text: dest.name,
        x: listX + 10,
        y: itemY + itemHeight / 2,
        color: "#4A2511",
        align: "left",
        fontSize: 12
      });
      
      // Draw destination cost
      canvas.drawText({
        text: `${dest.cost} mesos`,
        x: listX + listWidth - 10,
        y: itemY + itemHeight / 2,
        color: "#4A2511",
        align: "right",
        fontSize: 12
      });
      
      // Draw separator line between items
      if (i < this.destinations.length - 1) {
        canvas.drawLine({
          x1: listX,
          y1: itemY + itemHeight,
          x2: listX + listWidth,
          y2: itemY + itemHeight,
          color: "#A67C52",
          alpha: 0.5,
          lineWidth: 1
        });
      }
    }
    
    // Draw OK button
    const okButtonX = this.x + this.width - 70;
    const okButtonY = this.y + this.height - 40;
    const okButtonWidth = 50;
    const okButtonHeight = 25;
    
    canvas.drawRect({
      x: okButtonX,
      y: okButtonY,
      width: okButtonWidth,
      height: okButtonHeight,
      color: "#D0A870",
      alpha: 1
    });
    
    canvas.drawRect({
      x: okButtonX,
      y: okButtonY,
      width: okButtonWidth,
      height: okButtonHeight,
      color: "#A67C52",
      alpha: 1,
      lineWidth: 1,
      fill: false
    });
    
    canvas.drawText({
      text: "OK",
      x: okButtonX + okButtonWidth / 2,
      y: okButtonY + okButtonHeight / 2,
      color: "#4A2511",
      align: "center",
      fontSize: 12
    });
    
    // Draw Close button
    const closeButtonX = this.x + this.width - 30;
    const closeButtonY = this.y + 10;
    const closeButtonSize = 20;
    
    canvas.drawText({
      text: "×",
      x: closeButtonX + closeButtonSize / 2,
      y: closeButtonY + closeButtonSize / 2,
      color: "#4A2511",
      align: "center",
      fontSize: 20
    });
    
    // Draw player's mesos
    canvas.drawText({
      text: `Your mesos: ${this.playerMesos}`,
      x: this.x + 20,
      y: this.y + this.height - 20,
      color: "#4A2511",
      align: "left",
      fontSize: 12
    });
  }
};

export default TaxiUI;