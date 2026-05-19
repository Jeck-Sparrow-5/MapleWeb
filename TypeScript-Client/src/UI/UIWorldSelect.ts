import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import Camera from '../Camera';
import FrameAnimation from './FrameAnimation';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import MapleButton from './MapleButton';
import World from '../Net/Models/World';
import LoginState, { LoginSubState } from '../LoginState';
import CharacterListRequestPacket from '../Net/Packets/CharacterListRequestPacket';
import config from '../Config';
import PLAY_AUDIO from '../Audio/PlayAudio';

type AnimState = {
  active: boolean;
  type: 'slideIn' | 'fadeOut';
  startTime: number;
  duration: number;
  startX: number;
  targetX: number;
  currentX: number;
  alpha: number;
};

function makeAnim(): AnimState {
  return { active: false, type: 'slideIn', startTime: 0, duration: 500, startX: -100, targetX: 0, currentX: 0, alpha: 1 };
}

const UIWorldSelect = {
  // --- state ---
  worlds: [] as World[],
  worldButtons: [] as MapleButton[],
  channelButtons: [] as MapleButton[],
  worldImages: new Map<number, any>(),
  worldButtonImages: new Map<number, any>(),
  selectedWorldId: null as number | null,
  selectedChannelIndex: null as number | null,
  channelSelectAnimation: null as FrameAnimation | null,
  scrollOpenAnimation: null as FrameAnimation | null,
  scrollContentFadeIn: { active: false, startTime: 0, duration: 500, alpha: 0 },
  selectWorldChannelImgAnimation: makeAnim(),
  selectedWorldImageAnimation: makeAnim(),

  // --- private deps ---
  _canvas: null as GameCanvas | null,
  _worldSelectNode: null as any,
  _selectedWorldImage: null as any,
  _stepImageFn: null as ((step: number) => any) | null,
  _showLoading: null as (() => void) | null,
  _scrollSound: null as any,

  async initialize(
    canvas: GameCanvas,
    uiLoginNode: any,
    selectedWorldImage: any,
    stepImageFn: (step: number) => any,
    showLoading: () => void,
  ) {
    this._canvas = canvas;
    this._worldSelectNode = uiLoginNode.nGet('WorldSelect');
    this._selectedWorldImage = selectedWorldImage;
    this._stepImageFn = stepImageFn;
    this._showLoading = showLoading;

    const dx = Math.floor(-215);
    const dy = Math.floor(-830 - Camera.y);
    this.scrollOpenAnimation = new FrameAnimation(
      this._worldSelectNode?.nGet('scroll')?.nGet(0), dx, dy
    );
    this.scrollContentFadeIn = { active: false, startTime: 0, duration: 500, alpha: 0 };
    this.selectWorldChannelImgAnimation = makeAnim();
    this.selectedWorldImageAnimation = makeAnim();

    NXManager.get('Sound.wz/UI.img/scroll').then((n: any) => {
      if (n) this._scrollSound = n.nGetAudio?.();
    }).catch(() => {});
  },

  setWorlds(worlds: World[]) {
    this.worlds = worlds;
  },

  reset() {
    this.worldButtons.forEach(btn => {
      ClickManager.removeButton(btn);
    });
    this.worldButtons = [];
  },

  createWorldButtons(onEnterChannel: (worldId: number, channelIdx: number) => void) {
    const canvas = this._canvas!;
    const wsNode = this._worldSelectNode;

    this.worlds.forEach((world: World) => {
      const buttonImage = wsNode?.BtWorld?.nGet(world.id, null);
      if (buttonImage) {
        this.worldButtonImages.set(world.id, buttonImage);
        const worldButton = new MapleStanceButton(canvas, {
          x: -250 + this.worldButtonImages.size * 27,
          y: -800,
          img: buttonImage?.nChildren ?? [],
          onClick: () => {
            this.scrollOpenAnimation?.reset();
            if (this.scrollOpenAnimation) this.scrollOpenAnimation.active = true;
            this.selectedWorldId = world.id;
            if (this._scrollSound) PLAY_AUDIO(this._scrollSound, 0.7);

            this.scrollContentFadeIn.active = false;
            this.scrollContentFadeIn.alpha = 0;
            this.channelSelectAnimation = null;

            this.channelButtons.forEach(btn => ClickManager.removeButton(btn));
            this.channelButtons = [];

            const lastChClickTime: Record<number, number> = {};
            for (let i = 0; i < 20; i++) {
              const row = Math.floor(i / 4);
              const col = i % 4;
              const isActive = i < world.channels.length;

              const channelButton = new MapleStanceButton(canvas, {
                x: -145 + col * 92,
                y: -620 + row * 30,
                img: wsNode?.nGet('channel')?.nGet(i)?.nChildren ?? [],
                isHidden: false,
                onClick: async () => {
                  if (!isActive) return;
                  const now = Date.now();
                  const doubleClick = now - (lastChClickTime[i] ?? 0) < 400;
                  lastChClickTime[i] = now;

                  this.selectedChannelIndex = i;
                  this.channelSelectAnimation = new FrameAnimation(
                    wsNode?.nGet('channel')?.nGet('chSelect'),
                    -145 + col * 92 - 10,
                    -620 + row * 30 - 10
                  );
                  this.channelSelectAnimation.active = true;

                  if (doubleClick && this.selectedWorldId !== null) {
                    if (!config.websocketUrl) {
                      await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
                    } else {
                      this._showLoading?.();
                      new CharacterListRequestPacket(this.selectedWorldId, i + 1).dispatch();
                    }
                  }
                },
              });
              if (isActive) ClickManager.addButton(channelButton);
              this.channelButtons.push(channelButton);
            }

            const enterChannelButton = new MapleStanceButton(canvas, {
              x: 135,
              y: -470,
              img: wsNode?.BtGoworld?.nChildren ?? [],
              onClick: async () => {
                if (!config.websocketUrl) {
                  await LoginState.switchToSubState(LoginSubState.CHARACTER_SELECT);
                  return;
                }
                if (this.selectedWorldId !== null && this.selectedChannelIndex !== null) {
                  this._showLoading?.();
                  onEnterChannel(this.selectedWorldId, this.selectedChannelIndex);
                }
              },
              isHidden: false,
            });
            ClickManager.addButton(enterChannelButton);
            this.channelButtons.push(enterChannelButton);
          },
        });
        ClickManager.addButton(worldButton);
        this.worldButtons.push(worldButton);
      } else {
        console.warn(`World button image for world ${world.id} not found.`);
      }

      const image = wsNode?.world?.nGet(world.id, null);
      if (image) this.worldImages.set(world.id, image);
      else console.warn(`World image for world ${world.id} not found.`);
    });
  },

  // --- animation triggers (called from LoginState via UILogin) ---
  startSelectWorldChannelImgSlideIn() {
    this.selectWorldChannelImgAnimation = {
      active: true, type: 'slideIn', startTime: Date.now(),
      duration: 500, startX: -100, targetX: 0, currentX: 0, alpha: 0,
    };
  },

  startSelectWorldChannelImgFadeOut() {
    this.selectWorldChannelImgAnimation = {
      active: true, type: 'fadeOut', startTime: Date.now(),
      duration: 500, startX: 0, targetX: 0, currentX: 0, alpha: 1,
    };
  },

  startSelectedWorldSlideIn() {
    this.selectedWorldImageAnimation = {
      active: true, type: 'slideIn', startTime: Date.now(),
      duration: 500, startX: -100, targetX: 0, currentX: 0, alpha: 0,
    };
  },

  // --- update ---
  doUpdate(msPerTick: number) {
    this.scrollOpenAnimation?.update(msPerTick);
    if (this.channelSelectAnimation) this.channelSelectAnimation.update(msPerTick);

    // Scroll → fade-in content
    if (this.scrollOpenAnimation && !this.scrollOpenAnimation.active && this.selectedWorldId !== null) {
      if (!this.scrollContentFadeIn.active && this.scrollContentFadeIn.alpha < 1) {
        this.scrollContentFadeIn.active = true;
        this.scrollContentFadeIn.startTime = Date.now();
        this.scrollContentFadeIn.alpha = 0;
      }
    }
    if (this.scrollContentFadeIn.active) {
      const elapsed = Date.now() - this.scrollContentFadeIn.startTime;
      this.scrollContentFadeIn.alpha = Math.min(elapsed / this.scrollContentFadeIn.duration, 1);
      if (this.scrollContentFadeIn.alpha === 1) this.scrollContentFadeIn.active = false;
    }

    this._advanceAnim(this.selectWorldChannelImgAnimation);
    this._advanceAnim(this.selectedWorldImageAnimation);
  },

  _advanceAnim(a: AnimState) {
    if (!a.active) return;
    const elapsed = Date.now() - a.startTime;
    if (a.type === 'slideIn') {
      a.currentX = Math.min(a.startX + (elapsed / a.duration) * (a.targetX - a.startX), a.targetX);
      a.alpha = Math.min(elapsed / a.duration, 1);
    } else {
      a.alpha = Math.max(1 - elapsed / a.duration, 0);
    }
    if (a.alpha === 0 || (a.type === 'slideIn' && a.currentX >= a.targetX && a.alpha >= 1)) {
      a.active = false;
    }
  },

  // --- render ---
  drawScrollAnim(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    this.scrollOpenAnimation?.draw(canvas, camera, lag, msPerTick, tdelta);
  },

  drawContent(canvas: GameCanvas, camera: CameraInterface) {
    if (this.selectedWorldId === null) return;
    const worldImage = this.worldImages.get(this.selectedWorldId);
    if (worldImage) {
      canvas.drawImage({ img: worldImage.nGetImage(), dx: 225, dy: -680 - Camera.y, alpha: this.scrollContentFadeIn.alpha });
    }
    this.channelButtons.forEach((obj: any) => {
      if (!obj.isHidden) {
        const currentFrame = obj.stances?.[obj.stance];
        const currentImage = currentFrame?.nGetImage();
        if (currentImage) {
          canvas.drawImage({ img: currentImage, dx: obj.x - camera.x, dy: obj.y - camera.y, alpha: this.scrollContentFadeIn.alpha });
        }
      }
    });
    if (this.channelSelectAnimation) {
      this.channelSelectAnimation.draw(canvas, camera, 0, 0, 0);
    }
  },

  drawTopAnimations(canvas: GameCanvas) {
    const a1 = this.selectWorldChannelImgAnimation;
    if (a1.active) {
      canvas.drawImage({ img: this._stepImageFn?.(1), dx: a1.currentX, dy: 30, alpha: a1.alpha });
    }
    const a2 = this.selectedWorldImageAnimation;
    if (a2.active && this._selectedWorldImage) {
      canvas.drawImage({ img: this._selectedWorldImage, dx: a2.currentX, dy: 100 });
    }
  },
};

export default UIWorldSelect;
