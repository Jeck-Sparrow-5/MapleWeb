import Timer from "./Timer";
import Camera, { CameraInterface } from "./Camera";
import StateManager from "./StateManager";
import config from "./Config";
import GameCanvas from "./GameCanvas";

class GameLoop {
  fps = 60;
  msPerTick = 1000 / this.fps;
  lag = 0;
  gameCanvas: GameCanvas;

  constructor(gameCanvas: GameCanvas) {
    this.gameCanvas = gameCanvas;
  }

  doUpdate(msPerTick: number, camera: CameraInterface, canvas: GameCanvas) {
    StateManager.doUpdate(msPerTick, camera, canvas);
  }

  doRender(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    canvas.drawRect({
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
      color: "#000000",
    });
    StateManager.doRender(canvas, camera, lag, msPerTick, tdelta);
  }

  postRender(canvas: GameCanvas) {
    canvas.resetMousewheel();
  }

  gameLoop(highResTimestamp: number = 0) {
    requestAnimationFrame(() => this.gameLoop());

    Timer.update();
    this.lag += Timer.delta;
    while (this.lag >= this.msPerTick) {
      this.lag -= this.msPerTick;
      Timer.tdelta += this.msPerTick;
      // TODO: fix ordering of these variables
      this.doUpdate(this.msPerTick, Camera, this.gameCanvas);
    }
    this.doRender(
      this.gameCanvas,
      Camera,
      this.lag,
      this.msPerTick,
      Timer.tdelta
    );
    this.postRender(this.gameCanvas);
  }
}

export default GameLoop;
