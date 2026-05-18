import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import StateManager from '../StateManager';
import LoginState from '../LoginState';
import SessionManager from '../SessionManager';
import config from '../Config';

interface UIQuitInterface {
  isHidden: boolean;
  buttons: MapleStanceButton[];
  initialize: (canvas: GameCanvas) => Promise<void>;
  show: () => void;
  hide: () => void;
  draw: (canvas: GameCanvas) => void;
}

const UIQuit = {} as UIQuitInterface;

UIQuit.initialize = async function (canvas: GameCanvas) {
  this.isHidden = true;
  this.buttons = [];

  const uiWindow = await NXManager.get('UI.wz/UIWindow.img');

  // Yes: confirm logout
  const yesBtn = new MapleStanceButton(canvas, {
    x: Math.floor(config.originalWidth / 2) - 60,
    y: Math.floor(config.originalHeight / 2) + 30,
    img: uiWindow.nGet('BtQYes')?.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: async () => {
      this.hide();
      SessionManager.disconnect();
      await StateManager.setState(LoginState, canvas);
    },
  });
  ClickManager.addButton(yesBtn);
  this.buttons.push(yesBtn);

  // No: cancel
  const noBtn = new MapleStanceButton(canvas, {
    x: Math.floor(config.originalWidth / 2) + 10,
    y: Math.floor(config.originalHeight / 2) + 30,
    img: uiWindow.nGet('BtQNo')?.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      this.hide();
    },
  });
  ClickManager.addButton(noBtn);
  this.buttons.push(noBtn);
};

UIQuit.show = function () {
  this.isHidden = false;
  this.buttons.forEach((b) => (b.isHidden = false));
};

UIQuit.hide = function () {
  this.isHidden = true;
  this.buttons.forEach((b) => (b.isHidden = true));
};

UIQuit.draw = function (canvas: GameCanvas) {
  if (this.isHidden) return;

  const cx = config.originalWidth / 2;
  const cy = config.originalHeight / 2;
  const w = 300;
  const h = 120;

  canvas.drawRect({ x: cx - w / 2, y: cy - h / 2, width: w, height: h, color: '#000000', alpha: 0.75, strokeColor: '#888888', strokeWidth: 1 });

  canvas.drawText({ text: 'Are you sure you want to quit?', color: '#FFFFFF', x: cx - 110, y: cy - 15 });
  canvas.drawText({ text: 'You will be returned to the login screen.', color: '#AAAAAA', x: cx - 125, y: cy + 5 });

  this.buttons.forEach((btn) => btn.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
};

export default UIQuit;
