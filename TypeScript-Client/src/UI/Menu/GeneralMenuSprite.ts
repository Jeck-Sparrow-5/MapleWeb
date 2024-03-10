import { CameraInterface } from "../../Camera";
import GameCanvas from "../../GameCanvas";

class GeneralMenuSprite {
  opts: any;
  wzImage: any = {};
  x: number = 0;
  y: number = 0;
  z: number = 0;
  delay: number = 0;
  destroyed: boolean = false;

  static async fromOpts(opts: any) {
    const object = new GeneralMenuSprite(opts);
    await object.load();
    return object;
  }
  constructor(opts: any) {
    this.opts = opts;
  }
  async load() {
    const opts = this.opts;
    this.wzImage = opts.wzImage;
    this.x = opts.x;
    this.y = opts.y;
    this.z = opts.z;
  }

  destroy() {
    this.destroyed = true;
  }

  update(msPerTick: number) {
    this.delay += msPerTick;
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    console.log();
    let image = this.wzImage.nGetImage();
    canvas.drawImage({
      img: image,
      dx: this.x,
      dy: this.y,
    });
  }
}

export default GeneralMenuSprite;
