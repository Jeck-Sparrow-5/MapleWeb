// todo
// import ClickManager from "./UI/ClickManager";

import GameCanvas from "./GameCanvas";
import LoginState from "./LoginState";
import { MapState } from "./MapState";
import ClickManager from "./UI/ClickManager";

interface StateManager {
  currentState: any; // Replace 'any' with the actual type of your state if possible
  transitioning: boolean;
  initialize: () => void;
  // setState: (state: any, canvas: GameCanvas) => Promise<void>; // Replace 'any' with the actual type of your state if possible
  setLoginState: (state: LoginState, canvas: GameCanvas) => Promise<void>;
  setMapState: (state: MapState) => Promise<void>;
  doUpdate: (msPerTick: number, camera: any, canvas: GameCanvas) => void; // Replace 'any' with the actual type of your camera if possible
  doRender: (
    canvas: GameCanvas,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void; // Replace 'any' with the actual type of your camera if possible
}

const StateManager: StateManager = {
  currentState: undefined,
  transitioning: false,

  initialize() {
    this.currentState = undefined;
    this.transitioning = false;
  },

  async setLoginState(state: LoginState, canvas: GameCanvas): Promise<void> {
    this.transitioning = true;
    await state.initialize(canvas);
    this.currentState = state;
    this.transitioning = false;
  },

  async setMapState(state: MapState): Promise<void> {
    this.transitioning = true;
    await state.initialize();
    this.currentState = state;
    this.transitioning = false;
  },

  // async setState(state: MapState | LoginState, canvas: GameCanvas) {
  //   this.transitioning = true;
  //   // todo:
  //   // ClickManager.clearButton();
  //   if (state === LoginState) {
  //     await state.initialize(canvas);
  //   } else {
  //     await state.initialize();
  //   }
  //   this.currentState = state;
  //   this.transitioning = false;
  // },

  doUpdate(msPerTick, camera, canvas) {
    if (!this.transitioning && this.currentState) {
      this.currentState.doUpdate(msPerTick, camera, canvas);
    }
  },

  doRender(canvas, camera, lag, msPerTick, tdelta) {
    if (!this.transitioning && this.currentState) {
      this.currentState.doRender(canvas, camera, lag, msPerTick, tdelta);
      ClickManager.doUpdate(msPerTick, camera);
    }
  },
};

export default StateManager;
