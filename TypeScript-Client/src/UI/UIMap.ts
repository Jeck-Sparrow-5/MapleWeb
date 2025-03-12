import MyCharacter from "../MyCharacter";
import WZManager from "../wz-utils/WZManager";
import UICommon from "./UICommon";
import MapleInput from "./MapleInput";
import MapleMap from "../MapleMap";
import config from "../Config";
import { MapleStanceButton } from "./MapleStanceButton";
import ClickManager from "./ClickManager";
import MapState from "../MapState";
import GameCanvas from "../GameCanvas";

export interface UIMapInterface {
  statusBarLevelDigits: any[];
  firstUpdate: boolean;
  chat: MapleInput | null;
  statusBg: any;
  statusBg2: any;
  bars: any;
  graduation: any;
  barGray: any;
  statusBarNode: any;
  buttons: Set<any>;
  numbers: any;
  initialize: () => Promise<void>;
  addButtons: (canvas: GameCanvas) => void;
  doUpdate: (msPerTick: number, camera: any, canvas: GameCanvas) => void;
  drawLevel: (canvas: GameCanvas, level: number) => void;
  drawNumbers: (
    canvas: any,
    hp: number,
    maxHp: number,
    mp: number,
    maxMp: number,
    exp: number,
    maxExp: number
  ) => void;
  doRender: (
    canvas: any,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
}

const UIMap = {} as UIMapInterface;

UIMap.initialize = async function () {
  console.log("UIMap.initialize");
  await UICommon.initialize();

  const basic: any = await WZManager.get("UI.wz/Basic.img");
  this.statusBarLevelDigits = basic.LevelNo.nChildren.map((d: any) =>
    d.nGetImage()
  );

  this.firstUpdate = true;
  this.chat = null;

  const statusBar: any = await WZManager.get("UI.wz/StatusBar.img");
  this.statusBg = statusBar.base.backgrnd.nGetImage();
  this.statusBg2 = statusBar.base.backgrnd2.nGetImage();
  this.bars = statusBar.gauge.bar.nGetImage();
  this.graduation = statusBar.gauge.graduation.nGetImage();
  this.barGray = statusBar.gauge.gray.nGetImage();

  this.statusBarNode = statusBar;

  this.buttons = new Set<any>();

  this.numbers = statusBar.number.nChildren.reduce(
    (numbers: any, node: any) => {
      numbers[node.nName] = node.nGetImage();
      return numbers;
    },
    {}
  );
};

const startUIPosition = {
  x: 0,
  y: config.height - config.originalHeight,
};

UIMap.addButtons = function (canvas) {
  console.log("addButtons");
  console.log(this.statusBarNode.EquipKey.nChildren);

  const quickSlot = new MapleStanceButton(canvas, {
    x: 768,
    y: 536 + startUIPosition.y,
    img: this.statusBarNode.QuickSlot.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      // console.log("Current stance: ", self.stance);
      console.log("equip click!");
    },
  });
  ClickManager.addButton(quickSlot);
  this.buttons.add(quickSlot);

  const keyboardlKey = new MapleStanceButton(canvas, {
    x: 736,
    y: 536 + startUIPosition.y,
    img: this.statusBarNode.KeySet.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      // console.log("Current stance: ", self.stance);
      console.log("keyboard settings click!");
    },
  });
  ClickManager.addButton(keyboardlKey);
  this.buttons.add(keyboardlKey);

  const skillKey = new MapleStanceButton(canvas, {
    x: 704,
    y: 536 + startUIPosition.y,
    img: this.statusBarNode.SkillKey.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      // console.log("Current stance: ", self.stance);
      console.log("equip click!");
    },
  });
  ClickManager.addButton(skillKey);
  this.buttons.add(skillKey);

  const invetoryKey = new MapleStanceButton(canvas, {
    x: 672,
    y: 536 + startUIPosition.y,
    img: this.statusBarNode.InvenKey.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      // console.log("Current stance: ", self.stance);
      console.log("inventory click!");
      MapState.inventoryMenu.setIsHidden(!MapState.inventoryMenu.isHidden);
    },
  });
  ClickManager.addButton(invetoryKey);
  this.buttons.add(invetoryKey);

  const equipKey = new MapleStanceButton(canvas, {
    x: 640,
    y: 536 + startUIPosition.y,
    img: this.statusBarNode.EquipKey.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      MapState.statsMenu.setIsHidden(!MapState.statsMenu.isHidden);
    },
  });
  ClickManager.addButton(equipKey);
  this.buttons.add(equipKey);
};

