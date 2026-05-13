import MyCharacter from "../MyCharacter";
import WZManager from "../wz-utils/WZManager";
import UIKeyConfig from "./UIKeyConfig";
import UIGameMenu from "./UIGameMenu";
import ChatPacket from "../Net/Packets/ChatPacket";
import SessionManager from "../SessionManager";
import ChatBubbleRenderer from "./ChatBubbleRenderer";
import UICommon from "./UICommon";
import MapleInput from "./MapleInput";
import MapleMap from "../MapleMap";
import config from "../Config";
import { MapleStanceButton } from "./MapleStanceButton";
import ClickManager from "./ClickManager";
import MapState from "../MapState";
import GameCanvas from "../GameCanvas";

interface ChatEntry {
  text: string;
  color: string;
  timestamp: number;
}

const CHAT_MAX = 20;
const CHAT_VISIBLE_DURATION = 8000;
let chatScrollOffset = 0; // positive = scrolled up into history

export interface UIMapInterface {
  statusBarLevelDigits: any[];
  firstUpdate: boolean;
  chat: MapleInput | null;
  chatHistory: ChatEntry[];
  addChatMessage: (text: string, color: string) => void;
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
  this.chatHistory = [];

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
      UIGameMenu.toggle();
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
      UIKeyConfig.toggle();
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
      MapState.skillBook?.setIsHidden(!MapState.skillBook?.isHidden);
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
      if (msg && msg[0] !== '!') {
        ChatBubbleRenderer.show(MyCharacter.id ?? 0, msg);
        if (SessionManager.isConnected()) {
          new ChatPacket(msg).dispatch();
        } else {
          this.addChatMessage(`${MyCharacter.name}: ${msg}`, '#FFFFFF');
        }
      }
      if (msg[0] === "!") {
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

UIMap.addChatMessage = function (text, color = '#FFFFFF') {
  this.chatHistory.push({ text, color, timestamp: Date.now() });
  if (this.chatHistory.length > CHAT_MAX) {
    this.chatHistory.shift();
  }
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
  // Scroll chat with mouse wheel when hovering over chat area
  if (canvas.scrolledUp)   chatScrollOffset = Math.min(chatScrollOffset + 1, Math.max(0, this.chatHistory.length - 8));
  if (canvas.scrolledDown) chatScrollOffset = Math.max(chatScrollOffset - 1, 0);

  // Chat history — 8 visible lines above chat input
  const now = Date.now();
  const chatBaseY = 524 + startUIPosition.y;
  // When scrolled, show history; when not, show recent+fading
  const allMsgs = chatScrollOffset > 0
    ? this.chatHistory.slice(-(8 + chatScrollOffset), -chatScrollOffset || undefined)
    : this.chatHistory.filter((m) => now - m.timestamp < CHAT_VISIBLE_DURATION).slice(-8);
  const visibleMsgs = allMsgs;
  visibleMsgs.forEach((m, i) => {
    const age = now - m.timestamp;
    const alpha = age > CHAT_VISIBLE_DURATION - 1000
      ? Math.max(0, 1 - (age - (CHAT_VISIBLE_DURATION - 1000)) / 1000)
      : 1;
    canvas.context.save();
    canvas.context.globalAlpha = alpha;
    canvas.context.font = '12px Arial';
    canvas.context.fillStyle = '#000000';
    canvas.context.fillText(m.text, 7, chatBaseY - (visibleMsgs.length - 1 - i) * 14 + 1);
    canvas.context.fillStyle = m.color;
    canvas.context.fillText(m.text, 6, chatBaseY - (visibleMsgs.length - 1 - i) * 14);
    canvas.context.restore();
  });

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
};

export default UIMap;
