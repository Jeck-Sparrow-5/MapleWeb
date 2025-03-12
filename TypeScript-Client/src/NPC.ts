import WZManager from "./wz-utils/WZManager";
import Random from "./Random";
import GameCanvas from "./GameCanvas";
import { CameraInterface } from "./Camera";
import TaxiUI, { TaxiDestination } from "./UI/TaxiUI";

class NPC {
  opts: any;
  oId: number = 0;
  id: number = 0;
  x: number = 0;
  cy: number = 0;
  // Add pos property for consistent positioning with other entities
  pos: { x: number, y: number } = { x: 0, y: 0 };
  flipped: boolean = false;
  fh: any = null;
  rx0: number = 0;
  rx1: number = 0;
  npcFile: any = null;
  stances: any = {};
  strings: any = {};
  floating: number = 0;
  
  // NPC type flags
  isTaxi: boolean = false;
  taxiDestinations: TaxiDestination[] = [];

  // MapleTV
  mapleTv: number = 0;
  mapleTvAdX: number = 0;
  mapleTvAdY: number = 0;
  mapleTvMsgX: number = 0;
  mapleTvMsgY: number = 0;
  tvAdStances: any = [];
  tvAdStance: number = 0;
  tvAdFrame: number = 0;
  tvAdDelay: number = 0;
  tvAdNextDelay: number = 0;
  mapleTvMsgImg: any = null;

  // NPC stance frames
  stance: string = "stand";
  frame: number = 0;
  delay: number = 0;
  nextDelay: number = 0;

  // Control rendering order, if needed
  layer: number = 0;

  // Whether to display chat balloon
  showDialog: boolean = false;
  
  // Dialog timing to show NPCs talking periodically
  dialogTimer: number = 0;
  dialogInterval: number = 12000; // Show dialog every 12 seconds
  dialogDuration: number = 6000;  // Show dialog for 6 seconds
  lastDialogTime: number = 0;
  initialDelayPassed: boolean = false; // For staggering NPC dialogs

  // Chat balloon images from ChatBalloon.img
  // Typically, "ChatBalloon.img" has multiple styles: "0", "1", "2", etc.
  // We'll pick style "0" for demonstration.
  chatBalloon: any = null;

  static async fromOpts(opts: any) {
    const npc = new NPC(opts);
    await npc.load();
    return npc;
  }

  constructor(opts: any) {
    this.opts = opts;
  }

