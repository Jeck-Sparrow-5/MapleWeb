import MapleButton from './MapleButton';
import WZManager from '../wz-utils/WZManager';
import ClickManager from './ClickManager';
import {MapleStanceButton} from './MapleStanceButton';
import GameCanvas from '../GameCanvas';
import {CameraInterface} from '../Camera';
import FrameAnimation from './FrameAnimation';

export default class UILoginLoading {
  private uiLoginLoading: any = null;
  private barAnimation: FrameAnimation | null = null;
  opts: any;
  x: number = 0;
  y: number = 0;
  isHidden: boolean;
  buttons: MapleButton[];
  cancelHandler: (() => void) | null = null;

  static async fromOpts(opts: any) {
    const object = new UILoginLoading(opts);
    await object.load();
    return object;
  }

  constructor(opts: any) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.isHidden = typeof opts.isHidden !== 'undefined' ? opts.isHidden : true;
    this.cancelHandler = typeof opts.cancelHandler === 'function' ? opts.cancelHandler : null;
    this.opts = opts;
    this.buttons = [];
  }

  async load() {
    const opts = this.opts;
    this.x = opts.x;
    this.y = opts.y;

    this.uiLoginLoading = await WZManager.get('UI.wz/Login.img/Notice/Loading');
    this.barAnimation = new FrameAnimation(this.uiLoginLoading.bar, this.x + 130, this.y + 98, true, true);
    this.loadButtons();
  }

  loadButtons() {
    this.buttons.forEach((button) => {
      ClickManager.removeButton(button);
    });
    this.buttons = [];
    const cancelButton = new MapleStanceButton(null, {
      x: this.x + 190,
      y: this.y + 40,
      isRelativeToCamera: true,
      isPartOfUI: true,
      img: this.uiLoginLoading.BtCancel.nChildren,
      onClick: () => {
        typeof this.cancelHandler === 'function' && this.cancelHandler();
      },
    });
    this.buttons.push(cancelButton);
    this.buttons.forEach((button) => {
      ClickManager.addButton(button);
    });
  }

  update(msPerTick: number) {
    this.barAnimation?.update(msPerTick);
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
      img: this.uiLoginLoading.backgrnd.nGetImage(),
      dx: this.x,
      dy: this.y,
    });

    this.barAnimation?.draw(canvas, camera, lag, msPerTick, tdelta);

    this.buttons.forEach((obj) => {
      obj.draw(canvas, camera, lag, msPerTick, tdelta);
    });
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach((button) => {
      button.isHidden = isHidden;
    });
    if (!isHidden) {
      if (this.barAnimation) {
        this.barAnimation.reset();
        this.barAnimation.active = true;
      }
    }
  }
}
