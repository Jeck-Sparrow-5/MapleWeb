import WZManager from "../wz-utils/WZManager";
import UICommon from "./UICommon";
import MapleInput from "./MapleInput";
import Random from "../Random";
import {MapleStanceButton} from "./MapleStanceButton";
import ClickManager from "./ClickManager";
import GameCanvas from "../GameCanvas";
import LoginState, {LoginSubState} from '../LoginState';
import Camera from '../Camera';
import WZNode from '../wz-utils/WZNode';
import FrameAnimation from './FrameAnimation';
import MapleButton from './MapleButton';
import LoginPacket from '../Net/Packets/LoginPacket';
import UILoginNotice, {NoticeMessage, NoticeType} from './UILoginNotice';
import UILoginTOS from './UILoginTOS';
import config from '../Config';
import UILoginLoading from './UILoginLoading';
import AcceptTOSPacket from '../Net/Packets/AcceptTOSPacket';
import World from '../Net/Models/World';
import CharacterListRequestPacket from '../Net/Packets/CharacterListRequestPacket';
import Channel from '../Net/Models/Channel';
import { Character } from '../Net/Models/Character';

interface UILoginInterface {
  gameCanvas: GameCanvas;
  uiLogin: WZNode;
  frameImg: any;
  inputUsn: MapleInput | null;
  inputPwd: MapleInput | null;
  newCharStats: number[];
  initialize: (canvas: GameCanvas) => Promise<void>;
  createWorldButtons: () => void;
  resetWorld: () => void;
  doUpdate: (msPerTick: number, camera: any, canvas: GameCanvas) => void;
  doRender: (
    canvas: GameCanvas,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
  placeInputs: () => void;
  removeInputs: () => void;
  showLoading: () => void;
  hideLoading: () => void;
  drawMask: (canvas: GameCanvas) => void;
  worlds: World[];
  selectedWorldId: number | null;
  worldButtonImages: Map<number, WZNode>;
  worldImages: Map<number, WZNode>;
  selectedWorldImage: WZNode | null;
  channelSelectAnimation: FrameAnimation | null;
  selectedChannelIndex: number | null;
  scrollOpenAnimation: any;
  channelBackButton: any;
  behindFrameButtons: Set<MapleButton>;
  inFrontOfFrameButtons: MapleButton[];
  worldButtons: MapleButton[];
  channelButtons: MapleButton[];
  scrollContentFadeIn: {
    active: boolean;
    startTime: number;
    duration: number;
    alpha: number;
  };
  selectWorldChannelImgAnimation: {
    active: boolean;
    type: 'slideIn' | 'fadeOut';
    startTime: number;
    duration: number;
    startX: number;
    targetX: number;
    currentX: number;
    alpha: number;
  };
  startSelectWorldChannelImgSlideIn: () => void;
  startSelectWorldChannelImgFadeOut: () => void;
  selectCharacterImgAnimation: {
    active: boolean;
    type: 'slideIn' | 'fadeOut';
    startTime: number;
    duration: number;
    startX: number;
    targetX: number;
    currentX: number;
    alpha: number;
  };
  startSelectCharacterImgSlideIn: () => void;
  startSelectCharacterImgFadeOut: () => void;
  selectedWorldImageAnimation: {
    active: boolean;
    type: 'slideIn' | 'fadeOut';
    startTime: number;
    duration: number;
    startX: number;
    targetX: number;
    currentX: number;
    alpha: number;
  };
  startSelectedWorldSlideIn: () => void;
  stepImage: (stepId: number) => any;
  uiLoginNotice: UILoginNotice | null;
  showNotice: (noticeType: NoticeType, noticeMessage: NoticeMessage | null) => void;
  uiLoginTOS: UILoginTOS | null;
  showTOS: () => void;
  uiLoginLoading: UILoginLoading | null;
  viewAllCharacterButton: MapleButton;
  characters: Character[];
  selectedCharacterId: number | null;
}

const UILogin = {} as UILoginInterface;

UILogin.initialize = async function (canvas: GameCanvas) {
  this.gameCanvas = canvas;
  await UICommon.initialize();
  this.behindFrameButtons = new Set<MapleButton>();
  this.inFrontOfFrameButtons = [];
  this.worldButtons = [];
  this.channelButtons = [];
  this.channelSelectAnimation = null;
  this.selectedChannelIndex = null;
  this.uiLogin = await WZManager.get('UI.wz/Login.img');

  this.frameImg = this.uiLogin.nGet('Common').nGet('frame').nGetImage();
  this.selectedWorldImage = this.uiLogin.nGet('Common').selectWorld.nGetImage();
  this.worlds = [];
  this.characters = [];

  this.worldButtonImages = new Map<number, WZNode>();
  this.worldImages = new Map<number, WZNode>();

  this.inputUsn = new MapleInput(canvas, {
    x: 442,
    y: 236,
    width: 142,
    height: 20,
    color: "#ffffff",
  });
  this.inputPwd = new MapleInput(canvas, {
    x: 442,
    y: 265,
    width: 142,
    height: 20,
    color: "#ffffff",
    type: "password",
  });

  const startButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1360,
    img: this.uiLogin.nGet('CharSelect').nGet('BtSelect').nChildren,
    onClick: async () => {
      await LoginState.enterGame();
    },
  });
  ClickManager.addButton(startButton);
  this.behindFrameButtons.add(startButton);
  const createCharacterButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1325,
    img: this.uiLogin.nGet('CharSelect').nGet('BtNew').nChildren,
    onClick: async () => {
      console.log('Create character button clicked!');
    },
  });
  ClickManager.addButton(createCharacterButton);
  this.behindFrameButtons.add(createCharacterButton);
  const deleteCharacterButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1275,
    img: this.uiLogin.nGet('CharSelect').nGet('BtDelete').nChildren,
    onClick: async () => {
      console.log('Delete character button clicked!');
    },
  });
  ClickManager.addButton(deleteCharacterButton);
  this.behindFrameButtons.add(deleteCharacterButton);

  this.viewAllCharacterButton = new MapleStanceButton(canvas, {
    x: 0,
    y: 370,
    img: this.uiLogin.nGet('ViewAllChar').nGet('BtVAC').nChildren,
    isPartOfUI: true,
    isRelativeToCamera: true,
    isHidden: true,
    onClick: async () => {
      console.log('View All Characters button clicked!');
    },
  });
  ClickManager.addButton(this.viewAllCharacterButton);
  this.inFrontOfFrameButtons.push(this.viewAllCharacterButton);

  this.channelBackButton = new MapleStanceButton(canvas, {
    x: 0,
    y: 420,
    img: this.uiLogin.nGet('Common').nGet('BtStart').nChildren,
    isPartOfUI: true,
    isRelativeToCamera: true,
    isHidden: true,
    onClick: async () => {
      if (LoginState.currentSubState === LoginSubState.CHARACTER_SELECT) {
        await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
      } else {
        await LoginState.switchToSubState(LoginSubState.LOGIN_SCREEN);
      }
    },
  });
  ClickManager.addButton(this.channelBackButton);
  this.inFrontOfFrameButtons.push(this.channelBackButton);

  const loginButton = new MapleStanceButton(canvas, {
    x: 223,
    y: -85,
    img: this.uiLogin.nGet('Title').nGet('BtLogin').nChildren,
    onClick: async () => {
      if (!config.websocketUrl) { // @todo: remove this check when the login screen is fully implemented
        this.worlds.push(new World(0, 'Test', 1, 'Message', [
          new Channel(1, 'Test', 1, false)
        ]));
        await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
        return;
      }
      this.showLoading();
      new LoginPacket(this.inputUsn?.input.value, this.inputPwd?.input.value).dispatch();
    },
  });
  ClickManager.addButton(loginButton);
  this.behindFrameButtons.add(loginButton);

  this.uiLoginNotice = await UILoginNotice.fromOpts({
    x: 220,
    y: 160,
  });
  this.uiLoginTOS = await UILoginTOS.fromOpts({
    x: 195,
    y: 90,
    okHandler: () => {
      this.uiLoginTOS?.setIsHidden(true);
      this.showLoading();
      new AcceptTOSPacket().dispatch();
    },
  });

  /*
  const dice = new MapleFrameButton({
    x: 245,
    y: -1835,
    img: uiLogin.NewChar.dice.nChildren,
    onEndFrame: () => {
      this.newCharStats = Random.generateDiceRollStats();
      console.log("Random stats: ", this.newCharStats);
    },
    hoverAudio: false,
  });
  ClickManager.addButton(dice);
  */

  this.newCharStats = Random.generateDiceRollStats();

  const dx = Math.floor(-215);
  const dy = Math.floor(-830 - Camera.y);
  this.scrollOpenAnimation = new FrameAnimation(this.uiLogin.nGet('WorldSelect')?.nGet('scroll').nGet(0), dx, dy);
  this.scrollContentFadeIn = {
    active: false,
    startTime: 0,
    duration: 500,
    alpha: 0,
  };
  this.selectWorldChannelImgAnimation = {
    active: false,
    type: 'slideIn',
    startTime: 0,
    duration: 500,
    startX: -100,
    targetX: 0,
    currentX: 0,
    alpha: 1,
  };
  this.selectCharacterImgAnimation = {
    active: false,
    type: 'slideIn',
    startTime: 0,
    duration: 500,
    startX: -100,
    targetX: 0,
    currentX: 0,
    alpha: 1,
  };
  this.selectedWorldImageAnimation = {
    active: false,
    type: 'slideIn',
    startTime: 0,
    duration: 500,
    startX: -100,
    targetX: 0,
    currentX: 0,
    alpha: 1,
  };
};

