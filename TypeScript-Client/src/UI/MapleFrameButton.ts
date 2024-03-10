import { CameraInterface } from "../Camera";
import GameCanvas from "../GameCanvas";
import MapleButton from "./MapleButton";

class MapleFrameButton extends MapleButton {
  frame: number;
  delay: number;
  endFrame: number;
  onEndFrame: Function;
  canClick: boolean;
  canUpdate: boolean;

  constructor(opts: any) {
    super(opts);
    this.canClick = true;
    this.canUpdate = false;
    this.frame = opts.frame || 0;
    this.delay = opts.delay || 100;
    this.endFrame = opts.endFrame || this.img.length;
    this.onEndFrame = opts.onEndFrame || function () {};
    // todo
    // this.onDraw =
    //   opts.onDraw ||
    //   function (canvas: GameCanvas, camera: CameraInterface) {
    //     // const currentFrame = this.img[this.frame];
    //     // const currentImage = currentFrame.nGetImage();
    //     // DRAW_IMAGE({
    //     //   img: currentImage,
    //     //   dx: this.x - camera.x - currentFrame.origin.nX,
    //     //   dy: this.y - camera.y - currentFrame.origin.nY,
    //     // });
    //   };

    const delay = this.delay;
    this.onUpdate =
      opts.onUpdate ||
      function (msPerTick: number, self: MapleFrameButton) {
        if (self.canUpdate) {
          self.delay -= msPerTick;
          if (self.delay <= 0) {
            self.frame += 1;
            self.delay = delay - self.delay;
          }
          const isDone = self.frame === self.endFrame;
          if (isDone) {
            self.frame = 0;
            self.delay = delay;
            self.canUpdate = false;
            self.canClick = true;
            self.onEndFrame(self);
          }
        }
      };
  }

  getRect(camera: CameraInterface) {
    const frame = this.img[0];
    const image = frame.nGetImage();
    return {
      x: this.x - camera.x - frame.origin.nX,
      y: this.y - camera.y - frame.origin.nY,
      width: image.width,
      height: image.height,
    };
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number
  ) {
    if (!this.isHidden) {
      const currentFrame = this.img[this.frame];
      const currentImage = currentFrame.nGetImage();
      canvas.drawImage({
        img: currentImage,
        dx: this.x - camera.x - currentFrame.origin.nX,
        dy: this.y - camera.y - currentFrame.origin.nY,
      });
    }
  }
}

export default MapleFrameButton;
