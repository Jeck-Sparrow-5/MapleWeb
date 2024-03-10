import { CameraInterface } from "../Camera";
import GameCanvas from "../GameCanvas";
import MapleButton from "./MapleButton";

const BUTTON_STANCE = {
  NORMAL: "normal",
  MOUSE_OVER: "mouseOver",
  PRESSED: "pressed",
};

class MapleStanceButton extends MapleButton {
  stance: string;
  stances: any;
  onUpdate: any;
  isRelativeToCamera: boolean;
  isPartOfUI: boolean;
  isHidden: boolean;

  constructor(canvas: GameCanvas, opts: any) {
    super(opts);
    this.stance = opts.stance || BUTTON_STANCE.NORMAL;
    this.stances = this.img.reduce((stances: any, stance: any) => {
      stances[stance.nName] = stance.nChildren[0];
      return stances;
    }, {});
    this.onUpdate = opts.onUpdate || function () {};
    this.isRelativeToCamera = opts.isRelativeToCamera || false;
    this.isPartOfUI = opts.isPartOfUI || false;
    this.isHidden = opts.isHidden || false;
    // canvas.gameWrapper.appendChild(input);
  }

  update(msPerTick: number) {
    this.onUpdate(msPerTick, this);
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number
  ) {
    if (!this.isHidden) {
      const currentFrame = this.stances[this.stance];
      const currentImage = currentFrame.nGetImage();
      if (this.isRelativeToCamera) {
        canvas.drawImage({
          img: currentImage,
          dx: this.x,
          dy: this.y,
        });
      } else {
        canvas.drawImage({
          img: currentImage,
          dx: this.x - camera.x,
          dy: this.y - camera.y,
        });
      }
    }
  }

  getRect(camera: CameraInterface) {
    const buttonImage = this.stances[BUTTON_STANCE.NORMAL].nGetImage();
    if (this.isPartOfUI) {
      return {
        x: this.x,
        y: this.y,
        width: buttonImage.width,
        height: buttonImage.height,
      };
    }
    return {
      x: this.x - camera.x,
      y: this.y - camera.y,
      width: buttonImage.width,
      height: buttonImage.height,
    };
  }
}

export { MapleStanceButton, BUTTON_STANCE };