  async load() {
    const opts = this.opts;

    this.oId = opts.oId;
    this.id = opts.id;
    this.x = opts.x;
    this.cy = opts.cy;
    // Set the pos property to match x and cy for consistent use across the codebase
    this.pos = { x: opts.x, y: opts.cy };
    this.flipped = opts.f;
    this.fh = opts.fh;
    this.rx0 = opts.rx0;
    this.rx1 = opts.rx1;

    // Load NPC sprite data
    let strId = `${this.id}`.padStart(7, "0");
    let npcFile: any = await WZManager.get(`Npc.wz/${strId}.img`);
    if (!!npcFile.info.link) {
      // If there's a link, follow it
      const linkId = npcFile.info.link.nValue;
      strId = `${linkId}`.padStart(7, "0");
      npcFile = await WZManager.get(`Npc.wz/${strId}.img`);
    }
    this.npcFile = npcFile;

    // Gather stance frames
    this.stances = {};
    npcFile.nChildren
      .filter((c: any) => c.nName !== "info")
      .forEach((stance: any) => {
        this.stances[stance.nName] = this.loadStance(npcFile, stance.nName);
      });

    // Load NPC strings
    this.strings = await this.loadStrings(this.id);

    // Check for various places where NPC dialogue might be stored
    // 1. Check in the npcFile directly for "speak" property
    if (npcFile.nGet("speak")) {
      this.strings.speak = npcFile.nGet("speak").nGet("nValue", "Hello!");
    } 
    // 2. Check in the info section
    else if (npcFile.info && npcFile.info.nGet("speak")) {
      this.strings.speak = npcFile.info.nGet("speak").nGet("nValue", "Hello!");
    }
    // 3. Check if there's a chat or dialogue property
    else if (npcFile.nGet("chat")) {
      this.strings.speak = npcFile.nGet("chat").nGet("nValue", "Hello!");
    }
    else if (npcFile.info && npcFile.info.nGet("chat")) {
      this.strings.speak = npcFile.info.nGet("chat").nGet("nValue", "Hello!");
    }
    
    // If no speak property is found anywhere, try to generate a relevant dialogue
    if (!this.strings.speak && this.strings.name) {
      if (this.strings.func) {
        this.strings.speak = `Hello! I'm ${this.strings.name}. I can help you with ${this.strings.func}.`;
      } else {
        this.strings.speak = `Hello! I'm ${this.strings.name}. Welcome to MapleStory!`;
      }
    }

    // Check if this is a taxi NPC based on function or name
    if (this.strings.func && 
        (this.strings.func.toLowerCase().includes('taxi') || 
         this.strings.func.toLowerCase().includes('cab'))) {
      this.isTaxi = true;
      this.setupTaxiDestinations();
    } else if (this.strings.name && 
              (this.strings.name.toLowerCase().includes('taxi') || 
               this.strings.name.toLowerCase().includes('cab') ||
               this.strings.name.toLowerCase().includes('driver'))) {
      this.isTaxi = true;
      this.setupTaxiDestinations();
    } else if (this.id === 1022000) { // Special case: Henesys regular cab
      this.isTaxi = true;
      this.setupTaxiDestinations();
    }

    // Some NPCs "float"
    this.floating = npcFile.info.nGet("float").nGet("nValue", 0);

    // MapleTV logic
    this.mapleTv = npcFile.info.nGet("MapleTV").nGet("nValue", 0);
    if (!!this.mapleTv) {
      this.mapleTvAdX = npcFile.info.MapleTVadX.nValue;
      this.mapleTvAdY = npcFile.info.MapleTVadY.nValue;
      this.mapleTvMsgX = npcFile.info.MapleTVmsgX.nValue;
      this.mapleTvMsgY = npcFile.info.MapleTVmsgY.nValue;

      const tvFile: any = await WZManager.get("UI.wz/MapleTV.img");
      const tvMsg = tvFile.TVmedia;
      this.tvAdStances = tvMsg.nChildren.map((stance: any, i: number) => {
        return this.loadStance(tvMsg, i.toString());
      });
      this.setTvAdFrame(Random.randInt(0, this.tvAdStances.length - 1), 0);
      this.mapleTvMsgImg = tvFile.TVbasic[0].nGetImage();
    }

    // Load the ChatBalloon image from UI.wz
    // We'll use the "0" style for demonstration. 
    // (You can switch it to "1", "2", "3", etc., based on your preference.)
    const chatBalloonFile: any = await WZManager.get("UI.wz/ChatBalloon.img");
    const style0 = chatBalloonFile["0"]; // We'll reference style "0"

    // Store them in a small object for easy usage:
    this.chatBalloon = {
      nw: style0.nw.nGetImage(),
      ne: style0.ne.nGetImage(),
      sw: style0.sw.nGetImage(),
      se: style0.se.nGetImage(),
      n: style0.n.nGetImage(),
      s: style0.s.nGetImage(),
      w: style0.w.nGetImage(),
      e: style0.e.nGetImage(),
      c: style0.c.nGetImage(),
      arrow: style0.arrow.nGetImage(),
    };
    // Note: There's also style0.clr. That might be a color int. We'll ignore for now.

    // Start with "stand" stance
    this.setFrame("stand", 0);
  }

