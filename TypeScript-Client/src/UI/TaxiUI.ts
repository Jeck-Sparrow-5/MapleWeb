import WZManager from "../wz-utils/WZManager";
import GameCanvas from "../GameCanvas";
import MapStateInstance from "../MapState";
import { CameraInterface } from "../Camera";

export interface TaxiDestination {
  mapId: number;
  name: string;
  cost: number;
  destinations?: TaxiDestination[];
}

export interface TaxiDialog {
  show: (canvas: GameCanvas, destinations: TaxiDestination[]) => void;
  hide: () => void;
  isVisible: boolean;
  update: (msPerTick: number) => void;
  render: (canvas: GameCanvas, camera: CameraInterface) => void;
}

// Singleton TaxiUI that manages the taxi dialog
const TaxiUI: TaxiDialog & {
  backgroundImg: any;
  titleImg: any;
  destinations: TaxiDestination[];
  selectedIndex: number;
  hoverIndex: number;
  driverImg: any;
  playerMesos: number;
  x: number;
  y: number;
  width: number;
  height: number;
  prevClicked?: boolean;
  teleportToSelectedDestination: () => void;
} = {
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
  
  show: function(canvas: GameCanvas, destinations: TaxiDestination[]) {
    console.log("TaxiUI.show method called");
    
    // Return if already visible
    if (this.isVisible) {
      console.log("TaxiUI is already visible, returning early");
      return;
    }
    
    console.log("TaxiUI.show called with", destinations?.length || 0, "destinations");
    console.log("Canvas provided:", canvas ? "yes" : "no");
    console.log("Canvas dimensions:", canvas.game?.width || "unknown", "x", canvas.game?.height || "unknown");
    
    try {
      this.isVisible = true;
      this.destinations = Array.isArray(destinations) ? destinations : [];
      console.log("Set destinations:", this.destinations.length);
      this.selectedIndex = -1;
      this.hoverIndex = -1;
      
      // Center the dialog on screen
      const canvasWidth = canvas.game?.width || 800;
      const canvasHeight = canvas.game?.height || 600;
      this.x = Math.floor(canvasWidth / 2 - this.width / 2);
      this.y = Math.floor(canvasHeight / 2 - this.height / 2);
      
      console.log("TaxiUI positioned at:", this.x, this.y);
      console.log("Dialog dimensions:", this.width, "x", this.height);
    } catch (error) {
      console.error("Error in TaxiUI.show method:", error);
    }
    
    // Define a function to ensure UI is properly loaded
    const loadUIElements = async () => {
      try {
        console.log("Loading UI elements for TaxiUI");
        
        // First try to use DialogImage.img
        try {
          const dialogNode = await WZManager.get("UI.wz/DialogImage.img");
          console.log("DialogImage.img loaded:", dialogNode ? "yes" : "no");
          
          if (dialogNode && dialogNode.dialog) {
            console.log("Dialog node found, getting images");
            this.backgroundImg = dialogNode.dialog.c.nGetImage();
            this.titleImg = dialogNode.dialog.t.nGetImage();
            
            // Load taxi driver NPC
            try {
              const npcNode = await WZManager.get("Npc.wz/1022000.img");
              if (npcNode && npcNode.stand && npcNode.stand["0"]) {
                this.driverImg = npcNode.stand["0"].nGetImage();
                console.log("Taxi driver image loaded");
              }
            } catch (npcError) {
              console.error("Error loading taxi driver image:", npcError);
            }
          } else {
            console.warn("Dialog node not found in DialogImage.img, will try fallback");
            throw new Error("Dialog node not found");
          }
        } catch (dialogError) {
          console.error("Error loading DialogImage.img:", dialogError);
          
          // Fallback to UIWindow.img/Taxi
          console.log("Trying fallback to UIWindow.img/Taxi");
          const uiNode = await WZManager.get("UI.wz/UIWindow.img/Taxi");
          if (uiNode) {
            this.backgroundImg = uiNode.backgrnd.nGetImage();
            this.titleImg = uiNode.title.nGetImage();
            this.driverImg = uiNode.driver.nGetImage();
            console.log("Fallback images loaded successfully");
          } else {
            console.error("Failed to load fallback images");
          }
        }
      } catch (e) {
        console.error("Error in loadUIElements:", e);
      }
    };
    
    // Load taxi UI elements
    if (!this.backgroundImg) {
      console.log("Need to load background image for TaxiUI");
      // Start loading, but don't wait for it to finish
      loadUIElements().then(() => {
        console.log("UI elements loaded, TaxiUI should now be visible with images");
      });
    } else {
      console.log("TaxiUI already has background image");
    }
    
    // Get player's mesos
    if (window.MapStateInstance && 
        window.MapStateInstance.PlayerCharacter && 
        window.MapStateInstance.PlayerCharacter.inventory) {
      this.playerMesos = window.MapStateInstance.PlayerCharacter.inventory.mesos;
    } else {
      this.playerMesos = 0;
    }
    
    // Ensure we have at least some destinations
    if (!this.destinations || this.destinations.length === 0) {
      console.warn("No taxi destinations provided, adding default destinations");
      this.destinations = [
        { mapId: 100000000, name: "Henesys", cost: 1000 },
        { mapId: 101000000, name: "Ellinia", cost: 1000 },
        { mapId: 102000000, name: "Perion", cost: 1000 },
        { mapId: 103000000, name: "Kerning City", cost: 1000 },
        { mapId: 104000000, name: "Lith Harbor", cost: 800 }
      ];
    }
    
    console.log("TaxiUI shown with", this.destinations.length, "destinations");
  },
  
  hide: function() {
    this.isVisible = false;
    this.selectedIndex = -1;
    console.log("TaxiUI hidden");
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
      
      // Reset hover index first
      this.hoverIndex = -1;
      
      // Check if mouse is within the list area
      if (mouseX >= listX && mouseX <= listX + listWidth) {
        for (let i = 0; i < this.destinations.length; i++) {
          const itemY = listY + (i * itemHeight);
          if (mouseY >= itemY && mouseY <= itemY + itemHeight) {
            this.hoverIndex = i;
            break;  // Exit the loop once we found a match
          }
        }
      }
      
      // Check for mouse clicks
      if (canvas.clicked && !this.prevClicked) {
        console.log("Click detected in TaxiUI at", mouseX, mouseY);
        
        // Check if clicked on a destination
        if (this.hoverIndex !== -1) {
          this.selectedIndex = this.hoverIndex;
          console.log("Selected destination:", this.destinations[this.hoverIndex].name);
        }
        
        // Check if clicked on the OK button (use the updated position)
        const okButtonX = this.x + this.width - 90;
        const okButtonY = this.y + this.height - 45;
        const okButtonWidth = 70;
        const okButtonHeight = 30;
        
        if (mouseX >= okButtonX && mouseX <= okButtonX + okButtonWidth &&
            mouseY >= okButtonY && mouseY <= okButtonY + okButtonHeight) {
            console.log("OK button clicked");
            this.teleportToSelectedDestination();
        }
        
        // Check if clicked on the Close button (same position, just update variable names)
        const closeButtonX = this.x + this.width - 30;
        const closeButtonY = this.y + 10;
        const closeButtonSize = 20;
        
        if (mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonSize &&
            mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonSize) {
          console.log("Close button clicked");
          this.hide();
        }
      }
      
      // Store current click state for next frame
      this.prevClicked = canvas.clicked;
    }
  },
  
  teleportToSelectedDestination: function() {
    if (this.selectedIndex === -1) {
      console.log("No destination selected");
      return;
    }
    
    const dest = this.destinations[this.selectedIndex];
    console.log("Teleporting to", dest.name, "(Map ID:", dest.mapId, ")");
    
    // Check if player has enough mesos
    if (this.playerMesos < dest.cost) {
      console.log("Not enough mesos to travel! Need", dest.cost, "but have", this.playerMesos);
      return;
    }
    
    // Deduct mesos from player
    if (window.MapStateInstance && 
        window.MapStateInstance.PlayerCharacter && 
        window.MapStateInstance.PlayerCharacter.inventory) {
      window.MapStateInstance.PlayerCharacter.inventory.mesos -= dest.cost;
    }
    
    // Teleport to destination
    this.hide();
    if (MapStateInstance) {
      MapStateInstance.changeMap(dest.mapId);
    } else {
      console.error("MapStateInstance is not defined");
    }
  },
  
  render: function(canvas: GameCanvas, camera: CameraInterface) {
    if (!this.isVisible) {
      // console.log("TaxiUI.render called but not visible");
      return;
    }
    
    console.log("TaxiUI.render: Rendering taxi dialog");
    
    // Draw semi-transparent overlay with a lighter alpha to avoid completely darkening the screen
    canvas.drawRect({
      x: 0,
      y: 0,
      width: canvas.game?.width || 1280,
      height: canvas.game?.height || 720,
      color: "#000000",
      alpha: 0.3
    });
    
    // Draw dialog background using DialogImage.img
    // The Dialog should be constructed from several parts
    if (this.backgroundImg) {
      // Draw the main background center part (stretched to fit)
      canvas.drawImage({
        img: this.backgroundImg,
        dx: this.x,
        dy: this.y,
        dWidth: this.width,
        dHeight: this.height
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
        stroke: "#A67C52",
        strokeWidth: 2
      });
    }
    
    // Draw title
    if (this.titleImg) {
      // Draw title at the top center of the dialog
      canvas.drawImage({
        img: this.titleImg,
        dx: this.x + (this.width - this.titleImg.width) / 2,
        dy: this.y + 10
      });
      
      // Draw title text over image
      canvas.drawText({
        text: "Taxi Service",
        x: this.x + this.width / 2,
        y: this.y + 25,
        color: "#FFFFFF",
        align: "center",
        fontSize: 14,
        fontWeight: "bold",
        shadow: true,
        shadowColor: "#000000",
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
    } else {
      // Fallback title text
      canvas.drawText({
        text: "Taxi Service",
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
    
    // Draw list background with shadow
    canvas.drawRect({
      x: listX + 3,
      y: listY + 3,
      width: listWidth,
      height: itemHeight * this.destinations.length,
      color: "#333333",
      alpha: 0.5,
      radius: 4
    });
    
    // Main background for list
    canvas.drawRect({
      x: listX,
      y: listY,
      width: listWidth,
      height: itemHeight * this.destinations.length,
      color: "#F5F0E0",
      alpha: 1,
      radius: 4,
      stroke: "#8E5F19",
      strokeWidth: 2
    });
    
    // Add destination list title
    canvas.drawText({
      text: "Select Your Destination",
      x: listX + listWidth / 2,
      y: listY - 15,
      color: "#8E5F19",
      align: "center",
      fontSize: 13,
      fontWeight: "bold"
    });
    
    // Draw destination items
    for (let i = 0; i < this.destinations.length; i++) {
      const dest = this.destinations[i];
      const itemY = listY + (i * itemHeight);
      
      // Draw selected/hover highlight
      if (i === this.selectedIndex) {
        canvas.drawRect({
          x: listX + 2,
          y: itemY + 2,
          width: listWidth - 4,
          height: itemHeight - 3,
          color: "#D0A870",
          alpha: 0.8,
          radius: 2
        });
      } else if (i === this.hoverIndex) {
        canvas.drawRect({
          x: listX + 2,
          y: itemY + 2,
          width: listWidth - 4,
          height: itemHeight - 3,
          color: "#E8D5B5",
          alpha: 0.5,
          radius: 2
        });
      }
      
      // Draw destination name with a MapleStory style
      canvas.drawText({
        text: dest.name,
        x: listX + 15,
        y: itemY + itemHeight / 2,
        color: i === this.selectedIndex ? "#5C3813" : "#6B4916",
        align: "left",
        fontSize: 13,
        fontWeight: i === this.selectedIndex ? "bold" : "normal"
      });
      
      // Draw destination cost with a MapleStory style
      canvas.drawText({
        text: `${dest.cost} mesos`,
        x: listX + listWidth - 15,
        y: itemY + itemHeight / 2,
        color: "#0B6121", // Green color for price
        align: "right",
        fontSize: 12,
        fontWeight: "bold"
      });
      
      // Draw separator line between items
      if (i < this.destinations.length - 1) {
        canvas.drawLine({
          x1: listX + 5,
          y1: itemY + itemHeight,
          x2: listX + listWidth - 5,
          y2: itemY + itemHeight,
          color: "#D5BC8E",
          alpha: 0.7,
          width: 1
        });
      }
    }
    
    // Draw OK button
    const okButtonX = this.x + this.width - 90;
    const okButtonY = this.y + this.height - 45;
    const okButtonWidth = 70;
    const okButtonHeight = 30;
    
    // Draw a MapleStory style button
    // Draw button shadow
    canvas.drawRect({
      x: okButtonX + 2,
      y: okButtonY + 2,
      width: okButtonWidth,
      height: okButtonHeight,
      color: "#333333",
      alpha: 0.5,
      radius: 4
    });
    
    // Draw button background
    canvas.drawRect({
      x: okButtonX,
      y: okButtonY,
      width: okButtonWidth,
      height: okButtonHeight,
      color: "#EBD9B0", // Lighter color for background
      alpha: 1,
      radius: 4,
      stroke: "#8E5F19", // Darker border
      strokeWidth: 2
    });
    
    // Draw button inner highlight
    canvas.drawRect({
      x: okButtonX + 2,
      y: okButtonY + 2,
      width: okButtonWidth - 4,
      height: okButtonHeight - 4,
      color: "#FFF5DD", // Highlight color
      alpha: 0.5,
      radius: 3
    });
    
    // Draw OK text with shadow
    canvas.drawText({
      text: "OK",
      x: okButtonX + okButtonWidth / 2 + 1,
      y: okButtonY + okButtonHeight / 2 + 1,
      color: "#333333",
      align: "center",
      fontSize: 14,
      fontWeight: "bold"
    });
    
    canvas.drawText({
      text: "OK",
      x: okButtonX + okButtonWidth / 2,
      y: okButtonY + okButtonHeight / 2,
      color: "#6B4916",
      align: "center",
      fontSize: 14,
      fontWeight: "bold"
    });
    
    // Draw Close button
    const closeButtonX = this.x + this.width - 30;
    const closeButtonY = this.y + 10;
    const closeButtonSize = 20;
    
    // Draw circular close button
    canvas.drawRect({
      x: closeButtonX,
      y: closeButtonY,
      width: closeButtonSize,
      height: closeButtonSize,
      color: "#D81F1F", // Red background
      alpha: 0.8,
      radius: closeButtonSize / 2
    });
    
    // Draw X
    canvas.drawText({
      text: "×",
      x: closeButtonX + closeButtonSize / 2,
      y: closeButtonY + closeButtonSize / 2,
      color: "#FFFFFF",
      align: "center",
      fontSize: 20,
      fontWeight: "bold"
    });
    
    // Draw meso icon and player's mesos
    const mesosY = this.y + this.height - 20;
    
    // Draw a MapleStory style mesos display
    canvas.drawRect({
      x: this.x + 20,
      y: mesosY - 10,
      width: 120,
      height: 22,
      color: "#F5F0E0",
      alpha: 0.7,
      radius: 3,
      stroke: "#D5BC8E",
      strokeWidth: 1
    });
    
    // Draw coin icon (simulate with a filled circle)
    canvas.drawRect({
      x: this.x + 30,
      y: mesosY - 5,
      width: 12,
      height: 12,
      color: "#FFD700", // Gold color
      alpha: 1,
      radius: 6, // Make it circular
      stroke: "#B8860B", // Darker gold border
      strokeWidth: 1
    });
    
    // Draw mesos amount
    canvas.drawText({
      text: `${this.playerMesos.toLocaleString()}`,
      x: this.x + 50,
      y: mesosY + 1,
      color: "#0B6121", // Money green
      align: "left",
      fontSize: 12,
      fontWeight: "bold"
    });
  }
};

// Make TaxiUI globally accessible for easier access
declare global {
  interface Window {
    TaxiUI: typeof TaxiUI;
    MapStateInstance: any;
    ClickManager: {
      GameCanvas: {
        mouseX: number;
        mouseY: number;
        clicked: boolean;
      }
    };
  }
}

// Expose TaxiUI to global scope
window.TaxiUI = TaxiUI;

export default TaxiUI;