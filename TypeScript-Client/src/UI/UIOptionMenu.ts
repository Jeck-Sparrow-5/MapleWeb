import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';

export const gameOptions = {
  showDamage: true,
  showPlayerNames: true,
  showNpcNames: true,
  bgmVolume: 80,
  sfxVolume: 80,
};

const UIOptionMenu = {
  isHidden: true,
  buttons: [] as MapleStanceButton[],
  bgImg: null as any,
  initialized: false,
  x: 150,
  y: 100,
  W: 320,
  H: 280,
  activeTab: 0,

  async initialize(canvas: GameCanvas) {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('GameOpt')?.nGetImage?.() ?? null;

    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.hide(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // On/Off toggles
    const btOn  = uiWin?.nGet('BtOn');
    const btOff = uiWin?.nGet('BtOff');
    const toggleOpts: Array<{ label: string; key: keyof typeof gameOptions }> = [
      { label: 'Damage Numbers', key: 'showDamage' },
      { label: 'Player Names',   key: 'showPlayerNames' },
      { label: 'NPC Names',      key: 'showNpcNames' },
    ];

    toggleOpts.forEach((opt, i) => {
      const src = (gameOptions[opt.key] as boolean) ? btOn : btOff;
      if (!src) return;
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 250, y: this.y + 50 + i * 35,
        img: src.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => {
          (gameOptions[opt.key] as any) = !(gameOptions[opt.key] as boolean);
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    });

    this.initialized = true;
  },

  show(canvas?: GameCanvas) {
    if (!this.initialized && canvas) this.initialize(canvas);
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
  },
  hide() { this.isHidden = true;  this.buttons.forEach((b) => (b.isHidden = true)); },
  toggle(canvas?: GameCanvas) { if (this.isHidden) this.show(canvas); else this.hide(); },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
    canvas.context.fillRect(this.x, this.y, this.W, this.H);
    canvas.context.strokeStyle = '#556688';
    canvas.context.strokeRect(this.x, this.y, this.W, this.H);
    canvas.context.restore();

    canvas.drawText({ text: 'Options', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 13 });

    const opts: Array<{ label: string; value: string | number }> = [
      { label: 'Damage Numbers', value: gameOptions.showDamage ? 'ON' : 'OFF' },
      { label: 'Player Names',   value: gameOptions.showPlayerNames ? 'ON' : 'OFF' },
      { label: 'NPC Names',      value: gameOptions.showNpcNames ? 'ON' : 'OFF' },
      { label: 'BGM Volume',     value: `${gameOptions.bgmVolume}%` },
      { label: 'SFX Volume',     value: `${gameOptions.sfxVolume}%` },
    ];

    opts.forEach((opt, i) => {
      canvas.drawText({ text: opt.label, color: '#CCCCCC', x: this.x + 15, y: this.y + 48 + i * 35, fontSize: 11 });
      canvas.drawText({ text: String(opt.value), color: '#AAFFAA', x: this.x + 220, y: this.y + 48 + i * 35, fontSize: 11 });
    });

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIOptionMenu;