  async loadStrings(id: number) {
    try {
      const stringFile: any = await WZManager.get("String.wz/Npc.img");
      const npcStrings = stringFile.nGet(id);
      
      if (!npcStrings || !npcStrings.nChildren) {
        console.warn(`No string data found for NPC ${id}`);
        return {};
      }
      
      const result: any = {};
      
      // Process all string properties
      for (const child of npcStrings.nChildren) {
        // Store basic properties like name and func
        result[child.nName] = child.nValue;
        
        // Look for dialogue patterns:
        // 'n0', 'n1', 'n2' etc. are normal chat messages NPCs say periodically
        if (child.nName.startsWith('n') && !isNaN(parseInt(child.nName.substring(1)))) {
          if (!result.dialogues) {
            result.dialogues = [];
          }
          result.dialogues.push(child.nValue);
        }
        
        // 'd0', 'd1', etc. are often quest-related dialogues
        if (child.nName.startsWith('d') && !isNaN(parseInt(child.nName.substring(1)))) {
          if (!result.questDialogues) {
            result.questDialogues = [];
          }
          result.questDialogues.push(child.nValue);
        }
      }
      
      // If we found dialogue lines, use the first one as the speak text
      if (result.dialogues && result.dialogues.length > 0) {
        result.speak = result.dialogues[0];
      }
      
      return result;
    } catch (e) {
      console.error(`Error loading strings for NPC ${id}:`, e);
      return {};
    }
  }

  // Define taxi destinations based on the current map and NPC's location
  setupTaxiDestinations() {
    const currentMapId = this.opts.map?.id || 0;
    
    // Clear existing destinations
    this.taxiDestinations = [];
    
    // Get the area of the current map to determine available destinations
    const firstDigit = Math.floor(currentMapId / 100000000);
    
    // Victoria Island Taxi destinations (100000000 series)
    if (firstDigit === 1) {
      // Default Victoria Island destinations
      const victoriaDestinations = [
        { mapId: 100000000, name: "Henesys", cost: 1000 },
        { mapId: 101000000, name: "Ellinia", cost: 1000 },
        { mapId: 102000000, name: "Perion", cost: 1000 },
        { mapId: 103000000, name: "Kerning City", cost: 1000 },
        { mapId: 104000000, name: "Lith Harbor", cost: 800 },
        { mapId: 120000000, name: "Nautilus Harbor", cost: 1200 }
      ];
      
      // Remove the current map from destinations
      this.taxiDestinations = victoriaDestinations.filter(dest => dest.mapId !== currentMapId);
    }
    // Ossyria Taxi destinations (200000000 series)
    else if (firstDigit === 2) {
      const ossyriaDestinations = [
        { mapId: 200000000, name: "Orbis", cost: 1200 },
        { mapId: 211000000, name: "El Nath", cost: 1200 },
        { mapId: 220000000, name: "Ludibrium", cost: 1200 },
        { mapId: 221000000, name: "Omega Sector", cost: 1500 },
        { mapId: 222000000, name: "Korean Folk Town", cost: 1500 },
        { mapId: 230000000, name: "Aquarium", cost: 1500 },
        { mapId: 240000000, name: "Leafre", cost: 1500 },
        { mapId: 250000000, name: "Mu Lung", cost: 1500 },
        { mapId: 251000000, name: "Herb Town", cost: 1500 }
      ];
      
      // Remove the current map from destinations
      this.taxiDestinations = ossyriaDestinations.filter(dest => dest.mapId !== currentMapId);
    }
    // Default case: if we're in an unknown area, offer a mix of popular destinations
    else {
      this.taxiDestinations = [
        { mapId: 100000000, name: "Henesys", cost: 1500 },
        { mapId: 101000000, name: "Ellinia", cost: 1500 },
        { mapId: 102000000, name: "Perion", cost: 1500 },
        { mapId: 103000000, name: "Kerning City", cost: 1500 },
        { mapId: 104000000, name: "Lith Harbor", cost: 1500 },
        { mapId: 200000000, name: "Orbis", cost: 2000 },
        { mapId: 211000000, name: "El Nath", cost: 2000 },
        { mapId: 220000000, name: "Ludibrium", cost: 2000 }
      ];
    }
  }
  
  // Handle taxi functionality when this NPC is clicked
  showTaxiDialog() {
    if (!this.isTaxi || !window.ClickManager?.GameCanvas) return;
    
    // Show the taxi UI with this NPC's destinations
    TaxiUI.show(window.ClickManager.GameCanvas, this.taxiDestinations);
    
    // Hide NPC chat balloon when showing the taxi dialog
    this.showDialog = false;
  }

