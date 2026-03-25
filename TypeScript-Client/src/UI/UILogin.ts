import WZManager from "../wz-utils/WZManager";
import UICommon from "./UICommon";
import MapleInput from "./MapleInput";
import Random from "../Random";
import { MapleStanceButton } from "./MapleStanceButton";
import ClickManager from "./ClickManager";
import GameCanvas from "../GameCanvas";
import LoginState, {LoginSubState} from '../LoginState';
import Camera from '../Camera';
import WZNode from '../wz-utils/WZNode';
import FrameAnimation from './FrameAnimation';
import MapleButton from './MapleButton';
import LoginPacket from '../Net/Packets/LoginPacket';
import UILoginNotice, { NoticeType, NoticeMessage } from './UILoginNotice';
import UILoginTOS from './UILoginTOS';
import config from '../Config';
import MyCharacter from '../MyCharacter';
import MapleCharacter from '../MapleCharacter';
import DebugDrag from './DebugDrag';

interface UILoginInterface {
  uiLogin: WZNode;
  frameImg: any;
  inputUsn: MapleInput | null;
  inputPwd: MapleInput | null;
  newCharStats: number[];
  initialize: (canvas: GameCanvas) => Promise<void>;
  doUpdate: (msPerTick: number, camera: any, canvas: GameCanvas) => void;
  doRender: (
    canvas: GameCanvas,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
  removeInputs: () => void;
  drawMask: (canvas: GameCanvas) => void;
  worlds: any[];
  selectedWorldId: number | null;
  worldButtonImages: Map<number, WZNode>;
  worldImages: Map<number, WZNode>;
  selectedWorldImage: WZNode | null;
  channels: any[];
  channelImgs: any[];
  channelSelectAnimation: FrameAnimation | null;
  selectedChannelIndex: number | null;
  scrollOpenAnimation: any;
  channelBackButton: any;
  behindFrameButtons: MapleButton[];
  inFrontOfFrameButtons: MapleButton[];
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
  characters: MapleCharacter[];
  selectedCharIndex: number;
  charSelectNameTag: any;
  charAnimFrame: number;
  charAnimDelay: number;
  charSelected: boolean;
  charSelectEffectFrame: number;
  charSelectEffectDelay: number;
  charSelectScrollFrame: number;
  charSelectScrollDelay: number;
  charSelectScrollState: 'closed' | 'opening' | 'open' | 'closing';
  startButton: MapleStanceButton | null;
  drawCharacterSelect: (canvas: GameCanvas, camera: any, lag: number, msPerTick: number, tdelta: number) => void;
  // Create character
  newChar: MapleCharacter | null;
  newCharOptions: {
    skinColors: number[];
    hairs: number[];
    faces: number[];
    tops: number[];
    bottoms: number[];
    shoes: number[];
    weapons: number[];
    skinIndex: number;
    hairIndex: number;
    faceIndex: number;
    topIndex: number;
    bottomIndex: number;
    shoesIndex: number;
    weaponIndex: number;
  };
  createCharButtons: MapleStanceButton[];
  newCharNameInput: MapleInput | null;
  initCreateCharacter: () => void;
  cleanupCreateCharacter: () => void;
  drawCreateCharacter: (canvas: GameCanvas, camera: any, lag: number, msPerTick: number, tdelta: number) => void;
  updateNewCharAppearance: () => void;
  confirmCreateCharacter: () => void;
  newCharNameConfirmed: boolean;
  newCharStage: number; // 1=name, 2=appearance, 3=stats
  newCharName: string;
  _createCharKeyHandler: ((e: KeyboardEvent) => void) | null;
}

const UILogin = {} as UILoginInterface;

UILogin.initialize = async function (canvas: GameCanvas) {
  await UICommon.initialize();
  this.behindFrameButtons = [];
  this.inFrontOfFrameButtons = [];
  this.channelButtons = [];
  this.channelSelectAnimation = null;
  this.selectedChannelIndex = null;
  this.characters = [MyCharacter];
  this.selectedCharIndex = 0;
  this.charAnimFrame = 0;
  this.charAnimDelay = 0;
  this.charSelected = false;
  this.charSelectEffectFrame = 0;
  this.charSelectEffectDelay = 0;
  this.charSelectScrollFrame = 0;
  this.charSelectScrollDelay = 0;
  this.charSelectScrollState = 'closed';
  this.uiLogin = await WZManager.get('UI.wz/Login.img');

  this.frameImg = this.uiLogin.nGet('Common').nGet('frame').nGetImage();
  this.selectedWorldImage = this.uiLogin.nGet('Common').selectWorld.nGetImage();
  this.worlds = [
    {
      id: 0,
      channelCount: 3,
    },
    {
      id: 16,
      channelCount: 3,
    },
    {
      id: 2,
      channelCount: 3,
    },
  ]; // @todo: from server side

  this.worldButtonImages = new Map<number, WZNode>();
  this.worldImages = new Map<number, WZNode>();
  this.worlds.forEach((world) => {
    const buttonImage = this.uiLogin.nGet('WorldSelect')?.BtWorld.nGet(world.id, null);
    if (buttonImage) {
      this.worldButtonImages.set(world.id, buttonImage);
      const worldButton = new MapleStanceButton(canvas, {
        x: -250 + this.worldButtonImages.size * 27,
        y: -800,
        img: buttonImage.nChildren,
        onClick: () => {
          this.scrollOpenAnimation.reset();
          this.scrollOpenAnimation.active = true;
          this.selectedWorldId = world.id;

          this.scrollContentFadeIn.active = false;
          this.scrollContentFadeIn.alpha = 0;

          this.channelButtons.forEach((button, index) => {
            button.isHidden = false;
          });
        },
      });
      ClickManager.addButton(worldButton);
      this.behindFrameButtons.push(worldButton);
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

  const uiLoginRef = this;
  const startButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1360,
    img: this.uiLogin.nGet('CharSelect').nGet('BtSelect').nChildren,
    stance: 'disabled',
    onClick: async () => {
      if (!uiLoginRef.charSelected) return;
      await LoginState.enterGame();
    },
  });
  ClickManager.addButton(startButton);
  this.behindFrameButtons.push(startButton);
  this.startButton = startButton;

  const createCharacterButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1325,
    img: this.uiLogin.nGet('CharSelect').nGet('BtNew').nChildren,
    onClick: async () => {
      await LoginState.switchToSubState(LoginSubState.CREATE_CHARACTER);
    },
  });
  ClickManager.addButton(createCharacterButton);
  this.behindFrameButtons.push(createCharacterButton);