UIMap.doUpdate = function (msPerTick, camera, canvas) {
  if (this.firstUpdate) {
    console.log("First update");
    this.chat = new MapleInput(canvas, {
      x: 5,
      y: 540 + startUIPosition.y,
      width: 530,
      color: "#000000",
      background: "#ffffff",
      height: 13,
    });
    this.chat.addSubmitListener(() => {
      const msg = this.chat!.input.value;
      this.chat!.input.value = "";
      
      if (msg.trim()) {
        if (msg[0] === "!") {
          // Handle command inputs
          const [command, ...commandArgs] = msg.split(" ");
          console.log(command, commandArgs);
          switch (command) {
            case "!level": {
              const level = Number(commandArgs[0]);
              if (!Number.isInteger(level) || level > 250 || level < 1) {
                break;
              }
              if (level > MyCharacter.stats.level) {
                MyCharacter.playLevelUp();
              }
              MyCharacter.stats.level = level;
              break;
            }
            case "!map": {
              const mapId = Number(commandArgs[0]);
              if (!Number.isInteger(mapId)) {
                break;
              }
              MapleMap.load(mapId);
              break;
            }
            default: {
              break;
            }
          }
        } else {
          // Regular chat message - show in a chat balloon
          this.showPlayerChatBalloon(msg);
        }
      }
      
      canvas.releaseFocusInput();
    });
    this.firstUpdate = false;

    this.addButtons(canvas);
  }
  if (!canvas.focusInput && canvas.focusGame && canvas.isKeyDown("enter")) {
    this.chat!.input.focus();
  }
  UICommon.doUpdate(msPerTick);
};

UIMap.drawLevel = function (canvas, level) {
  const dy = 576 + startUIPosition.y;
  if (level >= 100) {
    const first = Math.floor(level / 100);
    const second = (Math.floor(level / 10) - 10) % 10;
    const third = level % 10;
    canvas.drawImage({
      img: this.statusBarLevelDigits[first],
      dx: 36,
      dy,
    });
    canvas.drawImage({
      img: this.statusBarLevelDigits[second],
      dx: 48,
      dy,
    });
    canvas.drawImage({
      img: this.statusBarLevelDigits[third],
      dx: 60,
      dy,
    });
  } else if (level >= 10) {
    const first = Math.floor(level / 10);
    const second = level % 10;
    canvas.drawImage({
      img: this.statusBarLevelDigits[first],
      dx: 42,
      dy,
    });
    canvas.drawImage({
      img: this.statusBarLevelDigits[second],
      dx: 54,
      dy,
    });
  } else {
    canvas.drawImage({
      img: this.statusBarLevelDigits[level],
      dx: 48,
      dy,
    });
  }
};

UIMap.drawNumbers = function (canvas, hp, maxHp, mp, maxMp, exp, maxExp) {
  canvas.drawImage({
    img: this.numbers.Lbracket,
    dx: 234,
    dy: 570 + startUIPosition.y,
  });

  const hpX = [...`${hp}`, "slash", ...`${maxHp}`].reduce((x, digit) => {
    canvas.drawImage({
      img: this.numbers[digit],
      dx: x,
      dy: 571 + startUIPosition.y,
    });
    x += this.numbers[digit].width + 1;
    return x;
  }, 238);

  canvas.drawImage({
    img: this.numbers.Rbracket,
    dx: hpX + 1,
    dy: 570 + startUIPosition.y,
  });

  canvas.drawImage({
    img: this.numbers.Lbracket,
    dx: 346,
    dy: 570 + startUIPosition.y,
  });

  const mpX = [...`${mp}`, "slash", ...`${maxMp}`].reduce((x, digit) => {
    canvas.drawImage({
      img: this.numbers[digit],
      dx: x,
      dy: 571 + startUIPosition.y,
    });
    x += this.numbers[digit].width + 1;
    return x;
  }, 350);

  canvas.drawImage({
    img: this.numbers.Rbracket,
    dx: mpX + 1,
    dy: 570 + startUIPosition.y,
  });

  const experiencePercentage = (exp / maxExp) * 100;
  const experiencePercentageRounded = experiencePercentage.toFixed(2);
  const expX = [...`${exp}[${experiencePercentageRounded}%]`].reduce(
    (x, digit) => {
      if (digit === ".") {
        canvas.drawRect({
          x: x,
          y: 571 + this.numbers[0].height - 1 + startUIPosition.y,
          width: 2,
          height: 1,
          color: "#ffffff",
        });

        x += 4;
      } else {
        if (digit === "%") {
          digit = "percent";
        } else if (digit === "[") {
          digit = "Lbracket";
        } else if (digit === "]") {
          digit = "Rbracket";
        }

        canvas.drawImage({
          img: this.numbers[digit],
          dx: x,
          dy: 571 + startUIPosition.y,
        });
        x += this.numbers[digit].width + 1;
      }

      return x;
    },
    462
  );
};