  loadStance(wzNode: any = {}, stance: string = "stand") {
    if (!wzNode[stance]) {
      return { frames: [] };
    }
    const frames: any[] = [];
    wzNode[stance].nChildren.forEach((frame: any) => {
      if (frame.nTagName === "canvas" || frame.nTagName === "uol") {
        const Frame = frame.nTagName === "uol" ? frame.nResolveUOL() : frame;
        frames.push(Frame);
      } else {
        console.log(`Unhandled frame type=${frame.nTagName} stance=${stance}`);
      }
    });
    return { frames };
  }

  setFrame(stance = "stand", frame = 0, carryOverDelay = 0) {
    const s = this.stances[stance] ? stance : "stand";
    const f = this.stances[s].frames[frame] ? frame : 0;
    const stanceFrame = this.stances[s].frames[f];

    this.stance = s;
    this.frame = f;
    this.delay = carryOverDelay;
    this.nextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
  }

  setTvAdFrame(stance = 0, frame = 0, carryOverDelay = 0) {
    const s = this.tvAdStances[stance] ? stance : 0;
    const f = this.tvAdStances[s].frames[frame] ? frame : 0;
    const stanceFrame = this.tvAdStances[s].frames[f];

    this.tvAdStance = s;
    this.tvAdFrame = f;
    this.tvAdDelay = carryOverDelay;
    this.tvAdNextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    // Draw the NPC's stance
    const currentFrame = this.stances[this.stance]?.frames[this.frame];
    if (!currentFrame) return;

    const currentImage = currentFrame.nGetImage();
    const originX = currentFrame.nGet("origin").nGet("nX", 0);
    const originY = currentFrame.nGet("origin").nGet("nY", 0);
    const adjustX = !this.flipped ? originX : currentFrame.nWidth - originX;

    canvas.drawImage({
      img: currentImage,
      dx: this.x - camera.x - adjustX,
      dy: this.cy - camera.y - originY,
      flipped: !!this.flipped,
    });

    // Name, func text
    this.drawName(canvas, camera, lag, msPerTick, tdelta);

    // MapleTV
    this.drawTvAd(canvas, camera, lag, msPerTick, tdelta);

    // Chat balloon
    if (this.showDialog) {
      this.drawChatBalloon(canvas, camera);
    }
  }

  drawName(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    const hideName = this.npcFile.info.nGet("hideName").nGet("nValue", 0);
    const hasName = !!this.strings.name;
    const hasFunc = !!this.strings.func;
    const tagHeight = 16;
    const tagPadding = 4;
    const tagColor = "#000000";
    const tagAlpha = 0.7;
    const offsetFromCy = 2;

    if (!hideName && hasName) {
      const nameOpts = {
        text: this.strings.name,
        x: this.x - camera.x,
        y: this.cy - camera.y + offsetFromCy + 3,
        color: "#ffff00",
        fontWeight: "bold",
        align: "center" as const,
      };
      const nameWidth = Math.ceil(canvas.measureText(nameOpts).width + tagPadding);
      const nameTagX = Math.ceil(this.x - camera.x - nameWidth / 2);

      canvas.drawRect({
        x: nameTagX,
        y: this.cy - camera.y + offsetFromCy,
        width: nameWidth,
        height: tagHeight,
        color: tagColor,
        alpha: tagAlpha,
      });
      canvas.drawText(nameOpts);
    }

    if (!hideName && hasFunc) {
      const funcOpts = {
        text: this.strings.func,
        x: this.x - camera.x,
        y: this.cy - camera.y + offsetFromCy + tagHeight + 4,
        color: "#ffff00",
        fontWeight: "bold",
        align: "center" as const,
      };
      const funcWidth = Math.ceil(canvas.measureText(funcOpts).width + tagPadding);
      const funcTagX = Math.ceil(this.x - camera.x - funcWidth / 2);

      canvas.drawRect({
        x: funcTagX,
        y: this.cy - camera.y + offsetFromCy + tagHeight + 1,
        width: funcWidth,
        height: tagHeight,
        color: tagColor,
        alpha: tagAlpha,
      });
      canvas.drawText(funcOpts);
    }
  }