UILogin.resetWorld = function () {
  this.worldButtons.forEach((button, index) => {
    ClickManager.removeButton(button);
    this.behindFrameButtons.delete(button);
  });
}

UILogin.createWorldButtons = function () {
  this.worlds.forEach((world: World) => {
    const buttonImage = this.uiLogin.nGet('WorldSelect')?.BtWorld.nGet(world.id, null);
    if (buttonImage) {
      this.worldButtonImages.set(world.id, buttonImage);
      const worldButton = new MapleStanceButton(this.gameCanvas, {
        x: -250 + this.worldButtonImages.size * 27,
        y: -800,
        img: buttonImage.nChildren,
        onClick: () => {
          this.scrollOpenAnimation.reset();
          this.scrollOpenAnimation.active = true;
          this.selectedWorldId = world.id;

          this.scrollContentFadeIn.active = false;
          this.scrollContentFadeIn.alpha = 0;

          this.channelSelectAnimation = null;

          this.channelButtons.forEach((button, index) => {
            ClickManager.removeButton(button);
          });
          this.channelButtons = [];

          for (let i = 0; i < 20; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            if (i < world.channels.length) {
              const channelButton = new MapleStanceButton(this.gameCanvas, {
                x: -145 + col * 92,
                y: -620 + row * 30,
                img: this.uiLogin.nGet('WorldSelect')?.nGet('channel')[i].nChildren,
                onClick: async () => {
                  console.log(`Channel ${i} selected!`);

                  this.selectedChannelIndex = i;
                  this.channelSelectAnimation = new FrameAnimation(
                    this.uiLogin.nGet('WorldSelect')?.nGet('channel').nGet('chSelect'),
                    -145 + col * 92 - 10,
                    -620 + row * 30 - 10
                  );
                  this.channelSelectAnimation.active = true;
                  // @todo: handle double click
                },
                isHidden: false
              });
              ClickManager.addButton(channelButton);
              this.channelButtons.push(channelButton);
            } else {
              // @todo: always disable
              const channelButton = new MapleStanceButton(this.gameCanvas, {
                x: -145 + col * 92,
                y: -620 + row * 30,
                img: this.uiLogin.nGet('WorldSelect')?.nGet('channel')[i].nChildren,
                onClick: async () => {},
                isHidden: false
              });
              this.channelButtons.push(channelButton);
            }
          }

          const enterChannelButton = new MapleStanceButton(this.gameCanvas, {
            x: 135,
            y: -470,
            img: this.uiLogin.nGet('WorldSelect')?.BtGoworld.nChildren,
            onClick: async () => {
              if (!config.websocketUrl) {
                await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
                return;
              }
              if (this.selectedWorldId !== null && this.selectedChannelIndex !== null) {
                this.showLoading();
                new CharacterListRequestPacket(this.selectedWorldId, this.selectedChannelIndex + 1).dispatch();
              }
            },
            isHidden: false
          });
          ClickManager.addButton(enterChannelButton);
          this.channelButtons.push(enterChannelButton);
        },
      });
      ClickManager.addButton(worldButton);
      this.worldButtons.push(worldButton);
      this.behindFrameButtons.add(worldButton);
    } else {
      console.warn(`World button image for world ${world.id} not found.`);
    }

    const image = this.uiLogin.nGet('WorldSelect')?.world.nGet(world.id, null);
    if (image) {
      this.worldImages.set(world.id, image);
    } else {
      console.warn(`World image for world ${world.id} not found.`);
    }
  });
}