UIMap.doRender = function (canvas, camera, lag, msPerTick, tdelta) {
  canvas.drawImage({
    img: this.statusBg,
    dx: 0,
    dy: 529 + startUIPosition.y,
  });

  canvas.drawImage({
    img: this.statusBg2,
    dx: 0,
    dy: 529 + startUIPosition.y,
  });

  this.drawLevel(canvas, MyCharacter.stats.level);

  canvas.drawText({
    text: MyCharacter.stats.job,
    color: "#ffffff",
    x: 85,
    y: 570 + startUIPosition.y,
  });

  canvas.drawText({
    text: MyCharacter.name,
    color: "#ffffff",
    x: 85,
    y: 585 + startUIPosition.y,
  });

  canvas.drawImage({
    img: this.bars,
    dx: 215,
    dy: 567 + startUIPosition.y,
  });

  const { hp, maxHp, mp, maxMp, exp, maxExp } = MyCharacter;

  const numHpGrays = 105 - Math.floor((hp / maxHp) * 105);
  for (let i = 0; i < numHpGrays; i += 1) {
    canvas.drawImage({
      img: this.barGray,
      dx: 321 - i,
      dy: 581 + startUIPosition.y,
    });
  }

  const numMpGrays = 105 - Math.floor((mp / maxMp) * 105);
  for (let i = 0; i < numMpGrays; i += 1) {
    canvas.drawImage({
      img: this.barGray,
      dx: 429 - i,
      dy: 581 + startUIPosition.y,
    });
  }

  const expBarLength = 115;
  const numExpGrays = expBarLength - Math.floor((exp / maxExp) * expBarLength);
  for (let i = 0; i < numExpGrays; i += 1) {
    canvas.drawImage({
      img: this.barGray,
      dx: 552 - i,
      dy: 581 + startUIPosition.y,
    });
  }

  canvas.drawImage({
    img: this.graduation,
    dx: 215,
    dy: 566 + startUIPosition.y,
  });

  this.drawNumbers(canvas, hp, maxHp, mp, maxMp, exp, maxExp);

  this.buttons.forEach((obj) => {
    obj.draw(canvas, camera, lag, msPerTick, tdelta);
  });

  UICommon.doRender(canvas, camera, lag, msPerTick, tdelta);
  
  // Draw chat balloon if player has one
  if (MapleMap.PlayerCharacter && 
      MapleMap.PlayerCharacter.showChatBalloon && 
      MapleMap.PlayerCharacter.drawChatBalloon) {
    MapleMap.PlayerCharacter.drawChatBalloon(canvas, camera);
  }
};

