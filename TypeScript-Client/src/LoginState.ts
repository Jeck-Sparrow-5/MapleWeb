import StateManager from "./StateManager";
import MapState from "./MapState";
import MapleMap from "./MapleMap";
import MyCharacter from "./MyCharacter";
import Camera, { CameraInterface } from "./Camera";
import UILogin from "./UI/UILogin";
import UIState from './UIState';
import GameCanvas from "./GameCanvas";

export enum LoginSubState {
  LOGIN_SCREEN        = 'LOGIN_SCREEN',
  WORLD_SELECT        = 'WORLD_SELECT',
  CHARACTER_SELECT    = 'CHARACTER_SELECT',
  RACE_SELECT         = 'RACE_SELECT',
  CHARACTER_CREATION  = 'CHARACTER_CREATION',  // Explorer
  CYGNUS_CREATION     = 'CYGNUS_CREATION',
  ARAN_CREATION       = 'ARAN_CREATION',
}

// Camera positions: bg_y - 344 offset (verified against original working values)
// back/0 y=-615  → World Select      (-615 - 299 = -914)
// back/1 y=-1200 → Char Select       (-1200 - 344 = -1544)
// back/2 y=-1800 → Race Select       (-1800 - 344 = -2144)
// back/3 y=-2399 → Cygnus Creation   (-2399 - 344 = -2743)
// back/4  y=-2999 → Explorer Creation (-2999 - 344 = -3343)
// back/19 y=-3600 → Aran Creation     (-3600 - 344 = -3944)
const LOGIN_CAMERA_POSITIONS: Record<string, { x: number; y: number }> = {
  [LoginSubState.LOGIN_SCREEN]:       { x: -372, y: -308  },
  [LoginSubState.WORLD_SELECT]:       { x: -372, y: -914  },
  [LoginSubState.CHARACTER_SELECT]:   { x: -372, y: -1544 },
  [LoginSubState.RACE_SELECT]:        { x: -372, y: -2110 },
  [LoginSubState.CHARACTER_CREATION]: { x: -372, y: -3300 },
  [LoginSubState.CYGNUS_CREATION]:    { x: -372, y: -2700 },
  [LoginSubState.ARAN_CREATION]:      { x: -372, y: -3930 },
};

interface LoginState extends UIState {
  currentSubState: LoginSubState;
  switchToSubState: (subState: LoginSubState) => Promise<void>;
  enterGame: () => Promise<void>;
}

const LoginState: LoginState = {
  currentSubState: LoginSubState.LOGIN_SCREEN,

  async initialize(canvas?: GameCanvas): Promise<void> {
    MyCharacter.deactivate();
    await MapleMap.load("MapLogin");

    const initialPos = LOGIN_CAMERA_POSITIONS[LoginSubState.LOGIN_SCREEN];
    Camera.setTopLeft(initialPos.x, initialPos.y);

    this.currentSubState = LoginSubState.LOGIN_SCREEN;
    await UILogin.initialize(canvas!);
  },

  async switchToSubState(subState: LoginSubState): Promise<void> {
    const previousState = this.currentSubState;
    this.currentSubState = subState;

    if (subState !== LoginSubState.LOGIN_SCREEN) {
      UILogin.removeInputs();
    } else {
      UILogin.placeInputs();
      UILogin.viewAllCharacterButton.isHidden = true;
      UILogin.channelBackButton.isHidden = true;
    }

    if (subState === LoginSubState.WORLD_SELECT) {
      UILogin.resetWorld();
      UILogin.createWorldButtons();
      UILogin.startSelectWorldChannelImgSlideIn();
      UILogin.viewAllCharacterButton.isHidden = false;
      UILogin.channelBackButton.isHidden = false;
    }
    if (previousState === LoginSubState.WORLD_SELECT) {
      UILogin.startSelectWorldChannelImgFadeOut();
    }

    if (subState === LoginSubState.CHARACTER_SELECT) {
      UILogin.startSelectCharacterImgSlideIn();
      UILogin.startSelectedWorldSlideIn();
    }
    if (previousState === LoginSubState.CHARACTER_SELECT &&
        subState !== LoginSubState.RACE_SELECT &&
        subState !== LoginSubState.CHARACTER_CREATION) {
      UILogin.startSelectCharacterImgFadeOut();
      UILogin.selectedWorldImageAnimation.active = false;
    }

    const newPos = LOGIN_CAMERA_POSITIONS[subState];
    if (newPos) {
      Camera.setTopLeft(newPos.x, newPos.y);
      Camera.update();
    }
  },

  doUpdate(msPerTick: number, camera: CameraInterface, canvas: GameCanvas): void {
    if (MapleMap.doneLoading) {
      MapleMap.update(msPerTick);
      UILogin.doUpdate(msPerTick, camera, canvas);
    }
  },

  doRender(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number): void {
    if (MapleMap.doneLoading) {
      MapleMap.render(canvas, camera, lag, msPerTick, tdelta);
      UILogin.doRender(canvas, camera, lag, msPerTick, tdelta);
    }
  },

  async enterGame(): Promise<void> {
    UILogin.removeInputs();
    await StateManager.setState(MapState);
    MapleMap.PlayerCharacter = MyCharacter;
  },
};

export default LoginState;
