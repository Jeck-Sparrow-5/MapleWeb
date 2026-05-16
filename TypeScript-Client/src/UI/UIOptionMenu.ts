import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import AudioManager from '../Audio/AudioManager';

export const gameOptions = {
  showDamage:      true,
  showPlayerNames: true,
  showNpcNames:    true,
  bgmVolume:       40,   // 0-100
  sfxVolume:       80,
  showBuffTimers:  true,
  showHpBars:      true,
  fpsCap:          60,
};

type Tab = 'display' | 'audio' | 'controls';
const TABS: Tab[] = ['display', 'audio', 'controls'];

const UIOptionMenu = {
  isHidden: true,
  buttons:  [] as MapleStanceButton[],
  bgImg:    null as any,
  initialized: false,
  x: 150,
  y: 80,
  W: 340,
  H: 300,
  activeTab: 'display' as Tab,
  _draggingSlider: null as string | null,

  async initialize(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
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

    this.initialized = true;
  },

  show(canvas?: GameCanvas) {
    if (!this.initialized && canvas) this.initialize(canvas);
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
  },
  hide() { this.isHidden = true; this.buttons.forEach((b) => (b.isHidden = true)); this._draggingSlider = null; },
  toggle(canvas?: GameCanvas) { if (this.isHidden) this.show(canvas); else this.hide(); },

  onMouseDown(mx: number, my: number): boolean {
    if (this.isHidden) return false;
    // Tab clicks
    TABS.forEach((tab, i) => {
      const tx = this.x + 8 + i * 108;
      if (mx >= tx && mx < tx + 100 && my >= this.y + 20 && my < this.y + 36) {
        this.activeTab = tab;
      }
    });
    // Slider drag start
    if (this.activeTab === 'audio') {
      const sliders: Array<[string, number]> = [['bgmVolume', 70], ['sfxVolume', 115]];
      for (const [key, sy] of sliders) {
        if (my >= this.y + sy - 5 && my < this.y + sy + 10) {
          this._draggingSlider = key;
          this._updateSlider(mx);
          return true;
        }
      }
    }
    return true;
  },

  onMouseMove(mx: number, _my: number) {
    if (this._draggingSlider) this._updateSlider(mx);
  },

  onMouseUp() { this._draggingSlider = null; },

  _updateSlider(mx: number) {
    const sliderX = this.x + 100;
    const sliderW = 180;
    const pct = Math.max(0, Math.min(100, Math.round(((mx - sliderX) / sliderW) * 100)));
    if (this._draggingSlider === 'bgmVolume') {
      gameOptions.bgmVolume = pct;
      AudioManager.bgm.volume = pct / 100;
    } else if (this._draggingSlider === 'sfxVolume') {
      gameOptions.sfxVolume = pct;
    }
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(20,20,40,0.97)';
    canvas.context.fillRect(this.x, this.y, this.W, this.H);
    canvas.context.strokeStyle = '#556688';
    canvas.context.strokeRect(this.x, this.y, this.W, this.H);

    // Tabs
    TABS.forEach((tab, i) => {
      const tx = this.x + 8 + i * 108;
      const active = this.activeTab === tab;
      canvas.context.fillStyle = active ? 'rgba(80,100,160,0.9)' : 'rgba(40,50,80,0.7)';
      canvas.context.fillRect(tx, this.y + 20, 100, 16);
      canvas.context.restore(); canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.97)';
    });
    canvas.context.restore();

    TABS.forEach((tab, i) => {
      const tx = this.x + 8 + i * 108;
      canvas.drawText({ text: tab.charAt(0).toUpperCase() + tab.slice(1), color: '#FFFFFF', x: tx + 10, y: this.y + 31, fontSize: 10 });
    });

    canvas.drawText({ text: 'Options', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });

    const contentY = this.y + 46;

    if (this.activeTab === 'display') {
      const toggles: Array<[string, keyof typeof gameOptions]> = [
        ['Damage Numbers',  'showDamage'],
        ['Player Names',    'showPlayerNames'],
        ['NPC Names',       'showNpcNames'],
        ['Buff Timers',     'showBuffTimers'],
        ['HP Bars',         'showHpBars'],
      ];
      toggles.forEach(([label, key], i) => {
        const ry = contentY + i * 34;
        const val = gameOptions[key] as boolean;
        canvas.drawText({ text: label, color: '#CCCCCC', x: this.x + 15, y: ry + 12, fontSize: 11 });
        canvas.context.save();
        canvas.context.fillStyle = val ? '#44AA44' : '#AA4444';
        canvas.context.fillRect(this.x + 260, ry, 60, 20);
        canvas.context.restore();
        canvas.drawText({ text: val ? 'ON' : 'OFF', color: '#FFFFFF', x: this.x + 278, y: ry + 13, fontSize: 10 });
      });
    } else if (this.activeTab === 'audio') {
      this._drawSlider(canvas, 'BGM Volume', 'bgmVolume', contentY + 20);
      this._drawSlider(canvas, 'SFX Volume', 'sfxVolume', contentY + 65);
      canvas.drawText({ text: 'Changes take effect immediately', color: '#888888', x: this.x + 15, y: contentY + 105, fontSize: 9 });
    } else if (this.activeTab === 'controls') {
      const binds = [
        ['Attack', 'CTRL'], ['Jump', 'ALT'], ['Pickup', 'Z'],
        ['Inventory', 'I'], ['Stats', 'S'], ['Skills', 'K'],
        ['Equip', 'E'], ['Quest', 'Q'], ['Menu', 'M'],
      ];
      binds.forEach(([action, key], i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        const bx = this.x + 15 + col * 108;
        const by = contentY + row * 30;
        canvas.drawText({ text: action, color: '#AAAACC', x: bx, y: by + 10, fontSize: 10 });
        canvas.context.save();
        canvas.context.fillStyle = 'rgba(40,50,80,0.8)';
        canvas.context.fillRect(bx + 55, by, 45, 18);
        canvas.context.restore();
        canvas.drawText({ text: key, color: '#FFFFFF', x: bx + 60, y: by + 12, fontSize: 9 });
      });
      canvas.drawText({ text: 'Edit bindings via Key Config (M → Controls)', color: '#666688', x: this.x + 15, y: this.y + this.H - 20, fontSize: 9 });
    }

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },

  _drawSlider(canvas: GameCanvas, label: string, key: keyof typeof gameOptions, y: number) {
    const sliderX = this.x + 100;
    const sliderW = 180;
    const value = gameOptions[key] as number;
    const fillW = Math.round((value / 100) * sliderW);

    canvas.drawText({ text: label, color: '#CCCCCC', x: this.x + 15, y: y + 10, fontSize: 11 });
    canvas.context.save();
    canvas.context.fillStyle = 'rgba(40,50,80,0.8)';
    canvas.context.fillRect(sliderX, y + 2, sliderW, 10);
    canvas.context.fillStyle = '#4488CC';
    canvas.context.fillRect(sliderX, y + 2, fillW, 10);
    canvas.context.fillStyle = '#FFFFFF';
    canvas.context.beginPath();
    canvas.context.arc(sliderX + fillW, y + 7, 6, 0, Math.PI * 2);
    canvas.context.fill();
    canvas.context.restore();
    canvas.drawText({ text: `${value}%`, color: '#AAAAFF', x: sliderX + sliderW + 6, y: y + 10, fontSize: 10 });
  },
};

export default UIOptionMenu;
