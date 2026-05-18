import { CameraInterface } from "../Camera";
import GameCanvas from "../GameCanvas";
import MapleButton from "./MapleButton";

const BUTTON_STANCE = {
  NORMAL:     "normal",
  MOUSE_OVER: "mouseOver",
  PRESSED:    "pressed",
  DISABLED:   "disabled",
  SELECTED:   "selected",
};

class MapleStanceButton extends MapleButton {
  stance: string;
  stances: any;
  onUpdate: any;
  isRelativeToCamera: boolean;
  isPartOfUI: boolean;
  isHidden: boolean;
  isDisabled: boolean;

  constructor(canvas: GameCanvas | null, opts: any) {
    super(opts);
    this.stance = opts.stance || BUTTON_STANCE.NORMAL;
    this.stances = (this.img ?? []).reduce((stances: any, stance: any) => {
      const first = stance?.nChildren?.[0];
      if (!first) return stances;
      stances[stance.nName] = first.nTagName === 'vector' ? first.nParent : first;
      return stances;
    }, {});
    // Remap numeric stances (0/1/2/3) → named stances for buttons using numbered children
    if (!this.stances[BUTTON_STANCE.NORMAL]) {
      const map = ['normal', 'mouseOver', 'pressed', 'disabled'];
      map.forEach((name, i) => {
        if (this.stances[i] != null) this.stances[name] = this.stances[i];
      });
    }
    this.onUpdate = opts.onUpdate || function () {};
    this.isRelativeToCamera = opts.isRelativeToCamera || false;
    this.isPartOfUI = opts.isPartOfUI || false;
    this.isHidden = opts.isHidden || false;
    this.isDisabled = opts.isDisabled || false;
    // canvas.gameWrapper.appendChild(input);
  }

  update(msPerTick: number) {
    this.onUpdate(msPerTick, this);
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (!this.isHidden) {
      const activeStance = this.isDisabled && this.stances[BUTTON_STANCE.DISABLED]
        ? BUTTON_STANCE.DISABLED
        : this.stance;
      const currentFrame = this.stances[activeStance]
                        ?? this.stances[BUTTON_STANCE.NORMAL]
                        ?? (Object.values(this.stances)[0] as any);
      const currentImage = currentFrame?.nGetImage?.();
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
    const frame = this.stances[BUTTON_STANCE.NORMAL]
                ?? this.stances[this.stance]
                ?? Object.values(this.stances)[0] as any;
    if (!frame) return { x: 0, y: 0, width: 0, height: 0 };
    const buttonImage = frame.nGetImage();
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
