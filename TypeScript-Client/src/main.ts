import "./style.css";

import GameLoop from "./Gameloop";
import Timer from "./Timer";
import WZManager from "./wz-utils/WZManager";
import Camera from "./Camera";
import SessionManager from "./SessionManager";
import MySocket from "./mysocket";
import StateManager from "./StateManager";
import LoginState from "./LoginState";
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
  // SessionManager is for Cosmic (Java server) via websocat — disabled for Node.js server
  // if (config.websocketUrl) {
  //   await SessionManager.initialize(config.websocketUrl);
  // }
  StateManager.initialize();
  ClickManager.initialize(canvas);
  WZManager.initialize();
  Camera.initialize();
  Timer.initialize();
  await StateManager.setState(LoginState, canvas);

  let Loop = new GameLoop(canvas);
  Loop.gameLoop();
};

startGame();