  drawTvAd(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (!this.mapleTv) return;

    const s = this.tvAdStance;
    const f = this.tvAdFrame;
    const currentFrame = this.tvAdStances[s]?.frames[f];
    if (!currentFrame) return;

    const currentImage = currentFrame.nGetImage();
    canvas.drawImage({
      img: currentImage,
      dx: this.x - camera.x + this.mapleTvAdX,
      dy: this.cy - camera.y + this.mapleTvAdY,
    });

    if (this.mapleTvMsgImg) {
      const msgX = this.x - camera.x + ((this.mapleTvMsgX - 0x10000) % 0x10000);
      const msgY = this.cy - camera.y + this.mapleTvMsgY;
      canvas.drawImage({
        img: this.mapleTvMsgImg,
        dx: msgX,
        dy: msgY,
      });
    }
  }

  // Draw a MapleStory style chat balloon using ChatBalloon.img (9-slice + arrow).
  drawChatBalloon(canvas: GameCanvas, camera: CameraInterface) {
    if (!this.chatBalloon) return;
    
    // CRITICAL: All drawing in this method must use screen coordinates
    // Screen coordinates = world coordinates - camera position
    // This ensures everything moves together with the camera

    // Get the NPC's dialogue text
    let text = "";
    
    // If we have a list of dialogues, select one randomly
    if (this.strings.dialogues && this.strings.dialogues.length > 0) {
      // Use a consistent dialogue selection based on time
      const dialogueIndex = Math.floor(Date.now() / this.dialogDuration) % this.strings.dialogues.length;
      text = this.strings.dialogues[dialogueIndex];
    }
    // Fallback to speak property if no dialogues or if already set
    else if (this.strings.speak) {
      text = this.strings.speak;
    }
    // If nothing else is available, use name for greeting
    else if (this.strings.name) {
      if (this.strings.func) {
        text = `Hello, I am ${this.strings.name}, the ${this.strings.func}!`;
      } else {
        text = `Hello, I am ${this.strings.name}!`;
      }
    } 
    // Ultimate fallback
    else {
      text = "Hello, traveler!";
    }

    // Check if the text is too long and wrap it
    const maxWidth = 160; // Maximum width in pixels
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testOpts = { text: testLine, fontSize: 12 };
      const testWidth = canvas.measureText(testOpts).width;
      
      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    // Calculate balloon dimensions based on wrapped text
    const textHeight = 16; // approximate line height
    const totalTextHeight = textHeight * lines.length;
    const paddingX = 12;
    const paddingY = 8;
    
    // Find the widest line for the balloon width
    let maxLineWidth = 0;
    for (const line of lines) {
      const lineOpts = { text: line, fontSize: 12 };
      const lineWidth = canvas.measureText(lineOpts).width;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }

    // The total balloon size is text size + padding
    // Ensure we have enough padding for the 9-slice corners
    const cornerSize = 6;
    const minWidth = 100;
    const minHeight = 40;
    
    // Add extra padding to ensure corners don't get cut off
    const balloonW = Math.max(maxLineWidth + paddingX * 2 + cornerSize * 2, minWidth); 
    const balloonH = Math.max(totalTextHeight + paddingY * 2 + cornerSize * 2, minHeight);

    // ESSENTIAL FIX: Convert NPC world coordinates to screen coordinates
    // Both the balloon and arrow MUST use the same coordinate system
    // This ensures they move together as one unit
    const npcScreenX = this.x - camera.x;
    const npcScreenY = this.cy - camera.y;
    
    // Keep pos property synced (not directly related to balloon issue)
    this.pos.x = this.x; 
    this.pos.y = this.cy;

    // let's define top-left corner
    // We’ll shift the balloon up 40 px, say, plus half of the balloon height
    // CRITICAL FIX: Position balloon based on NPC's screen coordinates
    // This ensures the balloon and arrow stay aligned properly when camera moves
    const canvasWidth = canvas.width || 800;
    const canvasHeight = canvas.height || 600;
    
    // Center balloon horizontally above NPC
    const balloonCenterX = npcScreenX;
    const balloonX = Math.max(20, Math.min(canvasWidth - balloonW - 20, balloonCenterX - balloonW / 2));
    
    // Position balloon at a fixed offset above the NPC rather than absolute position
    const offsetY = 120; // Distance above NPC head
    const balloonY = Math.max(20, Math.min(canvasHeight - balloonH - 20, npcScreenY - offsetY));

    // The corners in style0 are typically 6x6,
    // edges are typically 12 wide or 6 wide, etc.
    // We'll draw corners, edges, center, arrow. 
    // For a variable size balloon, we tile edges if needed.

    // 1) corners
    // NW corner
    canvas.drawImage({
      img: this.chatBalloon.nw,
      dx: balloonX,
      dy: balloonY,
    });
    // NE corner
    canvas.drawImage({
      img: this.chatBalloon.ne,
      dx: balloonX + balloonW - cornerSize,
      dy: balloonY,
    });
    // SW corner
    canvas.drawImage({
      img: this.chatBalloon.sw,
      dx: balloonX,
      dy: balloonY + balloonH - cornerSize,
    });
    // SE corner
    canvas.drawImage({
      img: this.chatBalloon.se,
      dx: balloonX + balloonW - cornerSize,
      dy: balloonY + balloonH - cornerSize,
    });

    // 2) top edge
    const topEdgeWidth = balloonW - cornerSize * 2;
    // The "n" piece is 12 wide (?), we can tile it horizontally
    let tileX = balloonX + cornerSize;
    const tileY_top = balloonY;
    const nImg = this.chatBalloon.n; // top edge
    const nImgW = nImg.width; // typically 12 or so
    while (tileX < balloonX + balloonW - cornerSize) {
      const drawW = Math.min(nImgW, balloonX + balloonW - cornerSize - tileX);
      canvas.drawImage({
        img: nImg,
        sx: 0,
        sy: 0,
        sWidth: drawW,
        sHeight: nImg.height,
        dx: tileX,
        dy: tileY_top,
        dWidth: drawW,
        dHeight: nImg.height,
      });
      tileX += drawW;
    }

    // 3) bottom edge
    const sImg = this.chatBalloon.s; // bottom edge
    const sImgW = sImg.width;
    tileX = balloonX + cornerSize;
    const tileY_bottom = balloonY + balloonH - sImg.height; 
    while (tileX < balloonX + balloonW - cornerSize) {
      const drawW = Math.min(sImgW, balloonX + balloonW - cornerSize - tileX);
      canvas.drawImage({
        img: sImg,
        sx: 0,
        sy: 0,
        dx: tileX,
        dy: tileY_bottom,
      });
      tileX += drawW;
    }

    // 4) left edge
    const wImg = this.chatBalloon.w;
    const wImgH = wImg.height;
    let tileY = balloonY + cornerSize;
    while (tileY < balloonY + balloonH - cornerSize) {
      const drawH = Math.min(wImgH, balloonY + balloonH - cornerSize - tileY);
      canvas.drawImage({
        img: wImg,
        sx: 0,
        sy: 0,
        dx: balloonX,
        dy: tileY,
      });
      tileY += drawH;
    }

    // 5) right edge
    const eImg = this.chatBalloon.e;
    const eImgH = eImg.height;
    tileY = balloonY + cornerSize;
    const rightX = balloonX + balloonW - eImg.width;
    while (tileY < balloonY + balloonH - cornerSize) {
      const drawH = Math.min(eImgH, balloonY + balloonH - cornerSize - tileY);
      canvas.drawImage({
        img: eImg,
        sx: 0,
        sy: 0,
        dx: rightX,
        dy: tileY,
      });
      tileY += drawH;
    }

    // 6) center fill
    const cImg = this.chatBalloon.c;
    const centerX = balloonX + cornerSize;
    const centerY = balloonY + cornerSize;
    const centerW = balloonW - cornerSize * 2;
    const centerH = balloonH - cornerSize * 2;

    // We'll tile the "c" image to fill the rectangle if needed
    const cImgW = cImg.width;
    const cImgH = cImg.height;
    let fillY = centerY;
    while (fillY < centerY + centerH) {
      let fillX = centerX;
      const rowH = Math.min(cImgH, centerY + centerH - fillY);
      while (fillX < centerX + centerW) {
        const colW = Math.min(cImgW, centerX + centerW - fillX);
        canvas.drawImage({
          img: cImg,
          sx: 0,
          sy: 0,
          dx: fillX,
          dy: fillY,
        });
        fillX += colW;
      }
      fillY += rowH;
    }

    // 7) arrow - pointing from balloon to NPC
    const arrowImg = this.chatBalloon.arrow;
    const arrowW = arrowImg.width;
    const arrowH = arrowImg.height;
    
    // Position arrow directly above NPC, attached to the balloon bottom
    // CRITICAL FIX: Make sure arrow is ALWAYS centered above the NPC, regardless of balloon position
    const arrowX = npcScreenX - arrowW / 2; // Center aligned with NPC
    const arrowY = balloonY + balloonH - 1; // Connect arrow to balloon bottom edge
    canvas.drawImage({
      img: arrowImg,
      dx: arrowX,
      dy: arrowY,
    });

    // 8) Draw the wrapped text
    const lineStartY = balloonY + paddingY + 2; // Add a slight offset from top
    
    lines.forEach((line, index) => {
      canvas.drawText({
        text: line,
        x: balloonX + balloonW / 2,
        y: lineStartY + (index * textHeight),
        color: "#000000",
        align: "center",
        fontSize: 12,
        fontWeight: "normal",
      });
    });
  }

