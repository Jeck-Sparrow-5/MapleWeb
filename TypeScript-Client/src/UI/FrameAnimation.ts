import WZNode from '../wz-utils/WZNode';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';

export default class FrameAnimation {
  active: boolean = false;
  repeat: boolean = false;
  x: number;
  y: number;
  private isRelativeToCamera: boolean;
  private frame: number = 0;
  private readonly frames: any[] = [];
  private zigzag: boolean;
  private delay: number = 0;
  private nextDelay: number = 0;
  private wzNode: WZNode;

  constructor(wzNode: any, x: number, y: number, isRelativeToCamera = false, repeat = false) {
    this.wzNode = wzNode;
    this.isRelativeToCamera = isRelativeToCamera;
    this.repeat = repeat;
    const frameIds = [];
    for (const child of wzNode.nChildren) {
      const id = Number.parseInt(child.nName);
      if (Number.isNaN(id)) {
        continue;
      }
      frameIds.push(id);
    }

    this.frames = [];
    frameIds.forEach((id: number) => {
      this.frames.push(wzNode.nGet(id));
    });

    this.zigzag = wzNode.nGet('zigzag')?.nValue === '1';
    this.x = x;
    this.y = y;
    this.setFrame(0);
  }

  setFrame(frame = 0, carryOverDelay = 0) {
    this.frame = !this.frames[frame] ? 0 : frame;

    this.delay = carryOverDelay;
    this.nextDelay = this.frames[this.frame].nGet("delay").nGet("nValue", 100);
  }
  advanceFrame() {
    let nextFrame = this.frame + 1;
    const finishedLoop = !this.frames[nextFrame];
    const carryOverDelay = this.delay - this.nextDelay;

    if (!finishedLoop) {
      this.setFrame(nextFrame, carryOverDelay);
    } else if (this.repeat) {
      this.setFrame(0, carryOverDelay);
    } else {
      this.active = false;
    }
  }
  update(msPerTick: number) {
    this.delay += msPerTick;
    if (this.active && this.delay > this.nextDelay) {
      this.advanceFrame();
    }
  }
  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    // const firstFrame = this.frames[0];
    const currentFrame = this.frames[this.frame];
    const currentImage = currentFrame.nGetImage();
    let dx = this.x;
    let dy = this.y;

    if (this.isRelativeToCamera) {
      canvas.drawImage({
        img: currentImage,
        dx: dx,
        dy: dy,
      });
    } else {
      canvas.drawImage({
        img: currentImage,
        dx: dx - camera.x,
        dy: dy - camera.y,
      });
    }
  }

  reset() {
    this.setFrame(0);
  }
};
