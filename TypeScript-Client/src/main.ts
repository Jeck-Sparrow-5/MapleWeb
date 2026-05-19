import "./style.css";

import GameLoop from "./Gameloop";
import Timer from "./Timer";
import NXManager from "./wz-utils/NXManager";
import Camera from "./Camera";
import SessionManager from "./SessionManager";
import StateManager from "./StateManager";
import LoginState from "./LoginState";
import GameCanvas from "./GameCanvas";
import ClickManager from "./UI/ClickManager";
import MapleMap from "./MapleMap";

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
  if (config.websocketUrl) {
    await SessionManager.initialize(config.websocketUrl);
  }
  StateManager.initialize();
  ClickManager.initialize(canvas);
  NXManager.initialize();
  Camera.initialize();
  Timer.initialize();
  // await MySocket.initialize();
  (MapleMap as any).canvas = canvas;
  await StateManager.setState(LoginState, canvas);

  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    // Wait until MapleMap signals doneLoading before fading out
    const waitForMap = () => new Promise<void>(resolve => {
      const check = () => (MapleMap as any).doneLoading ? resolve() : requestAnimationFrame(check);
      check();
    });
    waitForMap().then(() => setTimeout(() => {
      loadingOverlay.classList.add('fade-out');
      loadingOverlay.addEventListener('transitionend', () => loadingOverlay.remove(), { once: true });
    }, 2000));
  }

  let Loop = new GameLoop(canvas);
  Loop.gameLoop();
};

startGame();
