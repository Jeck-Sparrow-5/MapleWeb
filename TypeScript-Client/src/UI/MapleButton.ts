import { CameraInterface } from "../Camera";
import GameCanvas from "../GameCanvas";

class MapleButton {
  x: number = 0;
  y: number = 0;
  img: any = {};
  layer: number = 2;
  isHidden: boolean = false;
  hoverAudio: boolean = true;
  clickAudio: boolean = true;
  onClick: Function = function (self: MapleButton) {};
  onDraw: Function = function (
    canvas: GameCanvas,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number,
    self: MapleButton
  ) {};
  onUpdate: Function = function (msPerTick: number, self: MapleButton) {};
  opts: any = {};

  constructor(opts: any) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.img = opts.img || {};
    this.layer = opts.layer || 2;
    this.isHidden = opts.isHidden || false;
    this.hoverAudio = !(opts.hoverAudio === false);
    this.clickAudio = !(opts.clickAudio === false);
    this.onClick = opts.onClick || function () {};
    this.onDraw = function () {};
    this.onUpdate = function () {};
    this.opts = opts;
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
    this.onDraw(canvas, camera, lag, msPerTick, tdelta, this);
  }

  trigger() {
    this.onClick(this);
  }

  getRect(camera: CameraInterface) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }
}

export default MapleButton;
