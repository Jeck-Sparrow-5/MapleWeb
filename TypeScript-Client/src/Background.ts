import { CameraInterface } from "./Camera";
import GameCanvas from "./GameCanvas";
import config from "./Config";
import WZManager from "./wz-utils/WZManager";

class Background {
  wzNode: any;
  ani: boolean = false;
  frames: any[] = [];
  frame: number = 0;
  delay: number = 0;
  nextDelay: number = 0;
  x: number = 0;
  y: number = 0;
  z: number = 0;
  rx: number = 0;
  ry: number = 0;
  cx: number = 0;
  cy: number = 0;
  type: number = 0;
  a: number = 0;
  front: number = 0;
  flipped: boolean = false;
  tileX: boolean = false;
  tileY: boolean = false;
  velocityX: number = 0;
  velocityY: number = 0;

  static async fromWzNode(wzNode: any) {
    const bg = new Background(wzNode);
    await bg.load();
    return bg;
  }
  constructor(wzNode: any) {
    this.wzNode = wzNode;
  }
  async load() {
    const wzNode = this.wzNode;

    this.ani = wzNode.nGet("ani").nGet("nValue", 0);

    const bS = wzNode.bS.nValue;
    const no = wzNode.no.nValue;
    const backFile: any = await WZManager.get(`Map.wz/Back/${bS}.img`);
    const spriteNode = backFile[!this.ani ? "back" : "ani"][no];

    if (!this.ani) {
      this.frames = [spriteNode];
    } else {
      this.frames = [];
      spriteNode.nChildren.forEach((frame: any) => {
        if (frame.nTagName === "canvas" || frame.nTagName === "uol") {
          const Frame = frame.nTagName === "uol" ? frame.nResolveUOL() : frame;
          this.frames.push(Frame);
        } else {
          console.log(`Unhandled frame=${frame.nTagName} for cls=Background`);
        }
      });
    }

    this.setFrame(0);

    this.x = wzNode.x.nValue;
    this.y = wzNode.y.nValue;
    this.z = parseInt(wzNode.nName);
    this.rx = wzNode.rx.nValue;
    this.ry = wzNode.ry.nValue;
    this.cx = wzNode.cx.nValue;
    this.cy = wzNode.cy.nValue;
    this.type = wzNode.type.nValue;
    this.a = wzNode.a.nValue;
    this.front = wzNode.nGet("front").nGet("nValue", 0);
    this.flipped = wzNode.nGet("f").nGet("nValue", 0);

    this.tileX = false;
    this.tileY = false;
    switch (this.type) {
      case 1: {
      }
      case 4: {
        this.tileX = true;
        break;
      }
      case 2: {
      }
      case 5: {
        this.tileY = true;
        break;
      }
      case 3: {
      }
      case 6: {
      }
      case 7: {
        this.tileX = true;
        this.tileY = true;
        break;
      }
    }

    this.velocityX = 0;
    this.velocityY = 0;
    switch (this.type) {
      case 4: {
      }
      case 6: {
        this.velocityX = this.rx;
        break;
      }
      case 5: {
      }
      case 7: {
        this.velocityY = this.ry;
        break;
      }
    }
  }
  setFrame(frame = 0, carryOverDelay = 0) {
    this.frame = !this.frames[frame] ? 0 : frame;

    this.delay = carryOverDelay;
    this.nextDelay = this.frames[this.frame].nGet("delay").nGet("nValue", 100);
  }
  update(msPerTick: number) {
    this.delay += msPerTick;
    if (this.delay > this.nextDelay) {
      this.setFrame(this.frame + 1, this.delay - this.nextDelay);
    }
  }
  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    const firstFrame = this.frames[0];
    const currentFrame = this.frames[this.frame];
    const currentImage = currentFrame.nGetImage();
    let dx = this.x;
    let dy = this.y;

    if (this.velocityX !== 0) {
      dx += (tdelta * this.rx) / 200 - camera.x;
    } else {
      const wOffset = config.width / 2;
      const shiftX = (this.rx * (camera.x + wOffset)) / 100 + wOffset;
      dx += shiftX;
    }

    if (this.velocityY !== 0) {
      dy += (tdelta * this.ry) / 200 - camera.y;
    } else {
      const hOffset = config.height / 2;
      const shiftY = (this.ry * (camera.y + hOffset)) / 100 + hOffset;
      dy += shiftY;
    }

    const width = currentFrame.nWidth;
    const height = currentFrame.nHeight;
    const cx = this.cx || width;
    const cy = this.cy || height;
    const originX = currentFrame.nGet("origin").nGet("nX", 0);
    const originY = currentFrame.nGet("origin").nGet("nY", 0);

    dx = Math.floor(dx);
    dy = Math.floor(dy);
    dx -= !this.flipped ? originX : width - originX;
    dy -= originY;

    const moveType = firstFrame.nGet("moveType").nGet("nValue", 0);
    const moveW = firstFrame.nGet("moveW").nGet("nValue", 0);
    const moveH = firstFrame.nGet("moveH").nGet("nValue", 0);
    const moveP = firstFrame.nGet("moveP").nGet("nValue", Math.PI * 2 * 1000);
    switch (moveType) {
      case 1: {
        dx += moveW * Math.sin((Math.PI * 2 * tdelta) / moveP);
        break;
      }
      case 2: {
        dy += moveH * Math.sin((Math.PI * 2 * tdelta) / moveP);
        break;
      }
      case 3: {
        dx += moveW * Math.cos((Math.PI * 2 * tdelta) / moveP);
        dy += moveH * Math.sin((Math.PI * 2 * tdelta) / moveP);
        break;
      }
    }

    const moveR = firstFrame.nGet("moveR").nGet("nValue", 0);
    const angle = moveR === 0 ? 0 : ((tdelta * 360) / moveR) % 360;

    let a0 = 1;
    let a1 = 1;
    if (!!this.ani && ("a0" in currentFrame || "a1" in currentFrame)) {
      a0 = currentFrame.nGet("a0").nGet("nValue", 0) / 255;
      a1 = currentFrame.nGet("a1").nGet("nValue", 255) / 255;
    }
    const percent = this.delay / this.nextDelay;
    const alpha = percent * a1 + (1 - percent) * a0;

    let xBegin = dx;
    let xEnd = dx;
    let yBegin = dy;
    let yEnd = dy;

    if (!!this.tileX) {
      xBegin += width;
      xBegin %= cx;
      if (xBegin <= 0) {
        xBegin += cx;
      }
      xBegin -= width;

      xEnd -= config.width;
      xEnd %= cx;
      if (xEnd >= 0) {
        xEnd -= cx;
      }
      xEnd += config.width;
    }

    if (!!this.tileY) {
      yBegin += height;
      yBegin %= cy;
      if (yBegin <= 0) {
        yBegin += cy;
      }
      yBegin -= height;

      yEnd -= config.height;
      yEnd %= cy;
      if (yEnd >= 0) {
        yEnd -= cy;
      }
      yEnd += config.height;
    }

    for (dx = Math.floor(xBegin); dx <= xEnd; dx += cx) {
      for (dy = Math.floor(yBegin); dy <= yEnd; dy += cy) {
        canvas.drawImage({
          img: currentImage,
          flipped: !!this.flipped,
          alpha,
          angle,
          dx,
          dy,
        });
      }
    }
  }
}

export default Background;
