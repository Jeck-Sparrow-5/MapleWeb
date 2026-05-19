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
import NameTagRenderer from './NameTagRenderer';
import { getJobName } from '../Constants/Jobs';
import SelectCharPacket from '../Net/Packets/SelectCharPacket';
import UIRaceSelect from './UIRaceSelect';
import UIExplorerCreation from './UIExplorerCreation';
import { SelectCharPicPacket, RegisterPicPacket } from '../Net/Packets/PicPackets';
import { DeleteCharPacket } from '../Net/Packets/DeleteCharPacket';
import { drawPreview, clearCache, setPreviewStance } from './CharSelectPreview';
import { initUIPic, showPic, drawUIPic } from './UIPic';
import PLAY_AUDIO from '../Audio/PlayAudio';
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
  _doLogin: (() => Promise<void>) | null;
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
  maxCharacterSlots: number;
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
  this.maxCharacterSlots = 3;
  this.currentCharPage = 0;
  await NameTagRenderer.initialize();
  this.saveIdEnabled = !!localStorage.getItem('maple_saved_id');

  initUIPic(canvas);   // load SoftKey WZ assets async (fire-and-forget)

  // Preload login UI sounds
  NXManager.get('Sound.wz/UI.img/scroll').then((n: any) => {
    if (n) (this as any)._scrollSound = n.nGetAudio?.();
  }).catch(() => {});

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

  const doLogin = async () => {
    if (!config.websocketUrl) {
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
  };
  this._doLogin = doLogin;

  const loginButton = new MapleStanceButton(canvas, {
    x: 223,
    y: -85,
    img: this.uiLogin.nGet('Title')?.nGet('BtLogin')?.nChildren ?? [],
    onClick: doLogin,
  });
  ClickManager.addButton(loginButton);
  this.behindFrameButtons.add(loginButton);
  this.inputUsn?.addSubmitListener(doLogin);
  this.inputPwd?.addSubmitListener(doLogin);

  // Save ID (BtLoginIDSave)
  const saveIdButton = new MapleStanceButton(canvas, {
    x: 55,
    y: -5,
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
    y: -5,
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
    y: -5,
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
    y: 40,
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
    y: 43,
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

function getJobIconIndex(job: number): number {
  if (job >= 100 && job < 200) return 0;
  if (job >= 200 && job < 300) return 1;
  if (job >= 300 && job < 400) return 2;
  if (job >= 400 && job < 500) return 3;
  if (job >= 500 && job < 600) return 4;
  if (job >= 1100 && job < 1200) return 0;
  if (job >= 1200 && job < 1300) return 1;
  if (job >= 1300 && job < 1400) return 2;
  if (job >= 1400 && job < 1500) return 3;
  if (job >= 1500 && job < 1600) return 4;
  if (job >= 2100) return 0;
  return 0;
}

function getRaceKey(job: number): string {
  if (job >= 2000 && job < 3000) return 'aran';
  if (job >= 1000 && job < 2000) return 'knight';
  return 'adventure';
}

const _charClickTime = new Map<number, number>();

function _triggerStartGame(login: typeof UILogin, canvas: GameCanvas) {
  const charId = login.selectedCharacterId;
  if (charId === null) return;
  const pic = login.requirePic ?? 0;
  if (!config.websocketUrl) { LoginState.enterGame(); return; }
  if (pic === 0) { new SelectCharPacket(charId).dispatch(); }
  else if (pic === 1) { showPic(canvas, 'enter', (entered) => { new SelectCharPicPacket(entered, charId).dispatch(); }); }
  else { showPic(canvas, 'register', (newPic) => { new RegisterPicPacket(charId, newPic).dispatch(); }); }
}

function _selectCharacter(login: typeof UILogin, newId: number) {
  if (login.selectedCharacterId !== null && login.selectedCharacterId !== newId) {
    setPreviewStance(login.selectedCharacterId, 'stand1');
  }
  login.selectedCharacterId = newId;
  setPreviewStance(newId, 'walk1');
  _resetGlow();
}

// Character select slot glow animation state (plays once, holds at last frame)
let _glowFrameIdx = 0;
let _glowElapsed  = 0;
function _resetGlow() { _glowFrameIdx = 0; _glowElapsed = 0; }
function _advanceGlow(msPerTick: number) {
  _glowElapsed += msPerTick;
  while (_glowElapsed >= 100) { _glowElapsed -= 100; _glowFrameIdx++; }
}

const CHAR_SLOTS = 3;
const CHAR_SLOT_X_START = -177; // world x of slot 0 — centered between pageL(-260) and pageR(185)
const CHAR_SLOT_X_STEP = 140;   // world px between slots
const CHAR_SLOT_Y = -1160;      // world y of click area
const CHAR_OFF_X = 40;          // character sprite offset from slot center

UILogin.clearCharacterSlotButtons = function () {
  this.characterSlotButtons.forEach((btn) => ClickManager.removeButton(btn));
  this.characterSlotButtons = [];
};

UILogin.createCharacterSlotButtons = function () {
  this.clearCharacterSlotButtons();

  // Default selection = first character
  if (this.characters.length > 0 && this.selectedCharacterId === null) {
    this.selectedCharacterId = this.characters[0].stat.characterId;
    _resetGlow();
  }

  const pageStart = (this.currentCharPage ?? 0) * CHAR_SLOTS;
  this.characters.slice(pageStart, pageStart + CHAR_SLOTS).forEach((char, i) => {
    const wx = CHAR_SLOT_X_START + i * CHAR_SLOT_X_STEP;
    const btn = new MapleStanceButton(this.gameCanvas, {
      x: wx,
      y: CHAR_SLOT_Y,
      img: this.uiLogin.nGet('CharSelect')?.nGet('BtSelect')?.nChildren ?? [],
      isHidden: false, // must be false so ClickManager processes it; not in behindFrameButtons so it won't render
      onClick: () => { _selectCharacter(this, char.stat.characterId); },
    });
    ClickManager.addButton(btn);
    this.characterSlotButtons.push(btn);
    // intentionally NOT added to behindFrameButtons — click-only, drawn separately in doRender
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
          if ((this as any)._scrollSound) PLAY_AUDIO((this as any)._scrollSound, 0.7);

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

  // Full-character hit detection — released click over any character slot
  const mouseReleased = (this as any)._prevMouseDown && !canvas.clicked;
  (this as any)._prevMouseDown = canvas.clicked;
  if (mouseReleased && LoginState.currentSubState === LoginSubState.CHARACTER_SELECT) {
    const pageStart = (this.currentCharPage ?? 0) * CHAR_SLOTS;
    this.characters.slice(pageStart, pageStart + CHAR_SLOTS).forEach((char, i) => {
      const sx = (CHAR_SLOT_X_START + i * CHAR_SLOT_X_STEP + CHAR_OFF_X) - camera.x;
      const sy = CHAR_SLOT_Y - camera.y;
      if (canvas.mouseX >= sx - 55 && canvas.mouseX <= sx + 55 &&
          canvas.mouseY >= sy - 160 && canvas.mouseY <= sy + 20) {
        const now = Date.now();
        const last = _charClickTime.get(char.stat.characterId) ?? 0;
        _charClickTime.set(char.stat.characterId, now);
        if (now - last < 400 && char.stat.characterId === this.selectedCharacterId) {
          _triggerStartGame(this, canvas);
        } else {
          _selectCharacter(this, char.stat.characterId);
        }
      }
    });
  }

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
  _advanceGlow(msPerTick);
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

  // Head glow behind frame UI — draw before frameImg so it renders beneath it
  if (this.selectedCharacterId !== null) {
    const pageStart2 = (this.currentCharPage ?? 0) * CHAR_SLOTS;
    const selIdx = this.characters.slice(pageStart2, pageStart2 + CHAR_SLOTS)
      .findIndex(c => c.stat.characterId === this.selectedCharacterId);
    if (selIdx >= 0) {
      const selWx = CHAR_SLOT_X_START + selIdx * CHAR_SLOT_X_STEP + CHAR_OFF_X;
      const csNode = this.uiLogin.nGet('CharSelect');
      const e1 = csNode?.nGet('effect')?.nGet('1');
      if (e1) {
        const f1s = e1.nChildren?.filter((c: any) => c.nTagName === 'canvas') ?? [];
        if (f1s.length) {
          const fNode = f1s[Math.min(_glowFrameIdx, f1s.length - 1)];
          const fImg = fNode?.nGetImage?.();
          if (fImg?.width) {
            const orig = fNode?.nChildren?.find((c: any) => c.nName === 'origin');
            canvas.drawImage({ img: fImg, dx: (selWx - 5 - camera.x) - (orig?.nX ?? 0), dy: (CHAR_SLOT_Y - 365 - camera.y) - (orig?.nY ?? 0) });
          }
        }
      }
    }
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


    const charSelNode = this.uiLogin.nGet('CharSelect');

    const ccx = cx + CHAR_OFF_X;
    const charWx = wx + CHAR_OFF_X;

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
      canvas.drawImage({ img: flagImg, dx: cx - 15, dy: cy - 137 });
    }


    // Character sprite
    drawPreview(canvas, camera, char, charWx, CHAR_SLOT_Y, 16);

    // Platform (frame 0) — at feet
    const platImg = charSelNode?.nGet('character')?.nGet('0')?.nGetImage();
    if (platImg?.width) {
      canvas.drawImage({ img: platImg, dx: ccx - Math.floor(platImg.width / 2), dy: cy - 10 });
    }

    // Feet glow (effect/0) — continuous loop via Date.now()
    if (isSelected) {
      const e0 = charSelNode?.nGet('effect')?.nGet('0');
      if (e0) {
        const f0s = e0.nChildren?.filter((c: any) => c.nTagName === 'canvas') ?? [];
        if (f0s.length) {
          const fNode = f0s[Math.floor(Date.now() / 100) % f0s.length];
          const fImg = fNode?.nGetImage?.();
          if (fImg?.width) {
            canvas.drawImage({ img: fImg, dx: ccx - fImg.width / 2, dy: cy - fImg.height / 2 + 10 });
          }
        }
      }
    }

    // Name tag — CharSelect/nameTag/0 (unselected) or /1 (selected), L/M/R pieces
    const tagVariant = charSelNode?.nGet('nameTag')?.nGet(isSelected ? '1' : '0');
    const tagL = tagVariant?.nGet('0')?.nGetImage?.();
    const tagM = tagVariant?.nGet('1')?.nGetImage?.();
    const tagR = tagVariant?.nGet('2')?.nGetImage?.();
    if (tagL?.width > 1 && tagM?.width > 1 && tagR?.width > 1) {
      const nameW = canvas.measureText({ text: char.stat.characterName, fontSize: 11 }).width;
      const totalW = tagL.width + nameW + tagR.width;
      const tagCx = ccx; // center on character
      const tagX = tagCx - totalW / 2;
      const tagY = cy + 20;
      canvas.drawImage({ img: tagL, dx: tagX,                      dy: tagY });
      canvas.drawImage({ img: tagM, dx: tagX + tagL.width,         dy: tagY, scaleX: nameW / tagM.width });
      canvas.drawImage({ img: tagR, dx: tagX + tagL.width + nameW, dy: tagY });
      canvas.drawText({ text: char.stat.characterName, x: tagCx, y: tagY + Math.floor((tagL.height - 11) / 2), color: '#ffffff', fontSize: 11, align: 'center' });
    }

    // charInfo panel — scroll/0 (variant 0) as background, charInfo as content
    if (isSelected) {
      const s = char.stat;

      // Background: scroll/0 animated (frames 0-3, opens like a scroll), holds at last frame
      const scrollNode = charSelNode?.nGet('scroll')?.nGet('0');
      const scrollFrames = scrollNode?.nChildren?.filter((c: any) => c.nTagName === 'canvas') ?? [];
      const scrollFrameIdx = Math.min(_glowFrameIdx, scrollFrames.length > 0 ? scrollFrames.length - 1 : 0);
      const scrollImg = scrollFrames[scrollFrameIdx]?.nGetImage?.();
      // Content: charInfo (183×115, origin 45,57)
      const infoImg = charSelNode?.nGet('charInfo')?.nGetImage?.();
      const ORIG_X = -3, ORIG_Y = 130;

      // Center 217px scroll on character, position above head
      const scrollX = ccx - 108;
      const scrollY = cy - 255;
      const scrollH = scrollImg?.height ?? 30;

      if (scrollImg?.width > 1) {
        canvas.drawImage({ img: scrollImg, dx: scrollX, dy: scrollY });
      }

      const scrollFullyOpen = scrollFrameIdx >= (scrollFrames.length > 0 ? scrollFrames.length - 1 : 0);
      // charInfo below scroll header, centered (183px within 217px = 17px offset)
      const infoX = scrollX + 17 - ORIG_X;
      const infoY = scrollY + scrollH - ORIG_Y;

      if (scrollFullyOpen) {
        if (infoImg?.width > 1) {
          canvas.drawImage({ img: infoImg, dx: infoX, dy: infoY });
        } else {
          canvas.drawRoundedRect({ x: infoX + ORIG_X, y: infoY + ORIG_Y, width: 183, height: 115, radius: 4, color: '#0a0a1a', alpha: 0.9, strokeColor: '#334466', strokeWidth: 1 });
        }
      }

      // Text values — only when scroll fully open
      if (!scrollFullyOpen) { /* skip */ } else {
      const px = infoX + ORIG_X; const py = infoY + ORIG_Y;
      const vc = '#000000'; const fs = 10;
     // canvas.drawText({ text: s.characterName, color: vc, fontSize: 11, fontWeight: 'bold', x: px + 92, y: py + 8, align: 'center' });
      //const jobIconImg = charSelNode?.nGet('icon')?.nGet('job')?.nGet(String(getJobIconIndex(s.job)))?.nGetImage?.();
      //if (jobIconImg?.width > 1) canvas.drawImage({ img: jobIconImg, dx: px + 80, dy: py + -125 });
      canvas.drawText({ text: getJobName(s.job), color: '#000000', fontSize: fs, x: px + 80, y: py + -125 });
      canvas.drawText({ text: String(s.level), color: vc, fontSize: fs, x: px + 45,  y: py + -110 });
      canvas.drawText({ text: String(s.fame),  color: vc, fontSize: fs, x: px + 145, y: py + -110 });
      const rankIconName = (char.rank?.rankMovement ?? 0) > 0 ? 'up' : (char.rank?.rankMovement ?? 0) < 0 ? 'down' : 'same';
      const rankIconImg = charSelNode?.nGet('icon')?.nGet(rankIconName)?.nGetImage?.();
      if (rankIconImg?.width > 1) canvas.drawImage({ img: rankIconImg, dx: px + 145, dy: py + -25 });
      canvas.drawText({ text: String(s.str), color: vc, fontSize: fs, x: px + 45,  y: py + -90 });
      canvas.drawText({ text: String(s.int), color: vc, fontSize: fs, x: px + 145, y: py + -90 });
      canvas.drawText({ text: String(s.dex), color: vc, fontSize: fs, x: px + 45,  y: py + -73 });
      canvas.drawText({ text: String(s.luk), color: vc, fontSize: fs, x: px + 145, y: py + -73 });
     // canvas.drawText({ text: `${s.hp}/${s.maxHp}`, color: vc, fontSize: fs, x: px + 26,  y: py + 80 });
     // canvas.drawText({ text: `${s.mp}/${s.maxMp}`, color: vc, fontSize: fs, x: px + 111, y: py + 80 });
      } // end scrollFullyOpen text block
    }
  });


  UIRaceSelect.draw(canvas);
  UIExplorerCreation.draw(canvas, camera);

  // World / channel label during character select
  if (LoginState.currentSubState === LoginSubState.CHARACTER_SELECT &&
      this.selectedWorldId !== null && this.selectedChannelIndex !== null) {
    const worldName = this.worlds.find(w => w.id === this.selectedWorldId)?.name ?? '';
    const chLabel = `${worldName}  Ch.${this.selectedChannelIndex + 1}`;
    canvas.drawText({ text: chLabel, color: '#ffffff', fontSize: 12, fontWeight: 'bold', x: 277 - camera.x, y: -1410 - camera.y, align: 'center' });
  }

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
  if (this._doLogin) {
    this.inputUsn?.addSubmitListener(this._doLogin);
    this.inputPwd?.addSubmitListener(this._doLogin);
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
