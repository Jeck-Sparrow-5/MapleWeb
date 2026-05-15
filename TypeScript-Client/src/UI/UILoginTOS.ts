import MapleButton from './MapleButton';
import WZManager from '../wz-utils/WZManager';
import ClickManager from './ClickManager';
import {MapleStanceButton} from './MapleStanceButton';
import GameCanvas from '../GameCanvas';
import {CameraInterface} from '../Camera';

export default class UILoginTOS {
  private uiLoginTOS: any = null;
  private uiLoginBtOk: any = null;
  private uiLoginBtCancel: any = null;
  private stringEULA: any = null;
  opts: any;
  x: number = 0;
  y: number = 0;
  isHidden: boolean;
  buttons: MapleButton[];
  okHandler: (() => void) | null = null;
  cancelHandler: (() => void) | null = null;

  static async fromOpts(opts: any) {
    const object = new UILoginTOS(opts);
    await object.load();
    return object;
  }

  constructor(opts: any) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.isHidden = typeof opts.isHidden !== 'undefined' ? opts.isHidden : true;
    this.okHandler = opts.okHandler || null;
    this.cancelHandler = opts.cancelHandler || null;
    this.opts = opts;
    this.buttons = [];
  }

  async load() {
    const opts = this.opts;
    this.x = opts.x;
    this.y = opts.y;

    this.uiLoginTOS = await WZManager.get('UI.wz/Login.img/TOS');
    this.uiLoginBtOk = await WZManager.get('UI.wz/Login.img/BtOk');
    this.uiLoginBtCancel = await WZManager.get('UI.wz/Login.img/BtCancel');
    this.stringEULA = await WZManager.get('String.wz/EULA.img/EULA');
    this.loadButtons();
  }

  loadButtons() {
    this.buttons.forEach((button) => {
      ClickManager.removeButton(button);
    });
    this.buttons = [];
    const okButton = new MapleStanceButton(null, {
      x: this.x + 265,
      y: this.y + 374,
      isRelativeToCamera: true,
      isPartOfUI: true,
      img: this.uiLoginBtOk?.nChildren ?? [],
      onClick: () => {
        this.setIsHidden(true);
        typeof this.okHandler === 'function' && this.okHandler();
      },
    });
    this.buttons.push(okButton);
    const cancelButton = new MapleStanceButton(null, {
      x: this.x + 340,
      y: this.y + 374,
      isRelativeToCamera: true,
      isPartOfUI: true,
      img: this.uiLoginBtCancel?.nChildren ?? [],
      onClick: () => {
        this.setIsHidden(true);
      },
    });
    this.buttons.push(cancelButton);
    this.buttons.forEach((button) => {
      ClickManager.addButton(button);
    });
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (this.isHidden) {
      return;
    }
    canvas.drawImage({
      img: this.uiLoginTOS.nGet('0')?.nGetImage(),
      dx: this.x,
      dy: this.y,
    });

    this.buttons.forEach((obj) => {
      obj.draw(canvas, camera, lag, msPerTick, tdelta);
    });
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach((button) => {
      button.isHidden = isHidden;
    });
  }
}
