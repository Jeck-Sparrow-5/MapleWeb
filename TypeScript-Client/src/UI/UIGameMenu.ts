import WZManager from '../wz-utils/WZManager';
import UIOptionMenu from './UIOptionMenu';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import config from '../Config';

const UIGameMenu = {
  isHidden: true,
  bgImg: null as any,
  buttons: [] as MapleStanceButton[],
  initialized: false,
  x: 0,
  y: 0,
  W: 93,
  H: 140,
  onQuit: null as (() => void) | null,
  onChannel: null as (() => void) | null,

  async initialize(canvas: GameCanvas, opts: { onQuit?: () => void; onChannel?: () => void } = {}) {
    this.onQuit = opts.onQuit ?? null;
    this.onChannel = opts.onChannel ?? null;

    // Position near bottom-right above status bar
    this.x = config.originalWidth - 100;
    this.y = config.originalHeight - 150 + (config.height - config.originalHeight);

    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    const menuNode = uiWin?.nGet('GameMenu');
    this.bgImg = menuNode?.nGet('backgrnd')?.nGetImage?.() ?? null;

    // Channel button
    const btChannel = menuNode?.nGet('BtChannel');
    if (btChannel) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 10,
        img: btChannel.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); this.onChannel?.(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Game Options
    const btGameOpt = menuNode?.nGet('BtGameOpt');
    if (btGameOpt) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 40,
        img: btGameOpt.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); UIOptionMenu.show(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Sys Options
    const btSysOpt = menuNode?.nGet('BtSysOpt');
    if (btSysOpt) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 70,
        img: btSysOpt.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Quit
    const btQuit = menuNode?.nGet('BtQuit');
    if (btQuit) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 105,
        img: btQuit.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); this.onQuit?.(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  toggle() {
    if (this.isHidden) this.show();
    else this.hide();
  },

  show() {
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
  },

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.initialized) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
      canvas.context.fillRect(this.x, this.y, 93, 140);
      canvas.context.strokeStyle = '#557799';
      canvas.context.strokeRect(this.x, this.y, 93, 140);
      canvas.context.restore();

      const labels = ['Channel', 'Game Opt', 'Sys Opt', 'Quit'];
      const colors = ['#AADDFF', '#AADDFF', '#AADDFF', '#FF8888'];
      labels.forEach((label, i) => {
        canvas.drawText({ text: label, color: colors[i], x: this.x + 12, y: this.y + 22 + i * 30, fontSize: 11 });
      });
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  },
};

export default UIGameMenu;
