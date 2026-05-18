import NXManager from "../wz-utils/NXManager";
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
import SelectCharPacket from '../Net/Packets/SelectCharPacket';
import UIRaceSelect from './UIRaceSelect';
import UIExplorerCreation from './UIExplorerCreation';
import { SelectCharPicPacket, RegisterPicPacket } from '../Net/Packets/PicPackets';
import { DeleteCharPacket } from '../Net/Packets/DeleteCharPacket';
import { drawPreview, clearCache } from './CharSelectPreview';
import { initUIPic, showPic, drawUIPic } from './UIPic';
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
  requirePic: number;
  characterSlotButtons: MapleButton[];
  createCharacterSlotButtons: () => void;
  clearCharacterSlotButtons: () => void;
  saveIdEnabled: boolean;
  currentCharPage: number;
  _chatsel: any;
}

const UILogin = {} as UILoginInterface;

UILogin.initialize = async function (canvas: GameCanvas) {
  this.gameCanvas = canvas;
  (this as any)._lastOverlayState = 'none';
  await UICommon.initialize();
  this.behindFrameButtons = new Set<MapleButton>();
  this.inFrontOfFrameButtons = [];
  this.worldButtons = [];
  this.channelButtons = [];
  this.channelSelectAnimation = null;
  this.selectedChannelIndex = null;
  this.uiLogin = await NXManager.get('UI.wz/Login.img');

  this.frameImg = this.uiLogin.nGet('Common')?.nGet('frame')?.nGetImage();
  this._chatsel  = this.uiLogin.nGet('Chatsel') ?? this.uiLogin.nGet('chatsel');
  this.selectedWorldImage = this.uiLogin.nGet('Common')?.selectWorld?.nGetImage();
  this.worlds = [];
  this.characters = [];
  this.characterSlotButtons = [];
  this.selectedCharacterId = null;
  this.requirePic = 0;
  this.currentCharPage = 0;
  this.saveIdEnabled = !!localStorage.getItem('maple_saved_id');

  initUIPic(canvas);   // load SoftKey WZ assets async (fire-and-forget)

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
    img: this.uiLogin.nGet('CharSelect')?.nGet('BtSelect')?.nChildren ?? [],
    onClick: async () => {
      if (!config.websocketUrl) {
        await LoginState.enterGame();
        return;
      }
      if (this.selectedCharacterId === null) return;
      const charId = this.selectedCharacterId;
      const pic = this.requirePic ?? 0;

      if (pic === 0) {
        new SelectCharPacket(charId).dispatch();
      } else if (pic === 1) {
        showPic(canvas, 'enter', (entered) => {
          new SelectCharPicPacket(entered, charId).dispatch();
        });
      } else {
        showPic(canvas, 'register', (newPic) => {
          new RegisterPicPacket(charId, newPic).dispatch();
        });
      }
    },
  });
  ClickManager.addButton(startButton);
  this.behindFrameButtons.add(startButton);
  const createCharacterButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1325,
    img: this.uiLogin.nGet('CharSelect')?.nGet('BtNew')?.nChildren ?? [],
    onClick: async () => {
      UIRaceSelect.show(canvas);
    },
  });
  ClickManager.addButton(createCharacterButton);
  this.behindFrameButtons.add(createCharacterButton);
  const deleteCharacterButton = new MapleStanceButton(canvas, {
    x: 205,
    y: -1275,
    img: this.uiLogin.nGet('CharSelect')?.nGet('BtDelete')?.nChildren ?? [],
    onClick: async () => {
      if (this.selectedCharacterId === null) return;
      const birthday = prompt('Enter birthday (YYYYMMDD) to confirm deletion:');
      if (!birthday) return;
      if (config.websocketUrl) {
        new DeleteCharPacket(this.selectedCharacterId, birthday).dispatch();
      } else {
        this.characters = this.characters.filter((c) => c.stat.characterId !== this.selectedCharacterId);
        this.selectedCharacterId = this.characters[0]?.stat.characterId ?? null;
        this.createCharacterSlotButtons();
      }
    },
  });
  ClickManager.addButton(deleteCharacterButton);
  this.behindFrameButtons.add(deleteCharacterButton);

  // Page left (BtPageL) — world x=(CHAR_SLOT_X_START - 50), y around char slots
  const pageLeftNode = this.uiLogin.nGet('CharSelect')?.nGet('pageL');
  if (pageLeftNode) {
    const pageLeftBtn = new MapleStanceButton(canvas, {
      x: -260,
      y: -1215,
      img: pageLeftNode.nChildren,
      onClick: () => {
        if (this.currentCharPage > 0) {
          this.currentCharPage--;
          this.clearCharacterSlotButtons();
          this.createCharacterSlotButtons();
        }
      },
    });
    ClickManager.addButton(pageLeftBtn);
    this.behindFrameButtons.add(pageLeftBtn);
  }

  const pageRightNode = this.uiLogin.nGet('CharSelect')?.nGet('pageR');
  if (pageRightNode) {
    const pageRightBtn = new MapleStanceButton(canvas, {
      x: 185,
      y: -1215,
      img: pageRightNode.nChildren,
      onClick: () => {
        const maxPage = Math.max(0, Math.ceil(this.characters.length / CHAR_SLOTS) - 1);
        if (this.currentCharPage < maxPage) {
          this.currentCharPage++;
          this.clearCharacterSlotButtons();
          this.createCharacterSlotButtons();
        }
      },
    });
    ClickManager.addButton(pageRightBtn);
    this.behindFrameButtons.add(pageRightBtn);
  }

  this.viewAllCharacterButton = new MapleStanceButton(canvas, {
    x: 0,
    y: 370,
    img: this.uiLogin.nGet('ViewAllChar')?.nGet('BtVAC')?.nChildren ?? [],
    isPartOfUI: true,
    isRelativeToCamera: true,
    isHidden: true,
    onClick: async () => {
      // View All Characters — request char list for all worlds at once (VAC)
      // For now: prompt for world ID and request char list
      const worldId = this.selectedWorldId ?? 0;
      if (config.websocketUrl && worldId !== null) {
        this.showLoading();
        new CharacterListRequestPacket(worldId, this.selectedChannelIndex ?? 0 + 1).dispatch();
      }
    },
  });
  ClickManager.addButton(this.viewAllCharacterButton);
  this.inFrontOfFrameButtons.push(this.viewAllCharacterButton);

  this.channelBackButton = new MapleStanceButton(canvas, {
    x: 0,
    y: 420,
    img: this.uiLogin.nGet('Common')?.nGet('BtStart')?.nChildren ?? [],
    isPartOfUI: true,
    isRelativeToCamera: true,
    isHidden: true,
    onClick: async () => {
      const creationStates = [
        LoginSubState.RACE_SELECT, LoginSubState.CHARACTER_CREATION,
        LoginSubState.CYGNUS_CREATION, LoginSubState.ARAN_CREATION,
      ];
      if (LoginState.currentSubState === LoginSubState.CHARACTER_SELECT) {
        await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
      } else if (creationStates.includes(LoginState.currentSubState)) {
        await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
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
    img: this.uiLogin.nGet('Title')?.nGet('BtLogin')?.nChildren ?? [],
    onClick: async () => {
      if (!config.websocketUrl) { // @todo: remove this check when the login screen is fully implemented
        this.worlds.push(new World(0, 'Test', 1, 'Message', [
          new Channel(1, 'Test', 1, false)
        ]));
        await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
        return;
      }
      if (this.saveIdEnabled && this.inputUsn?.input.value) {
        localStorage.setItem('maple_saved_id', this.inputUsn.input.value);
      }
      this.showLoading();
      new LoginPacket(this.inputUsn?.input.value, this.inputPwd?.input.value).dispatch();
    },
  });
  ClickManager.addButton(loginButton);
  this.behindFrameButtons.add(loginButton);

  // Save ID (BtLoginIDSave)
  const saveIdButton = new MapleStanceButton(canvas, {
    x: 55,
    y: 12,
    img: this.uiLogin.nGet('Title')?.nGet('BtLoginIDSave')?.nChildren ?? [],
    onClick: () => {
      this.saveIdEnabled = !this.saveIdEnabled;
      if (this.saveIdEnabled) {
        localStorage.setItem('maple_saved_id', this.inputUsn?.input.value ?? '');
      } else {
        localStorage.removeItem('maple_saved_id');
        localStorage.removeItem('maple_saved_pw');
      }
    },
  });
  ClickManager.addButton(saveIdButton);
  this.behindFrameButtons.add(saveIdButton);

  // Forgot ID (BtLoginIDLost)
  const forgotIdButton = new MapleStanceButton(canvas, {
    x: 156,
    y: 12,
    img: this.uiLogin.nGet('Title')?.nGet('BtLoginIDLost')?.nChildren ?? [],
    onClick: () => {
      this.showNotice(NoticeType.NORMAL, null);
    },
  });
  ClickManager.addButton(forgotIdButton);
  this.behindFrameButtons.add(forgotIdButton);

  // Forgot Password (BtPasswdLost)
  const forgotPwButton = new MapleStanceButton(canvas, {
    x: 251,
    y: 12,
    img: this.uiLogin.nGet('Title')?.nGet('BtPasswdLost')?.nChildren ?? [],
    onClick: () => {
      this.showNotice(NoticeType.NORMAL, null);
    },
  });
  ClickManager.addButton(forgotPwButton);
  this.behindFrameButtons.add(forgotPwButton);

  // Register (BtNew 92x38)
  const newAccountButton = new MapleStanceButton(canvas, {
    x: 74,
    y: 62,
    img: this.uiLogin.nGet('Title')?.nGet('BtNew')?.nChildren ?? [],
    onClick: () => {
      this.showNotice(NoticeType.NORMAL, null);
    },
  });
  ClickManager.addButton(newAccountButton);
  this.behindFrameButtons.add(newAccountButton);

  // Quit (BtQuit 84x38)
  const quitButton = new MapleStanceButton(canvas, {
    x: 229,
    y: 24,
    img: this.uiLogin.nGet('Title')?.nGet('BtQuit')?.nChildren ?? [],
    onClick: () => {
      window.close();
    },
  });
  ClickManager.addButton(quitButton);
  this.behindFrameButtons.add(quitButton);

  // Auto-fill saved ID
  const savedId = localStorage.getItem('maple_saved_id');
  if (savedId && this.inputUsn) {
    this.inputUsn.input.value = savedId;
  }

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
    img: uiLogin.NewChar?.dice?.nChildren ?? [],
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
  this.scrollOpenAnimation = new FrameAnimation(this.uiLogin.nGet('WorldSelect')?.nGet('scroll')?.nGet(0), dx, dy);
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

function getRaceKey(job: number): string {
  if (job >= 2000 && job < 3000) return 'aran';
  if (job >= 1000 && job < 2000) return 'knight';
  return 'adventure';
}

const CHAR_SLOTS = 3;
const CHAR_SLOT_X_START = -177; // world x of slot 0 — centered between pageL(-260) and pageR(185)
const CHAR_SLOT_X_STEP = 140;   // world px between slots
const CHAR_SLOT_Y = -1160;      // world y of click area

UILogin.clearCharacterSlotButtons = function () {
  this.characterSlotButtons.forEach((btn) => ClickManager.removeButton(btn));
  this.characterSlotButtons = [];
};

UILogin.createCharacterSlotButtons = function () {
  this.clearCharacterSlotButtons();

  // Default selection = first character
  if (this.characters.length > 0 && this.selectedCharacterId === null) {
    this.selectedCharacterId = this.characters[0].stat.characterId;
  }

  const pageStart = (this.currentCharPage ?? 0) * CHAR_SLOTS;
  this.characters.slice(pageStart, pageStart + CHAR_SLOTS).forEach((char, i) => {
    const wx = CHAR_SLOT_X_START + i * CHAR_SLOT_X_STEP;
    const btn = new MapleStanceButton(this.gameCanvas, {
      x: wx,
      y: CHAR_SLOT_Y,
      img: this.uiLogin.nGet('CharSelect')?.nGet('BtSelect')?.nChildren ?? [],
      isHidden: true, // invisible hit-area; character drawn separately in doRender
      onClick: () => {
        this.selectedCharacterId = char.stat.characterId;
      },
    });
    ClickManager.addButton(btn);
    this.characterSlotButtons.push(btn);
    this.behindFrameButtons.add(btn);
  });
};

UILogin.resetWorld = function () {
  this.worldButtons.forEach((button, index) => {
    ClickManager.removeButton(button);
    this.behindFrameButtons.delete(button);
  });
}

UILogin.createWorldButtons = function () {
  this.worlds.forEach((world: World) => {
    const buttonImage = this.uiLogin.nGet('WorldSelect')?.BtWorld?.nGet(world.id, null);
    if (buttonImage) {
      this.worldButtonImages.set(world.id, buttonImage);
      const worldButton = new MapleStanceButton(this.gameCanvas, {
        x: -250 + this.worldButtonImages.size * 27,
        y: -800,
        img: buttonImage?.nChildren ?? [],
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

          const lastChClickTime: Record<number, number> = {};
          for (let i = 0; i < 20; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const isActive = i < world.channels.length;

            const channelButton = new MapleStanceButton(this.gameCanvas, {
              x: -145 + col * 92,
              y: -620 + row * 30,
              img: this.uiLogin.nGet('WorldSelect')?.nGet('channel')?.nGet(i)?.nChildren ?? [],
              isHidden: false,
              onClick: async () => {
                if (!isActive) return;
                const now = Date.now();
                const doubleClick = now - (lastChClickTime[i] ?? 0) < 400;
                lastChClickTime[i] = now;

                this.selectedChannelIndex = i;
                this.channelSelectAnimation = new FrameAnimation(
                  this.uiLogin.nGet('WorldSelect')?.nGet('channel')?.nGet('chSelect'),
                  -145 + col * 92 - 10,
                  -620 + row * 30 - 10
                );
                this.channelSelectAnimation.active = true;

                if (doubleClick && this.selectedWorldId !== null) {
                  if (!config.websocketUrl) {
                    await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
                  } else {
                    this.showLoading();
                    new CharacterListRequestPacket(this.selectedWorldId, i + 1).dispatch();
                  }
                }
              },
            });
            if (isActive) ClickManager.addButton(channelButton);
            this.channelButtons.push(channelButton);
          }

          const enterChannelButton = new MapleStanceButton(this.gameCanvas, {
            x: 135,
            y: -470,
            img: this.uiLogin.nGet('WorldSelect')?.BtGoworld?.nChildren ?? [],
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

    const image = this.uiLogin.nGet('WorldSelect')?.world?.nGet(world.id, null);
    if (image) {
      this.worldImages.set(world.id, image);
    } else {
      console.warn(`World image for world ${world.id} not found.`);
    }
  });
}

UILogin.doUpdate = function (msPerTick, camera, canvas) {
  UICommon.doUpdate(msPerTick);

  // Overlay state → camera transitions (all in one place, no circular deps)
  const raceHidden     = UIRaceSelect.isHidden;
  const creationHidden = UIExplorerCreation.isHidden;
  const overlayState   = raceHidden && creationHidden ? 'none'
                       : !raceHidden                  ? 'race'
                       :                               'creation';

  if (overlayState !== (this as any)._lastOverlayState) {
    if (overlayState === 'race') {
      LoginState.switchToSubState(LoginSubState.RACE_SELECT);
    } else if (overlayState === 'creation') {
      const race = (UIRaceSelect as any).confirmedRace ?? 'normal';
      const subState = race === 'aran'   ? LoginSubState.ARAN_CREATION
                     : race === 'knight' ? LoginSubState.CYGNUS_CREATION
                     :                     LoginSubState.CHARACTER_CREATION;
      LoginState.switchToSubState(subState);
    } else {
      LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
    }
    (this as any)._lastOverlayState = overlayState;
  }

  // Hover + click routing for UIRaceSelect race cards
  if (!UIRaceSelect.isHidden) {
    UIRaceSelect.onMouseMove(canvas.mouseX, canvas.mouseY);
    if (canvas.clicked) {
      UIRaceSelect.onMouseDown(canvas.mouseX, canvas.mouseY, canvas);
    }
  }
  // Route clicks to UIExplorerCreation look buttons (handled internally via ClickManager)
  // Draw call keeps it active — no extra routing needed here

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

  const overlayActive = !UIRaceSelect.isHidden || !UIExplorerCreation.isHidden;
  const savedClicked = canvas.clicked;
  if (overlayActive) (canvas as any).clicked = false;
  this.behindFrameButtons.forEach((obj) => {
    obj.draw(canvas, camera, lag, msPerTick, tdelta);
  });
  if (overlayActive) (canvas as any).clicked = savedClicked;

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

  // MapLogin shown during race select, NewChar backgrounds during creation
  if (!UIRaceSelect.isHidden) {
    for (const img of (UIRaceSelect as any)._mapLoginImgs ?? [])
      try { canvas.drawImage({ img, dx: 0, dy: 0 }); } catch (_) {}
  } else if (!UIExplorerCreation.isHidden) {
    for (const img of (UIExplorerCreation as any)._bg ?? [])
      try { canvas.drawImage({ img, dx: 0, dy: 0, dw: 800, dh: 600 }); } catch (_) {}
  }

  canvas.drawImage({
    img: this.frameImg,
    dx: 0,
    dy: 0,
  });

  if (overlayActive) (canvas as any).clicked = false;
  this.inFrontOfFrameButtons.forEach((obj) => {
    obj.draw(canvas, camera, lag, msPerTick, tdelta);
  });
  if (overlayActive) (canvas as any).clicked = savedClicked;

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

  if (this.selectedWorldImageAnimation.active && this.selectedWorldImage) {
    canvas.drawImage({
      img: this.selectedWorldImage,
      dx: this.selectedWorldImageAnimation.currentX,
      dy: 100,
    });
  }

  const pageStart = (this.currentCharPage ?? 0) * CHAR_SLOTS;
  this.characters.slice(pageStart, pageStart + CHAR_SLOTS).forEach((char, i) => {
    const wx = CHAR_SLOT_X_START + i * CHAR_SLOT_X_STEP;
    const cx = wx - camera.x;
    const cy = CHAR_SLOT_Y - camera.y;
    const isSelected = char.stat.characterId === this.selectedCharacterId;

    if (isSelected) {
      canvas.drawRect({ x: cx - 30, y: cy - 140, width: 120, height: 200, color: '#FFFFFF', alpha: 0.25 });
    }

    const charSelNode = this.uiLogin.nGet('CharSelect');

    const charOffX = 40; // shift character right relative to slot center
    const ccx = cx + charOffX; // character-centered x (screen)
    const charWx = wx + charOffX; // character world x for drawPreview

    // Aura (frame 1) — behind character
    const auraImg = charSelNode?.nGet('character')?.nGet('1')?.nGetImage();
    if (auraImg?.width) {
      canvas.drawImage({ img: auraImg, dx: ccx - Math.floor(auraImg.width / 2), dy: cy - auraImg.height + 10 });
    }

    // Race flag — left of character
    const race = getRaceKey(char.stat.job);
    const flagNode = charSelNode?.nGet(race);
    const flagImg = flagNode?.nGet('0')?.nGetImage?.() ?? flagNode?.nGetImage?.();
    if (flagImg?.width) {
      canvas.drawImage({ img: flagImg, dx: cx - 15, dy: cy - 140 });
    }

    // Character sprite
    drawPreview(canvas, camera, char, charWx, CHAR_SLOT_Y, 16);

    // Platform (frame 0) — at feet
    const platImg = charSelNode?.nGet('character')?.nGet('0')?.nGetImage();
    if (platImg?.width) {
      canvas.drawImage({ img: platImg, dx: ccx - Math.floor(platImg.width / 2), dy: cy - 10 });
    }

    canvas.drawText({ text: char.stat.characterName, color: '#FFFFFF', x: ccx, y: cy + 20, align: 'center' });
    canvas.drawText({ text: `Lv.${char.stat.level}`, color: '#FFFF88', x: ccx, y: cy + 34, align: 'center' });
  });

  UIRaceSelect.draw(canvas);
  UIExplorerCreation.draw(canvas, camera);

  canvas.drawText({
    text: "Ver. 0.83",
    fontWeight: "bold",
    x: 595,
    y: 13,
  });

  // Debug coord overlay — remove when layout is finalized
  const mx = canvas.mouseX ?? 0;
  const my = canvas.mouseY ?? 0;
  const wx = Math.round(mx + camera.x);
  const wy = Math.round(my + camera.y);
  canvas.drawRect({ x: 2, y: 2, width: 230, height: 16, color: '#000000', alpha: 0.65 });
  canvas.drawText({ text: `screen(${mx},${my})  world(${wx},${wy})`, x: 6, y: 14, color: '#00FF88', fontSize: 11 });

  this.drawMask(canvas);

  this.uiLoginNotice?.draw(canvas, camera, lag, msPerTick, tdelta);
  this.uiLoginTOS?.draw(canvas, camera, lag, msPerTick, tdelta);
  this.uiLoginLoading?.draw(canvas, camera, lag, msPerTick, tdelta);

  UICommon.doRender(canvas, camera, lag, msPerTick, tdelta);
  drawUIPic(canvas, camera);
};

UILogin.drawMask = function (canvas) {
  if (!this.frameImg) return;
  const frameWidth = this.frameImg.width;
  const frameHeight = this.frameImg.height;
  const frameX = 0;
  const frameY = 0;
  const canvasWidth = canvas.context.canvas.width;
  const canvasHeight = canvas.context.canvas.height;

  // Draw black rectangles to mask areas outside the frame
  canvas.drawRect({ x: 0, y: 0, width: frameX, height: canvasHeight, color: '#000000' }); // Left mask
  canvas.drawRect({ x: frameX + frameWidth, y: 0, width: canvasWidth - (frameX + frameWidth), height: canvasHeight, color: '#000000' }); // Right mask
  canvas.drawRect({ x: frameX, y: 0, width: frameWidth, height: frameY, color: '#000000' }); // Top mask
  canvas.drawRect({ x: frameX, y: frameY + frameHeight, width: frameWidth, height: canvasHeight - (frameY + frameHeight), color: '#000000' }); // Bottom mask
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
  const savedId = localStorage.getItem('maple_saved_id');
  if (savedId && this.inputUsn) {
    this.inputUsn.input.value = savedId;
  }
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
  const step = this.uiLogin.nGet('Common')?.nGet('step')?.nGet(stepId);
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