UILogin.doUpdate = function (msPerTick, camera, canvas) {
  UICommon.doUpdate(msPerTick);

  const wasScrollActive = this.scrollOpenAnimation.active;
  this.scrollOpenAnimation.update(msPerTick);
  this.uiLoginLoading?.update(msPerTick);
  if (this.channelSelectAnimation) {
    this.channelSelectAnimation.update(msPerTick);
  }
  if (wasScrollActive && !this.scrollOpenAnimation.active && this.selectedWorldId !== null) {
    this.scrollContentFadeIn.active = true;
    this.scrollContentFadeIn.startTime = Date.now();
    this.scrollContentFadeIn.alpha = 0;
  }

  if (this.scrollContentFadeIn.active) {
    const elapsed = Date.now() - this.scrollContentFadeIn.startTime;
    this.scrollContentFadeIn.alpha = Math.min(elapsed / this.scrollContentFadeIn.duration, 1);

    if (this.scrollContentFadeIn.alpha === 1) {
      this.scrollContentFadeIn.active = false;
    }
  }

  if (this.selectWorldChannelImgAnimation.active) {
    const elapsed = Date.now() - this.selectWorldChannelImgAnimation.startTime;
    if (this.selectWorldChannelImgAnimation.type === 'slideIn') {
      this.selectWorldChannelImgAnimation.currentX = Math.min(
        this.selectWorldChannelImgAnimation.startX + (elapsed / this.selectWorldChannelImgAnimation.duration) * (this.selectWorldChannelImgAnimation.targetX - this.selectWorldChannelImgAnimation.startX),
        this.selectWorldChannelImgAnimation.targetX
      );
      this.selectWorldChannelImgAnimation.alpha = Math.min(elapsed / this.selectWorldChannelImgAnimation.duration, 1);
    } else if (this.selectWorldChannelImgAnimation.type === 'fadeOut') {
      this.selectWorldChannelImgAnimation.alpha = Math.max(1 - elapsed / this.selectWorldChannelImgAnimation.duration, 0);
    }

    if (this.selectWorldChannelImgAnimation.alpha === 0) {
      this.selectWorldChannelImgAnimation.active = false;
    }
  }
  if (this.selectCharacterImgAnimation.active) {
    const elapsed = Date.now() - this.selectCharacterImgAnimation.startTime;
    if (this.selectCharacterImgAnimation.type === 'slideIn') {
      this.selectCharacterImgAnimation.currentX = Math.min(
        this.selectCharacterImgAnimation.startX + (elapsed / this.selectCharacterImgAnimation.duration) * (this.selectCharacterImgAnimation.targetX - this.selectCharacterImgAnimation.startX),
        this.selectCharacterImgAnimation.targetX
      );
      this.selectCharacterImgAnimation.alpha = Math.min(elapsed / this.selectCharacterImgAnimation.duration, 1);
    } else if (this.selectCharacterImgAnimation.type === 'fadeOut') {
      this.selectCharacterImgAnimation.alpha = Math.max(1 - elapsed / this.selectCharacterImgAnimation.duration, 0);
    }

    if (this.selectCharacterImgAnimation.alpha === 0) {
      this.selectCharacterImgAnimation.active = false;
    }
  }
  if (this.selectedWorldImageAnimation.active) {
    const elapsed = Date.now() - this.selectedWorldImageAnimation.startTime;
    if (this.selectedWorldImageAnimation.type === 'slideIn') {
      this.selectedWorldImageAnimation.currentX = Math.min(
        this.selectedWorldImageAnimation.startX + (elapsed / this.selectedWorldImageAnimation.duration) * (this.selectedWorldImageAnimation.targetX - this.selectedWorldImageAnimation.startX),
        this.selectedWorldImageAnimation.targetX
      );
      this.selectedWorldImageAnimation.alpha = Math.min(elapsed / this.selectedWorldImageAnimation.duration, 1);
    } else if (this.selectedWorldImageAnimation.type === 'fadeOut') {
      this.selectedWorldImageAnimation.alpha = Math.max(1 - elapsed / this.selectedWorldImageAnimation.duration, 0);
    }

    if (this.selectedWorldImageAnimation.alpha === 0) {
      this.selectedWorldImageAnimation.active = false;
    }
  }
};