  updateTvAd(msPerTick: number) {
    if (!!this.mapleTv) {
      this.tvAdDelay += msPerTick;
      if (this.tvAdDelay > this.tvAdNextDelay) {
        this.setTvAdFrame(
          this.tvAdStance,
          this.tvAdFrame + 1,
          this.tvAdDelay - this.tvAdNextDelay
        );
      }
    }
  }

  update(msPerTick: number) {
    // Animate NPC stance
    this.delay += msPerTick;
    if (this.delay > this.nextDelay) {
      this.setFrame(this.stance, this.frame + 1, this.delay - this.nextDelay);
    }

    // CRITICAL: Ensure position consistency - this keeps balloons properly positioned
    this.pos.x = this.x;
    this.pos.y = this.cy;

    // MapleTV animation
    this.updateTvAd(msPerTick);
    
    // Global limit on how many NPCs can talk at once
    const MAX_TALKING_NPCS = 1; // Only allow one NPC to talk at a time
    
    // If this NPC is already showing a dialog, update its timer
    if (this.showDialog) {
      this.dialogTimer += msPerTick;
      // If we've shown dialog for long enough, hide it
      if (this.dialogTimer - this.lastDialogTime > this.dialogDuration) {
        this.showDialog = false;
        // Reset the timer for the next conversation
        this.dialogTimer = 0;
      }
      return; // Skip the rest of the logic if already showing dialog
    }
    
    // Update dialog timer for NPCs with dialogue
    if (this.strings.speak) {
      this.dialogTimer += msPerTick;
      
      // Add a random initial delay (between 2-8s) for each NPC to prevent all NPCs from talking at once
      if (!this.initialDelayPassed) {
        // Calculate a unique delay based on NPC ID to stagger conversations
        const initialDelay = 2000 + (this.id % 6) * 1000;
        if (this.dialogTimer > initialDelay) {
          this.initialDelayPassed = true;
          // Randomize the dialog timer so NPCs don't all get in sync
          this.dialogTimer = Math.random() * this.dialogInterval;
        }
        return;
      }
      
      // Check if dialog should be shown
      if (!this.showDialog) {
        // If we haven't shown dialog in a while, show it, but only if we're allowed
        if (this.dialogTimer > this.dialogInterval) {
          // Get all NPCs from the MapleMap
          // Skip showing dialog if we already have too many NPCs showing dialog
          const map = this.opts.map; // Access the map through the opts
          if (map && map.npcs) {
            const talkingNPCs = map.npcs.filter((npc: any) => npc.showDialog).length;
            if (talkingNPCs < MAX_TALKING_NPCS) {
              this.showDialog = true;
              this.lastDialogTime = this.dialogTimer;
            }
          } else {
            // If we can't check other NPCs, just show dialog
            this.showDialog = true;
            this.lastDialogTime = this.dialogTimer;
          }
        }
      }
    }
  }
}

export default NPC;
