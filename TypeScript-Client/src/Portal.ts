import { CameraInterface } from "./Camera";
import GameCanvas from "./GameCanvas";
import WZManager from "./wz-utils/WZManager";
import WZNode from "./wz-utils/WZNode";

class Portal {
  isNormalPortal = false;
  wzNode: any;
  name: string = "";
  type: number = 0;
  x: number = 0;
  y: number = 0;
  toMap: number = 0;
  toName: string = "";
  image: string = "";
  frames: any = null;
  frame: number = 0;
  delay: number = 0;
  nextDelay: number = 0;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  static async fromWzNode(wzNode: WZNode) {
    const portal = new Portal(wzNode);
    await portal.load();
    return portal;
  }
  constructor(wzNode: WZNode) {
    this.wzNode = wzNode;
  }
  async load() {
    const wzNode = this.wzNode;

    this.name = wzNode.pn.nValue;
    this.type = wzNode.pt.nValue;
    this.x = wzNode.x.nValue;
    this.y = wzNode.y.nValue;
    this.toMap = wzNode.tm.nValue;
    this.toName = wzNode.tn.nValue;

    this.image = wzNode.nGet("image").nGet("nValue", "default");

    const basePath = "Map.wz/MapHelper.img/portal/game";
    switch (this.type) {
      case 0: {
        // spawnpoint, don't draw
        break;
      }
      case 1: {
        // invisible, don't draw
        break;
      }
      case 2: {
        // regular
        const spritePath = `${basePath}/pv`;
        const spriteNode: any = await WZManager.get(spritePath);

        this.frames = spriteNode.nChildren;

        this.isNormalPortal = true;
        break;
      }
      case 3: {
        // touch, don't draw
        break;
      }
      case 4: {
        // GM event
        const spritePath = `${basePath}/pv`;
        const spriteNode: any = await WZManager.get(spritePath);

        this.frames = spriteNode.nChildren;
        break;
      }
      case 5: {
        // PQ stage onclear, don't draw
        break;
      }
      case 6: {
        // door, don't draw
        break;
      }
      case 7: {
        // scripted
        const spritePath = `${basePath}/pv`;
        const spriteNode: any = await WZManager.get(spritePath);

        this.frames = spriteNode.nChildren;
        break;
      }
      case 8: {
        // scripted+invisible, don't draw
        break;
      }
      case 9: {
        // scripted+touch, don't draw
        break;
      }
      case 10: {
        // hidden
        const spritePath = `${basePath}/ph/default/portalContinue`;
        const spriteNode: any = await WZManager.get(spritePath);

        this.frames = spriteNode.nChildren;
        break;
      }
      case 11: {
        // scripted+hidden
        const spritePath = `${basePath}/psh/${this.image}/portalContinue`;
        const spriteNode: any = await WZManager.get(spritePath);

        this.frames = spriteNode.nChildren;
        break;
      }
    }

    this.setFrame(0);
  }

  setFrame(frame = 0, carryOverDelay = 0) {
    if (!this.frames) {
      return;
    }

    this.frame = !this.frames[frame] ? 0 : frame;
    this.delay = carryOverDelay;
    this.nextDelay = this.frames[this.frame].nGet("delay").nGet("nValue", 100);
  }
  update(msPerTick: number) {
    if (!this.frames) {
      return;
    }

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
    if (!this.frames) {
      return;
    }

    const currentFrame = this.frames[this.frame];
    const currentImage = currentFrame.nGetImage();

    const originX = currentFrame.nGet("origin").nGet("nX", 0);
    const originY = currentFrame.nGet("origin").nGet("nY", 0);
    this.rect = {
      x: this.x - originX,
      y: this.y - originY,
      width: currentImage.width,
      height: currentImage.height,
    };
    canvas.drawImage({
      img: currentImage,
      dx: this.x - camera.x - originX,
      dy: this.y - camera.y - originY,
    });
  }
}

export default Portal;
