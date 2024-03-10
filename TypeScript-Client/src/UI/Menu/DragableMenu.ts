import { CameraInterface } from "../../Camera";
import { Position } from "../../Effects/DamageIndicator";

class DragableMenu {
  x: number;
  y: number;
  isHidden: boolean;

  constructor(opts: any) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.isHidden = opts.isHidden || 0;
  }

  moveTo(position: Position) {
    this.x = position.x;
    this.y = position.y;
  }

  getRect(camera: CameraInterface) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
  }
}

export default DragableMenu;