UILogin.doRender = function (canvas, camera, lag, msPerTick, tdelta) {
  // const currDiceFrame = this.dice[this.diceFrame];
  // const currDiceImage = currDiceFrame.nGetImage();
  // canvas.drawImage({
  //   img: currDiceImage,
  //   dx: this.diceX - camera.x - currDiceFrame.origin.nX,
  //   dy: this.diceY - camera.y - currDiceFrame.origin.nY,
  // });

  this.scrollOpenAnimation.draw(canvas, camera, lag, msPerTick, tdelta);

  this.behindFrameButtons.forEach((obj) => {
    obj.draw(canvas, camera, lag, msPerTick, tdelta);
  });

  if (typeof this.selectedWorldId !== 'undefined' && this.selectedWorldId !== null) {
    const worldImage = this.worldImages.get(this.selectedWorldId);
    if (worldImage) {
      canvas.drawImage({
        img: worldImage.nGetImage(),
        dx: 225,
        dy: -680 - Camera.y,
        alpha: this.scrollContentFadeIn.alpha
      });
    } else {
      console.warn(`World image for selected world ${this.selectedWorldId} not found.`);
    }

    this.channelButtons.forEach((obj) => {
      if (!obj.isHidden) {
        const stanceButton = obj as MapleStanceButton;
        const currentFrame = stanceButton.stances[stanceButton.stance];
        const currentImage = currentFrame?.nGetImage();
        if (currentImage) {
          canvas.drawImage({
            img: currentImage,
            dx: obj.x - camera.x,
            dy: obj.y - camera.y,
            alpha: this.scrollContentFadeIn.alpha
          });
        }
      }
    });

    if (this.channelSelectAnimation) {
      this.channelSelectAnimation.draw(canvas, camera, lag, msPerTick, tdelta);
    }
  }

  canvas.drawImage({
    img: this.frameImg,
    dx: 0,
    dy: 0,
  });

  this.inFrontOfFrameButtons.forEach((obj) => {
    obj.draw(canvas, camera, lag, msPerTick, tdelta);
  });

  if (this.selectWorldChannelImgAnimation.active) {
    canvas.drawImage({
      img: this.stepImage(1),
      dx: this.selectWorldChannelImgAnimation.currentX,
      dy: 30,
      alpha: this.selectWorldChannelImgAnimation.alpha
    });
  }

  if (this.selectCharacterImgAnimation.active) {
    canvas.drawImage({
      img: this.stepImage(2),
      dx: this.selectCharacterImgAnimation.currentX,
      dy: 30,
      alpha: this.selectCharacterImgAnimation.alpha
    });
  }

  if (this.selectedWorldImageAnimation.active) {
    canvas.drawImage({
      img: this.selectedWorldImage,
      dx: this.selectedWorldImageAnimation.currentX,
      dy: 100,
    });
  }

  if (this.characters.length > 0) {
    // @todo: draw character
    // @todo: pagination
    const character = this.characters[0];
    canvas.drawImage({
      img: this.uiLogin.CharSelect.adventure.nGet('0').nGetImage(),
      dx: -155 - camera.x,
      dy: -1295 - camera.y,
    });
    canvas.drawText({
      text: character.stat.characterName,
      color: '#FFFFFF',
      x: -130 - camera.x,
      y: -1115 - camera.y,
    });
  }

  canvas.drawText({
    text: "Ver. 0.83",
    fontWeight: "bold",
    x: 595,
    y: 13,
  });

  this.drawMask(canvas);

  this.uiLoginNotice?.draw(canvas, camera, lag, msPerTick, tdelta);
  this.uiLoginTOS?.draw(canvas, camera, lag, msPerTick, tdelta);
  this.uiLoginLoading?.draw(canvas, camera, lag, msPerTick, tdelta);

  UICommon.doRender(canvas, camera, lag, msPerTick, tdelta);
};