// Function to show player chat balloon
UIMap.showPlayerChatBalloon = function(message) {
  // Make sure the player character exists
  if (!MapleMap.PlayerCharacter) return;
  
  // If the character doesn't have the chat balloon methods/properties yet, add them
  const player = MapleMap.PlayerCharacter;
  
  // If we need to add the chat balloon functionality to the player
  if (!player.chatMessage) {
    // Initialize chat balloon properties
    player.chatMessage = "";
    player.showChatBalloon = false;
    player.chatBalloonTimer = 0;
    player.chatBalloonDuration = 5000; // Show for 5 seconds
    
    // Add update method for chat balloon to player
    const originalDoUpdate = player.doUpdate || function() {};
    player.doUpdate = function(msPerTick) {
      // Call original update if it exists
      if (originalDoUpdate && typeof originalDoUpdate === 'function') {
        originalDoUpdate.call(this, msPerTick);
      }
      
      // Update chat balloon timer
      if (this.showChatBalloon) {
        this.chatBalloonTimer += msPerTick;
        if (this.chatBalloonTimer >= this.chatBalloonDuration) {
          this.showChatBalloon = false;
          this.chatBalloonTimer = 0;
        }
      }
    };
    
    // Add draw method for chat balloon
    player.drawChatBalloon = function(canvas, camera) {
      if (!this.chatBalloon || !this.chatMessage || !this.showChatBalloon) return;
      
      // Check if the text is too long and wrap it
      const maxWidth = 160; // Maximum width in pixels
      const words = this.chatMessage.split(' ');
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
      const cornerSize = 6;
      const minWidth = 100;
      const minHeight = 40;
      
      // Add extra padding to ensure corners don't get cut off
      const balloonW = Math.max(maxLineWidth + paddingX * 2 + cornerSize * 2, minWidth); 
      const balloonH = Math.max(totalTextHeight + paddingY * 2 + cornerSize * 2, minHeight);
  
      // Convert character world coordinates to screen coordinates
      const playerScreenX = this.pos.x - camera.x;
      const playerScreenY = this.pos.y - camera.y;
      
      // Position balloon above player
      const balloonCenterX = playerScreenX;
      const balloonX = Math.max(20, Math.min(800 - balloonW - 20, balloonCenterX - balloonW / 2));
      const balloonY = Math.max(20, Math.min(600 - balloonH - 20, playerScreenY - 120 - balloonH));
  
      // Draw corners
      canvas.drawImage({
        img: this.chatBalloon.nw,
        dx: balloonX,
        dy: balloonY,
      });
      canvas.drawImage({
        img: this.chatBalloon.ne,
        dx: balloonX + balloonW - cornerSize,
        dy: balloonY,
      });
      canvas.drawImage({
        img: this.chatBalloon.sw,
        dx: balloonX,
        dy: balloonY + balloonH - cornerSize,
      });
      canvas.drawImage({
        img: this.chatBalloon.se,
        dx: balloonX + balloonW - cornerSize,
        dy: balloonY + balloonH - cornerSize,
      });
  
      // Draw top edge
      let tileX = balloonX + cornerSize;
      const tileY_top = balloonY;
      const nImg = this.chatBalloon.n;
      const nImgW = nImg.width;
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
  
      // Draw bottom edge
      const sImg = this.chatBalloon.s;
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
  
      // Draw left edge
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
  
      // Draw right edge
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
  
      // Draw center fill
      const cImg = this.chatBalloon.c;
      const centerX = balloonX + cornerSize;
      const centerY = balloonY + cornerSize;
      const centerW = balloonW - cornerSize * 2;
      const centerH = balloonH - cornerSize * 2;
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
  
      // Draw arrow
      const arrowImg = this.chatBalloon.arrow;
      const arrowW = arrowImg.width;
      const arrowH = arrowImg.height;
      const arrowX = balloonCenterX - arrowW / 2;
      const arrowY = balloonY + balloonH - 1;
      canvas.drawImage({
        img: arrowImg,
        dx: arrowX,
        dy: arrowY,
      });
  
      // Draw text lines
      const lineStartY = balloonY + paddingY + 2;
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
    };
  }
  
  // Update the chat balloon loading if needed
  if (!player.chatBalloon) {
    // Load chat balloon images if not already loaded
    WZManager.get("UI.wz/ChatBalloon.img").then((chatBalloonFile) => {
      const style0 = chatBalloonFile["0"]; // Use style "0" (same as NPCs)
      
      // Store chat balloon parts for easy usage
      player.chatBalloon = {
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
      
      // Now that we have the chat balloon loaded, show the message
      player.chatMessage = message;
      player.showChatBalloon = true;
      player.chatBalloonTimer = 0;
    }).catch(e => {
      console.error("Error loading chat balloon images:", e);
    });
  } else {
    // Chat balloon already loaded, just show the message
    player.chatMessage = message;
    player.showChatBalloon = true;
    player.chatBalloonTimer = 0;
  }
};

export default UIMap;