  const deleteCharacterButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1275,
    img: this.uiLogin.nGet('CharSelect').nGet('BtDelete').nChildren,
    onClick: async () => {
      console.log('Delete character button clicked!');
    },
  });
  ClickManager.addButton(deleteCharacterButton);
  this.behindFrameButtons.push(deleteCharacterButton);

  for (let i = 0; i < 20; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const channelButton = new MapleStanceButton(canvas, {
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
      isHidden: true
    });
    ClickManager.addButton(channelButton);
    this.channelButtons.push(channelButton);
  }

  const enterChannelButton = new MapleStanceButton(canvas, {
    x: 135,
    y: -470,
    img: this.uiLogin.nGet('WorldSelect')?.BtGoworld.nChildren,
    onClick: async () => {
      await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
    },
    isHidden: true
  });
  ClickManager.addButton(enterChannelButton);
  this.channelButtons.push(enterChannelButton);

  const viewAllCharacterButton = new MapleStanceButton(canvas, {
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
  ClickManager.addButton(viewAllCharacterButton);
  this.inFrontOfFrameButtons.push(viewAllCharacterButton);

  const channelBackButton = new MapleStanceButton(canvas, {
    x: 0,
    y: 420,
    img: this.uiLogin.nGet('Common').nGet('BtStart').nChildren,
    isPartOfUI: true,
    isRelativeToCamera: true,
    isHidden: true,
    onClick: async () => {
      if (LoginState.currentSubState === LoginSubState.CREATE_CHARACTER) {
        if (uiLoginRef.newCharStage > 1) {
          uiLoginRef.newCharStage--;
          DebugDrag.clear();
        } else {
          await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
        }
      } else if (LoginState.currentSubState === LoginSubState.CHARACTER_SELECT) {
        await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
      } else {
        viewAllCharacterButton.isHidden = true;
        channelBackButton.isHidden = true;
        await LoginState.switchToSubState(LoginSubState.LOGIN_SCREEN);
      }
    },
  });
  ClickManager.addButton(channelBackButton);
  this.inFrontOfFrameButtons.push(channelBackButton);
  this.channelBackButton = channelBackButton;

  const loginButton = new MapleStanceButton(canvas, {
    x: 223,
    y: -85,
    img: this.uiLogin.nGet('Title').nGet('BtLogin').nChildren,
    onClick: async () => {
      await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
      viewAllCharacterButton.isHidden = false;
      channelBackButton.isHidden = false;
    },
  });
  ClickManager.addButton(loginButton);
  this.behindFrameButtons.push(loginButton);

  this.uiLoginNotice = await UILoginNotice.fromOpts({
    x: 220,
    y: 160,
  });
  this.uiLoginTOS = await UILoginTOS.fromOpts({
    x: 195,
    y: 90,
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

UILogin.doUpdate = function (msPerTick, camera, canvas) {
  UICommon.doUpdate(msPerTick);

  const wasScrollActive = this.scrollOpenAnimation.active;
  this.scrollOpenAnimation.update(msPerTick);
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

  // Draw character on the select screen
  if (LoginState.currentSubState === LoginSubState.CHARACTER_SELECT) {
    this.drawCharacterSelect(canvas, camera, lag, msPerTick, tdelta);
  }

  // Draw create character screen
  if (LoginState.currentSubState === LoginSubState.CREATE_CHARACTER) {
    this.drawCreateCharacter(canvas, camera, lag, msPerTick, tdelta);
  }

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

  canvas.drawText({
    text: "Ver. 0.83",
    fontWeight: "bold",
    x: 595,
    y: 13,
  });

  this.drawMask(canvas);

  this.uiLoginNotice.draw(canvas, camera, lag, msPerTick, tdelta);
  this.uiLoginTOS.draw(canvas, camera, lag, msPerTick, tdelta);

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

UILogin.removeInputs = function () {
  if (this.inputUsn) this.inputUsn.remove();
  if (this.inputPwd) this.inputPwd.remove();
  this.inputUsn = null;
  this.inputPwd = null;
};

UILogin.drawCharacterSelect = function (canvas, camera, lag, msPerTick, tdelta) {
  if (this.characters.length === 0) return;

  // Keep start button disabled until character is selected
  if (this.startButton && !this.charSelected) {
    this.startButton.stance = 'disabled';
  }

  // Update debug drag system
  DebugDrag.update(canvas.mouseX, canvas.mouseY, canvas.clicked);

  // Advance the character idle animation
  this.charAnimDelay += msPerTick;
  if (this.charAnimDelay >= 200) {
    this.charAnimDelay = 0;
    this.charAnimFrame++;
  }

  const char = this.characters[this.selectedCharIndex];
  if (!char || !char.baseBody) return;

  // Character base screen position (player offset: -133, -9)
  const baseCharScreenX = 10 - 133 - camera.x;
  const baseCharScreenY = -1130 - 9 - camera.y;
  DebugDrag.register('character', baseCharScreenX, baseCharScreenY, 60, 80);
  const charPos = DebugDrag.get('character');
  const charScreenX = charPos.x;
  const charScreenY = charPos.y;

  const stance = 'stand1';
  const maxFrames = char.baseBody[stance]?.nChildren?.length || 3;
  const frame = this.charAnimFrame % maxFrames;

  const charSelectNode = this.uiLogin.nGet('CharSelect');
  const CHAR_SLOT_SPACING = 80;
  const TOTAL_SLOTS = 3;

  try {
    // Draw all 3 character slots
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const slotX = charScreenX + i * CHAR_SLOT_SPACING;
      const slotY = charScreenY;

      if (i < this.characters.length) {
        // Slot has a character
        const slotChar = this.characters[i];
        const isSelected = this.charSelected && this.selectedCharIndex === i;

        // Draw selection light effect behind the selected character
        if (isSelected) {
          const effectNode = charSelectNode.nGet('effect').nGet('1');
          const effectFrames = effectNode.nChildren;

          this.charSelectEffectDelay += msPerTick;
          if (this.charSelectEffectDelay >= 120) {
            this.charSelectEffectDelay = 0;
            if (this.charSelectEffectFrame < effectFrames.length - 1) {
              this.charSelectEffectFrame++;
            }
          }

          const ef = effectFrames[this.charSelectEffectFrame];
          if (ef) {
            const efImg = ef.nGetImage();
            const ox = ef.origin ? ef.origin.nGet('nX', 0) : 0;
            const oy = ef.origin ? ef.origin.nGet('nY', 0) : 0;
            const baseEffX = slotX - ox + 5;
            const baseEffY = slotY - oy - 370;
            DebugDrag.register('effect', baseEffX, baseEffY, efImg.width || 70, efImg.height || 300);
            const effPos = DebugDrag.get('effect');
            canvas.drawImage({
              img: efImg,
              dx: effPos.x,
              dy: effPos.y,
            });
          }
        }

        // Draw the character sprite
        if (slotChar && slotChar.baseBody) {
          const drawableFrames = slotChar.getDrawableFrames(stance, frame, true);
          drawableFrames.forEach((f: any) => {
            canvas.drawImage({
              img: f.img,
              dx: Math.floor(slotX + f.x),
              dy: Math.floor(slotY + f.y),
              flipped: true,
            });
          });
        }

        // Draw name tag
        const name = slotChar?.name || 'Player';
        const nameTagNode = charSelectNode.nGet('nameTag');
        const tagNode = isSelected ? nameTagNode.nGet('1') : nameTagNode.nGet('0');
        const tagLeft = tagNode.nGet('0').nGetImage();
        const tagCenter = tagNode.nGet('1').nGetImage();
        const tagRight = tagNode.nGet('2').nGetImage();

        if (tagLeft && tagCenter && tagRight) {
          const nameTagY = slotY + 5;
          canvas.context.save();
          canvas.context.font = '12px Arial';
          const textW = canvas.context.measureText(name).width;
          canvas.context.restore();

          const totalW = tagLeft.width + textW + 4 + tagRight.width;
          const tagStartX = slotX - totalW / 2;

          canvas.drawImage({ img: tagLeft, dx: tagStartX, dy: nameTagY });
          canvas.drawImage({
            img: tagCenter,
            dx: tagStartX + tagLeft.width,
            dy: nameTagY,
            dw: textW + 4,
            dh: tagCenter.height,
          });
          canvas.drawImage({
            img: tagRight,
            dx: tagStartX + tagLeft.width + textW + 4,
            dy: nameTagY,
          });

          canvas.drawText({
            text: name,
            x: slotX,
            y: nameTagY + 4,
            color: '#ffffff',
            fontSize: 12,
            fontFamily: 'Arial',
            align: 'center',
          });
        }
      } else {
        // Empty slot — draw character/0 animated glow under placeholder
        const charGlowNode = charSelectNode.nGet('character').nGet('0');
        const glowFrames = charGlowNode.nChildren;
        const glowFrame = this.charAnimFrame % glowFrames.length;
        const gf = glowFrames[glowFrame];
        if (gf) {
          const gfImg = gf.nGetImage();
          const gox = gf.origin ? gf.origin.nGet('nX', 0) : 0;
          const goy = gf.origin ? gf.origin.nGet('nY', 0) : 0;
          const emptyOffsets = [0, 53, 105];
          canvas.drawImage({
            img: gfImg,
            dx: slotX - gox + (emptyOffsets[i] || 0),
            dy: slotY - goy + 2,
          });
        }

        // Draw character/1/0 placeholder on top of glow
        const emptySlotNode = charSelectNode.nGet('character').nGet('1').nGet('0');
        if (emptySlotNode) {
          const emptyImg = emptySlotNode.nGetImage();
          const eox = emptySlotNode.origin ? emptySlotNode.origin.nGet('nX', 0) : 0;
          const eoy = emptySlotNode.origin ? emptySlotNode.origin.nGet('nY', 0) : 0;
          const baseEmptyX = slotX - eox;
          const baseEmptyY = slotY - eoy;
          const emptyOffsets = [0, 53, 105];
          DebugDrag.register(`emptySlot${i}`, baseEmptyX + (emptyOffsets[i] || 0), baseEmptyY, emptyImg.width || 51, emptyImg.height || 71);
          const emptyPos = DebugDrag.get(`emptySlot${i}`);
          canvas.drawImage({
            img: emptyImg,
            dx: emptyPos.x,
            dy: emptyPos.y,
          });
        }
      }
    }

    // Draw pageR (right arrow)
    try {
      const pageRNode = charSelectNode.nGet('pageR').nGet('0').nGet('0');
      const pageRImg = pageRNode.nGetImage();
      if (pageRImg) {
        DebugDrag.register('pageR', charScreenX + 315, charScreenY - 95 + 20, pageRImg.width || 44, pageRImg.height || 36);
        const pageRPos = DebugDrag.get('pageR');
        canvas.drawImage({ img: pageRImg, dx: pageRPos.x, dy: pageRPos.y });
      }
    } catch (e) {}

    // Draw pageL (left arrow)
    try {
      const pageLNode = charSelectNode.nGet('pageL').nGet('0').nGet('0');
      const pageLImg = pageLNode.nGetImage();
      if (pageLImg) {
        DebugDrag.register('pageL', charScreenX - 75 - 46, charScreenY - 95 + 21, pageLImg.width || 43, pageLImg.height || 37);
        const pageLPos = DebugDrag.get('pageL');
        canvas.drawImage({ img: pageLImg, dx: pageLPos.x, dy: pageLPos.y });
      }
    } catch (e) {}

    // Click detection — check if mouse clicked on any slot
    if (canvas.clicked) {
      const mx = canvas.mouseX;
      const my = canvas.mouseY;
      for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slotX = charScreenX + i * CHAR_SLOT_SPACING;
        if (mx >= slotX - 30 && mx <= slotX + 30 &&
            my >= charScreenY - 60 && my <= charScreenY + 10) {
          if (i < this.characters.length) {
            this.selectedCharIndex = i;
            this.charSelected = true;
            this.charSelectEffectFrame = 0;
            this.charSelectEffectDelay = 0;
            this.charSelectScrollState = 'opening';
            this.charSelectScrollFrame = 0;
            this.charSelectScrollDelay = 0;
            // Enable the start button
            if (this.startButton) {
              this.startButton.stance = 'normal';
            }
          }
          break;
        }
      }
    }

    // Draw the info scroll panel when character is selected
    if (this.charSelected) {
      const scrollNode = charSelectNode.nGet('scroll');

      this.charSelectScrollDelay += msPerTick;

      if (this.charSelectScrollState === 'opening') {
        const openFrames = scrollNode.nGet('0').nChildren;
        const delay = openFrames[this.charSelectScrollFrame]?.delay?.nValue || 50;
        if (this.charSelectScrollDelay >= delay) {
          this.charSelectScrollDelay = 0;
          this.charSelectScrollFrame++;
          if (this.charSelectScrollFrame >= openFrames.length) {
            this.charSelectScrollState = 'open';
            this.charSelectScrollFrame = 0;
          }
        }
      }

      let scrollImg: any = null;

      if (this.charSelectScrollState === 'opening') {
        const f = scrollNode.nGet('0').nGet(this.charSelectScrollFrame.toString());
        if (f) scrollImg = f.nGetImage();
      } else if (this.charSelectScrollState === 'open') {
        const openFrames = scrollNode.nGet('0').nChildren;
        const f = scrollNode.nGet('0').nGet((openFrames.length - 1).toString());
        if (f) scrollImg = f.nGetImage();
      }

      if (scrollImg) {
        const selSlotX = charScreenX + this.selectedCharIndex * CHAR_SLOT_SPACING;
        const baseScrollX = selSlotX - scrollImg.width / 2 + 8;
        const baseScrollY = charScreenY - scrollImg.height - 20 - 60;
        DebugDrag.register('scroll', baseScrollX, baseScrollY, scrollImg.width, scrollImg.height);
        const scrollPos = DebugDrag.get('scroll');
        const scrollX = scrollPos.x;
        const scrollY = scrollPos.y;

        canvas.drawImage({
          img: scrollImg,
          dx: scrollX,
          dy: scrollY,
        });

        // Draw charInfo2 background on open scroll
        if (this.charSelectScrollState === 'open') {
          const charInfoImg = charSelectNode.nGet('charInfo2').nGetImage();
          if (charInfoImg) {
            canvas.drawImage({
              img: charInfoImg,
              dx: scrollX + (scrollImg.width - charInfoImg.width) / 2,
              dy: scrollY + 30,
            });
          }

          // Draw stat values only (labels are baked into charInfo2 image)
          const stats = char.stats;
          const infoX = scrollX + 50;
          const infoY = scrollY + 38;
          const lineH = 17;
          const col2X = scrollX + scrollImg.width / 2 + 43;

          // Left column values: Job, Level, STR, DEX
          const leftValues = [
            `${stats?.job || 'Beginner'}`,
            `${stats?.level || 1}`,
            `${stats?.str || 4}`,
            `${stats?.dex || 4}`,
          ];
          // Right column values: Fame, (empty), INT, LUK
          const rightValues = [
            `${char.fame || 0}`,
            '',
            `${stats?.int || 4}`,
            `${stats?.luk || 4}`,
          ];

          leftValues.forEach((val, i) => {
            canvas.drawText({ text: val, x: infoX, y: infoY + i * lineH, color: '#000000', fontSize: 11, fontFamily: 'Arial' });
          });
          rightValues.forEach((val, i) => {
            if (!val) return;
            canvas.drawText({ text: val, x: col2X, y: infoY + i * lineH, color: '#000000', fontSize: 11, fontFamily: 'Arial' });
          });
        }
      }
    }
  } catch (e) {
    // Character data may not be fully loaded yet
  }

  // Draw debug overlays last
  DebugDrag.drawAll(canvas);
};

UILogin.initCreateCharacter = function () {
  this.createCharButtons = [];
  this.charAnimFrame = 0;
  this.charAnimDelay = 0;
  this.newCharNameConfirmed = false;
  this.newCharStage = 1;
  this.newCharName = '';
  this.newChar = null;
  DebugDrag.clear();

  // Hide all login UI buttons so they don't interfere with create char UI
  this.inFrontOfFrameButtons.forEach((btn: any) => { btn.isHidden = true; });
  this.behindFrameButtons.forEach((btn: any) => { btn.isHidden = true; });

  // Keyboard handler for name input
  this._createCharKeyHandler = (e: KeyboardEvent) => {
    if (this.newCharStage === 1) {
      // Name entry stage
      if (e.key === 'Backspace') {
        this.newCharName = this.newCharName.slice(0, -1);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Enter') {
        if (this.newCharName.trim().length > 0) {
          this.newCharStage = 2;
          DebugDrag.clear();
        }
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Escape') {
        LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key.length === 1 && this.newCharName.length < 12) {
        this.newCharName += e.key;
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (this.newCharStage === 2) {
      if (e.key === 'Enter') {
        this.newCharStage = 3;
        DebugDrag.clear();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Escape') {
        this.newCharStage = 1;
        DebugDrag.clear();
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (this.newCharStage === 3) {
      if (e.key === 'Enter') {
        this.confirmCreateCharacter();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Escape') {
        this.newCharStage = 2;
        DebugDrag.clear();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };
  window.addEventListener('keydown', this._createCharKeyHandler, true);

  // Create preview character async with proper stats
  (async () => {
    const Stats = (await import('../Stats/Stats')).default;
    const Inventory = (await import('../Inventory/Inventory')).default;
    this.newChar = new MapleCharacter({
      name: 'New Character',
      skinColor: 0,
      hair: 30030,
      face: 20000,
      stats: new Stats({
        str: 4, dex: 4, int: 4, luk: 4,
        abilityPoints: 0, maxHp: 50, maxMp: 5,
        jobType: 0, job: 'Beginner', level: 1,
      }),
      inventory: new Inventory({ mesos: 0 }),
    });
    await this.newChar.load();
  })();
};

UILogin.cleanupCreateCharacter = function () {
  if (this._createCharKeyHandler) {
    window.removeEventListener('keydown', this._createCharKeyHandler, true);
    this._createCharKeyHandler = null;
  }
  if (this.createCharButtons) {
    this.createCharButtons.forEach((btn: MapleButton) => ClickManager.removeButton(btn));
    this.createCharButtons = [];
  }
  this.newChar = null;

  // Restore all login UI buttons
  this.inFrontOfFrameButtons.forEach((btn: any) => { btn.isHidden = false; });
  this.behindFrameButtons.forEach((btn: any) => { btn.isHidden = false; });
};

UILogin.confirmCreateCharacter = function () {
  LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
};

UILogin.updateNewCharAppearance = async function () {
};

UILogin.drawCreateCharacter = function (canvas: any, camera: any, lag: number, msPerTick: number, tdelta: number) {
  DebugDrag.update(canvas.mouseX, canvas.mouseY, canvas.clicked);

  // Wait for camera to finish scrolling before rendering elements
  const targetY = -2723;
  if (Math.abs(camera.y - targetY) > 5) return;

  const newCharNode = this.uiLogin.nGet('NewChar');

  // --- Character preview (always shown) ---
  if (this.newChar && this.newChar.baseBody) {
    this.charAnimDelay += msPerTick;
    if (this.charAnimDelay >= 200) {
      this.charAnimDelay = 0;
      this.charAnimFrame++;
    }
    const stance = 'stand1';
    const maxFrames = this.newChar.baseBody[stance]?.nChildren?.length || 3;
    const frame = this.charAnimFrame % maxFrames;

    try {
      const drawableFrames = this.newChar.getDrawableFrames(stance, frame, true);
      DebugDrag.register('newCharPreview', 395, 356, 60, 80);
      const p = DebugDrag.get('newCharPreview');

      drawableFrames.forEach((f: any) => {
        canvas.drawImage({
          img: f.img,
          dx: Math.floor(p.x + f.x),
          dy: Math.floor(p.y + f.y),
          flipped: true,
        });
      });
    } catch (e) {}
  }

  // ========== STAGE 1: Name entry ==========
  if (this.newCharStage === 1) {
    // --- charName panel ---
    try {
      const charNameImg = newCharNode.nGet('charName').nGetImage();
      if (charNameImg) {
        DebugDrag.register('charName', 484, 103, charNameImg.width, charNameImg.height);
        const p = DebugDrag.get('charName');
        canvas.drawImage({ img: charNameImg, dx: p.x, dy: p.y });
      }
    } catch (e) {}

    // --- Name text input ---
    const nameDisplay = (this.newCharName || '') + '_';
    DebugDrag.register('nameText', 518, 210, 120, 16);
    const ntPos = DebugDrag.get('nameText');
    canvas.drawText({
      text: nameDisplay,
      x: ntPos.x,
      y: ntPos.y,
      color: '#000000',
      fontSize: 12,
      fontFamily: 'Arial',
      align: 'left',
    });

    // --- BtYes (OK) button ---
    try {
      const img = newCharNode.nGet('BtYes').nGet('normal').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('btYes', 512, 282, img.width, img.height);
        const p = DebugDrag.get('btYes');
        canvas.drawImage({ img, dx: p.x, dy: p.y });

        if (canvas.clicked && !DebugDrag.enabled) {
          const mx = canvas.mouseX;
          const my = canvas.mouseY;
          if (mx >= p.x && mx <= p.x + img.width &&
              my >= p.y && my <= p.y + img.height) {
            if (this.newCharName.trim().length > 0) {
              this.newCharStage = 2;
              DebugDrag.clear();
            }
          }
        }
      }
    } catch (e) {}

    // --- BtNo (Cancel) button ---
    try {
      const img = newCharNode.nGet('BtNo').nGet('normal').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('btNo', 590, 280, img.width, img.height);
        const p = DebugDrag.get('btNo');
        canvas.drawImage({ img, dx: p.x, dy: p.y });

        if (canvas.clicked && !DebugDrag.enabled) {
          const mx = canvas.mouseX;
          const my = canvas.mouseY;
          if (mx >= p.x && mx <= p.x + img.width &&
              my >= p.y && my <= p.y + img.height) {
            LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
          }
        }
      }
    } catch (e) {}
  }

  // ========== STAGE 2: Appearance customization ==========
  if (this.newCharStage === 2) {
    // --- charSet panel (main settings background) ---
    try {
      const charSetImg = newCharNode.nGet('charSet').nGetImage();
      if (charSetImg) {
        DebugDrag.register('charSet', 475, 102, charSetImg.width, charSetImg.height);
        const p = DebugDrag.get('charSet');
        canvas.drawImage({ img: charSetImg, dx: p.x, dy: p.y });
      }
    } catch (e) {}

    // --- avatarSel rows (0-8) ---
    for (let i = 0; i < 9; i++) {
      try {
        const selImg = newCharNode.nGet('avatarSel').nGet(i.toString()).nGet('normal').nGetImage();
        if (selImg) {
          DebugDrag.register(`avatarSel${i}`, 370, 80 + i * 20, selImg.width, selImg.height);
          const p = DebugDrag.get(`avatarSel${i}`);
          canvas.drawImage({ img: selImg, dx: p.x, dy: p.y });
        }
      } catch (e) {}
    }

    // --- BtLeft / BtRight arrows for each selector row ---
    for (let i = 0; i < 9; i++) {
      try {
        const leftImg = newCharNode.nGet('BtLeft').nGet('normal').nGet('0').nGetImage();
        if (leftImg) {
          DebugDrag.register(`btLeft${i}`, 355, 82 + i * 20, leftImg.width, leftImg.height);
          const p = DebugDrag.get(`btLeft${i}`);
          canvas.drawImage({ img: leftImg, dx: p.x, dy: p.y });
        }
      } catch (e) {}
      try {
        const rightImg = newCharNode.nGet('BtRight').nGet('normal').nGet('0').nGetImage();
        if (rightImg) {
          DebugDrag.register(`btRight${i}`, 575, 82 + i * 20, rightImg.width, rightImg.height);
          const p = DebugDrag.get(`btRight${i}`);
          canvas.drawImage({ img: rightImg, dx: p.x, dy: p.y });
        }
      } catch (e) {}
    }

    // --- BtYes (OK) for stage 2 ---
    try {
      const img = newCharNode.nGet('BtYes').nGet('normal').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('btYes2', 501, 434, img.width, img.height);
        const p = DebugDrag.get('btYes2');
        canvas.drawImage({ img, dx: p.x, dy: p.y });

        if (canvas.clicked && !DebugDrag.enabled) {
          const mx = canvas.mouseX;
          const my = canvas.mouseY;
          if (mx >= p.x && mx <= p.x + img.width &&
              my >= p.y && my <= p.y + img.height) {
            // Advance to stats stage
            this.newCharStage = 3;
            DebugDrag.clear();
          }
        }
      }
    } catch (e) {}

    // --- BtNo (Cancel) for stage 2 ---
    try {
      const img = newCharNode.nGet('BtNo').nGet('normal').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('btNo2', 587, 433, img.width, img.height);
        const p = DebugDrag.get('btNo2');
        canvas.drawImage({ img, dx: p.x, dy: p.y });

        if (canvas.clicked && !DebugDrag.enabled) {
          const mx = canvas.mouseX;
          const my = canvas.mouseY;
          if (mx >= p.x && mx <= p.x + img.width &&
              my >= p.y && my <= p.y + img.height) {
            // Go back to name entry
            this.newCharStage = 1;
            DebugDrag.clear();
          }
        }
      }
    } catch (e) {}
  }

  // ========== STAGE 3: Stats ==========
  if (this.newCharStage === 3) {
    // --- statTb (stat table background) ---
    try {
      const img = newCharNode.nGet('statTb').nGetImage();
      if (img) {
        DebugDrag.register('statTb', 500, 150, img.width, img.height);
        const p = DebugDrag.get('statTb');
        canvas.drawImage({ img, dx: p.x, dy: p.y });
      }
    } catch (e) {}

    // --- dice ---
    try {
      const img = newCharNode.nGet('dice').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('dice', 550, 250, img.width, img.height);
        const p = DebugDrag.get('dice');
        canvas.drawImage({ img, dx: p.x, dy: p.y });
      }
    } catch (e) {}

    // --- BtYes (OK) for stage 3 — confirm creation ---
    try {
      const img = newCharNode.nGet('BtYes').nGet('normal').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('btYes3', 501, 434, img.width, img.height);
        const p = DebugDrag.get('btYes3');
        canvas.drawImage({ img, dx: p.x, dy: p.y });

        if (canvas.clicked && !DebugDrag.enabled) {
          const mx = canvas.mouseX;
          const my = canvas.mouseY;
          if (mx >= p.x && mx <= p.x + img.width &&
              my >= p.y && my <= p.y + img.height) {
            this.confirmCreateCharacter();
          }
        }
      }
    } catch (e) {}

    // --- BtNo (Cancel) for stage 3 — back to appearance ---
    try {
      const img = newCharNode.nGet('BtNo').nGet('normal').nGet('0').nGetImage();
      if (img) {
        DebugDrag.register('btNo3', 587, 433, img.width, img.height);
        const p = DebugDrag.get('btNo3');
        canvas.drawImage({ img, dx: p.x, dy: p.y });

        if (canvas.clicked && !DebugDrag.enabled) {
          const mx = canvas.mouseX;
          const my = canvas.mouseY;
          if (mx >= p.x && mx <= p.x + img.width &&
              my >= p.y && my <= p.y + img.height) {
            this.newCharStage = 2;
            DebugDrag.clear();
          }
        }
      }
    } catch (e) {}
  }

  DebugDrag.drawAll(canvas);
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
