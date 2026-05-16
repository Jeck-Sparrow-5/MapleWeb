import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import GenderPacket from '../Net/Packets/GenderPacket';
import UILoginLoading from './UILoginLoading';

interface UIGenderInterface {
  canvas: GameCanvas;
  bgImg: any;
  x: number;
  y: number;
  isFemale: boolean;
  buttons: MapleStanceButton[];
  isHidden: boolean;
  initialize: (canvas: GameCanvas) => Promise<void>;
  draw: (canvas: GameCanvas) => void;
  destroy: () => void;
  confirm: () => void;
}

const UIGender = {} as UIGenderInterface;

UIGender.initialize = async function (canvas: GameCanvas) {
  this.canvas = canvas;
  this.isFemale = false;
  this.isHidden = false;
  this.buttons = [];

  const loginImg = await NXManager.get('UI.wz/Login.img');
  const uiWindow = await NXManager.get('UI.wz/UIWindow.img');

  this.bgImg = loginImg.nGet('Gender')?.nGet('backgrnd')?.nGetImage();

  // Center the dialog (backgrnd is 362x219)
  this.x = Math.floor((800 - 362) / 2);
  this.y = Math.floor((600 - 219) / 2);

  const cx = this.x;
  const cy = this.y;

  // Male button (BtYes) at ~(cx+168, cy+170)
  const maleBtn = new MapleStanceButton(canvas, {
    x: cx + 168,
    y: cy + 170,
    img: uiWindow.nGet('BtYes')?.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      this.isFemale = false;
      this.confirm();
    },
  });
  ClickManager.addButton(maleBtn);
  this.buttons.push(maleBtn);

  // Female button (BtNo) at ~(cx+240, cy+170)
  const femaleBtn = new MapleStanceButton(canvas, {
    x: cx + 240,
    y: cy + 170,
    img: uiWindow.nGet('BtNo')?.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      this.isFemale = true;
      this.confirm();
    },
  });
  ClickManager.addButton(femaleBtn);
  this.buttons.push(femaleBtn);
};

(UIGender as any).confirm = async function () {
  this.destroy();
  UILoginLoading.fromOpts({ x: 280, y: 200, cancelHandler: () => {} });
  new GenderPacket(this.isFemale).dispatch();
};

UIGender.draw = function (canvas: GameCanvas) {
  if (this.isHidden) return;

  if (this.bgImg) {
    canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
  }

  canvas.drawText({
    text: 'Select your gender:',
    color: '#FFFFFF',
    x: this.x + 130,
    y: this.y + 120,
  });
  canvas.drawText({
    text: `► ${this.isFemale ? 'Female' : 'Male'}`,
    color: '#FFFF00',
    x: this.x + 140,
    y: this.y + 140,
  });

  // Draw buttons
  this.buttons.forEach((btn) => {
    btn.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0);
  });
};

UIGender.destroy = function () {
  this.buttons.forEach((btn) => ClickManager.removeButton(btn));
  this.buttons = [];
  this.isHidden = true;
};

export default UIGender;