UILogin.drawMask = function (canvas) {
  const frameWidth = this.frameImg.width;
  const frameHeight = this.frameImg.height;
  const frameX = 0;
  const frameY = 0;
  canvas.context.fillStyle = "#000000";
  const canvasWidth = canvas.context.canvas.width;
  const canvasHeight = canvas.context.canvas.height;

  // Draw black rectangles to mask areas outside the frame
  canvas.context.fillRect(0, 0, frameX, canvasHeight); // Left mask
  canvas.context.fillRect(frameX + frameWidth,0, canvasWidth - (frameX + frameWidth), canvasHeight); // Right mask
  canvas.context.fillRect(frameX,0, frameWidth, frameY); // Top mask
  canvas.context.fillRect(frameX, frameY + frameHeight, frameWidth, canvasHeight - (frameY + frameHeight)); // Bottom mask
  canvas.context.restore();
};

UILogin.placeInputs = function () {
  this.inputUsn = new MapleInput(this.gameCanvas, {
    x: 442,
    y: 236,
    width: 142,
    height: 20,
    color: "#ffffff",
  });
  this.inputPwd = new MapleInput(this.gameCanvas, {
    x: 442,
    y: 265,
    width: 142,
    height: 20,
    color: "#ffffff",
    type: "password",
  });
}

