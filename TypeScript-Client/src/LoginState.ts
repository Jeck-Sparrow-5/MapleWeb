import StateManager from "./StateManager";
import MapState from "./MapState";
import MapleMap from "./MapleMap";
import MyCharacter from "./MyCharacter";
import Camera, { CameraInterface } from "./Camera";
import UILogin from "./UI/UILogin";
import GameCanvas from "./GameCanvas";

interface LoginState {
  initialize: (canvas: GameCanvas) => Promise<void>;
  doUpdate: (
    msPerTick: number,
    camera: CameraInterface,
    canvas: GameCanvas
  ) => void;
  doRender: (
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
  enterGame: () => Promise<void>;
}

const LoginState: LoginState = {
  async initialize(canvas: GameCanvas): Promise<void> {
    MyCharacter.deactivate();
    await MapleMap.load("MapLogin");
    await UILogin.initialize(canvas);

    Camera.x = -372;
    Camera.y = -308;
  },

  doUpdate(
    msPerTick: number,
    camera: CameraInterface,
    canvas: GameCanvas
  ): void {
    if (MapleMap.doneLoading) {
      MapleMap.update(msPerTick);

      UILogin.doUpdate(msPerTick, camera, canvas);
    }
  },

  doRender(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ): void {
    if (MapleMap.doneLoading) {
      MapleMap.render(canvas, camera, lag, msPerTick, tdelta);
      UILogin.doRender(canvas, camera, lag, msPerTick, tdelta);
    }
  },

  async enterGame(): Promise<void> {
    UILogin.removeInputs();
    await StateManager.setMapState(MapState);
  },
};

export default LoginState;
