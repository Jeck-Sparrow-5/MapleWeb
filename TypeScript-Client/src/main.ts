import "./style.css";

import GameLoop from "./Gameloop";
import Timer from "./Timer";
import WZManager from "./wz-utils/WZManager";
import Camera from "./Camera";
// import MySocket from "./mysocket";
import StateManager from "./StateManager";
import LoginState from "./LoginState";
import MyCharacter from "./MyCharacter";
import GameCanvas from "./GameCanvas";
import ClickManager from "./UI/ClickManager";

import config from "./Config";

const startGame = async () => {
  const gameWrapper = document.getElementById("game-wrapper");
  const canvas: GameCanvas = new GameCanvas(gameWrapper!);

  canvas.drawRect({
    x: 0,
    y: 0,
    width: config.width,
    height: config.height,
    color: "#000000",
  });
  gameWrapper!.style.cursor = "none";
  StateManager.initialize();
  ClickManager.initialize(canvas);
  WZManager.initialize();
  Camera.initialize();
  Timer.initialize();
  // await MySocket.initialize();
  // maybe comment this out
  // await StateManager.setState(LoginState);
  await StateManager.setLoginState(LoginState, canvas);

  // when the next line commant it will be home screen
  await LoginState.enterGame();
  let Loop = new GameLoop(canvas);
  Loop.gameLoop();
};

startGame();