UILogin.removeInputs = function () {
  if (this.inputUsn) this.inputUsn.remove();
  if (this.inputPwd) this.inputPwd.remove();
  this.inputUsn = null;
  this.inputPwd = null;
};

UILogin.showLoading = async function () {
  this.uiLoginLoading = await UILoginLoading.fromOpts({
    x: 280,
    y: 200,
    cancelHandler: () => {
      this.hideLoading();
    }
  });
  this.uiLoginLoading.setIsHidden(false);
};

UILogin.hideLoading = function () {
  this.uiLoginLoading = null;
};

UILogin.startSelectWorldChannelImgSlideIn = function () {
  const targetX = 0;
  this.selectWorldChannelImgAnimation = {
    active: true,
    type: 'slideIn',
    startTime: Date.now(),
    duration: 500,
    startX: targetX - 100,
    targetX: targetX,
    currentX: targetX,
    alpha: 0
  };
};

UILogin.startSelectWorldChannelImgFadeOut = function () {
  this.selectWorldChannelImgAnimation = {
    active: true,
    type: 'fadeOut',
    startTime: Date.now(),
    duration: 500,
    startX: 0,
    targetX: 0,
    currentX: 0,
    alpha: 1
  };
};

UILogin.startSelectCharacterImgSlideIn = function () {
  const targetX = 0;
  this.selectCharacterImgAnimation = {
    active: true,
    type: 'slideIn',
    startTime: Date.now(),
    duration: 500,
    startX: targetX - 100,
    targetX: targetX,
    currentX: targetX,
    alpha: 0
  };
};

UILogin.startSelectCharacterImgFadeOut = function () {
  this.selectCharacterImgAnimation = {
    active: true,
    type: 'fadeOut',
    startTime: Date.now(),
    duration: 500,
    startX: 0,
    targetX: 0,
    currentX: 0,
    alpha: 1
  };
};

UILogin.startSelectedWorldSlideIn = function () {
  const targetX = 0;
  this.selectedWorldImageAnimation = {
    active: true,
    type: 'slideIn',
    startTime: Date.now(),
    duration: 500,
    startX: targetX - 100,
    targetX: targetX,
    currentX: targetX,
    alpha: 0
  };
};

UILogin.stepImage = function (stepId: number) {
  const step = this.uiLogin.nGet('Common').nGet('step').nGet(stepId);
  if (step) {
    return step.nGetImage();
  }
  return null;
};

UILogin.showNotice = function (noticeType: NoticeType, noticeMessage: NoticeMessage | null) {
  if (!this.uiLoginNotice) {
    console.error('UILoginNotice is not initialized.');
    return;
  }
  this.uiLoginNotice.setIsHidden(false);
  this.uiLoginNotice.setNoticeType(noticeType);
  this.uiLoginNotice.setNoticeMessage(noticeMessage);
}

UILogin.showTOS = function () {
  if (!this.uiLoginTOS) {
    console.error('UILoginTOS is not initialized.');
    return;
  }
  this.uiLoginTOS.setIsHidden(false);
}

export default UILogin;
