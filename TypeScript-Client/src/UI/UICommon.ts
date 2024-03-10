import WZManager from "../wz-utils/WZManager";
import PLAY_AUDIO from "../Audio/PlayAudio";
import GameCanvas from "../GameCanvas";
import { Rectangle } from "../Physics/Collision";

export interface UICommonInterface {
  cursorImg: any;
  cursorOrigin: any;
  cursorDownImg: any;
  cursorDownOrigin: any;
  currentCursor: any;
  clickAudio: any;
  hoverAudio: any;
  initialize: () => Promise<void>;
  getMousePosition: (canvas: GameCanvas) => { x: number; y: number };
  playMouseClickAudio: () => void;
  playMouseHoverAudio: () => void;
  doUpdate: (msPerTick: number) => void;
  doRender: (
    canvas: GameCanvas,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
}

const UICommon = {} as UICommonInterface;

UICommon.initialize = async function () {
  const cursor: any = await WZManager.get("UI.wz/Basic.img/Cursor");

  this.cursorImg = cursor[0][0].nGetImage();
  this.cursorOrigin = cursor[0][0].origin;

  this.cursorDownImg = cursor[12][0].nGetImage();
  this.cursorDownOrigin = cursor[12][0].origin;

  const sounds: any = await WZManager.get("Sound.wz/UI.img");

  this.clickAudio = sounds.BtMouseClick.nGetAudio();
  this.hoverAudio = sounds.BtMouseOver.nGetAudio();
};

UICommon.getMousePosition = function (canvas) {
  const clicked = canvas.clicked;
  const cursorOrigin = !clicked ? this.cursorOrigin : this.cursorDownOrigin;

  return {
    x: canvas.mouseX - cursorOrigin.nX,
    y: canvas.mouseY - cursorOrigin.nY,
  };
};

UICommon.playMouseClickAudio = function () {
  PLAY_AUDIO(this.clickAudio);
};

UICommon.playMouseHoverAudio = function () {
  PLAY_AUDIO(this.hoverAudio);
};

UICommon.doUpdate = function (msPerTick) {};

// let canvasOffset: Rectangle = document.getElementById("game").getBoundingClientRect();

UICommon.doRender = function (canvas, camera, lag, msPerTick, tdelta) {
  const clicked = canvas.clicked;
  const cursorImg = !clicked ? this.cursorImg : this.cursorDownImg;
  const cursorOrigin = !clicked ? this.cursorOrigin : this.cursorDownOrigin;

  cursorImg.style.position = "absolute";
  cursorImg.style.zIndex = 4;
  cursorImg.style.pointerEvents = "none";
  const mousePosition = this.getMousePosition(canvas);
  cursorImg.style.left = `${mousePosition.x}px`;
  cursorImg.style.top = `${mousePosition.y}px`;

  // cursorImg.style.left = `${
  //   canvas.mouseX - cursorOrigin.nX + canvasOffset.x
  // }px`;
  // cursorImg.style.top = `${canvas.mouseY - cursorOrigin.nY + canvasOffset.y}px`;

  !!this.currentCursor && this.currentCursor.remove();
  this.currentCursor = cursorImg;
  canvas.gameWrapper.appendChild(cursorImg);
};

export default UICommon;
