import WZManager from "../wz-utils/WZManager";
import UICommon from "./UICommon";
import MapleInput from "./MapleInput";
import Random from "../Random";
import { MapleStanceButton } from "./MapleStanceButton";
import ClickManager from "./ClickManager";
import MapleFrameButton from "./MapleFrameButton";
import GameCanvas from "../GameCanvas";

interface UILoginInterface {
  frameImg: any;
  inputUsn: MapleInput | null;
  inputPwd: MapleInput | null;
  newCharStats: number[];
  initialize: (canvas: GameCanvas) => Promise<void>;
  doUpdate: (msPerTick: number, camera: any, canvas: GameCanvas) => void;
  doRender: (
    canvas: GameCanvas,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
  removeInputs: () => void;
}

const UILogin = {} as UILoginInterface;

UILogin.initialize = async function (canvas: GameCanvas) {
  await UICommon.initialize();
  const uiLogin: any = await WZManager.get("UI.wz/Login.img");

  this.frameImg = uiLogin.Common.frame.nGetImage();

  this.inputUsn = new MapleInput(canvas, {
    x: 442,
    y: 236,
    width: 142,
    height: 20,
    color: "#ffffff",
  });
  this.inputPwd = new MapleInput(canvas, {
    x: 442,
    y: 265,
    width: 142,
    height: 20,
    color: "#ffffff",
    type: "password",
  });

  const loginButton = new MapleStanceButton(canvas, {
    x: 223,
    y: -85,
    img: uiLogin.Title.BtLogin.nChildren,
    onClick: () => {
      console.log("login!");
    },
  });
  ClickManager.addButton(loginButton);

  const dice = new MapleFrameButton({
    x: 245,
    y: -1835,
    img: uiLogin.NewChar.dice.nChildren,
    onEndFrame: () => {
      this.newCharStats = Random.generateDiceRollStats();
      console.log("Random stats: ", this.newCharStats);
    },
    hoverAudio: false,
  });
  ClickManager.addButton(dice);

  this.newCharStats = Random.generateDiceRollStats();
};

UILogin.doUpdate = function (msPerTick, camera, canvas) {
  UICommon.doUpdate(msPerTick);
};

UILogin.doRender = function (canvas, camera, lag, msPerTick, tdelta) {
  // const currDiceFrame = this.dice[this.diceFrame];
  // const currDiceImage = currDiceFrame.nGetImage();
  // canvas.drawImage({
  //   img: currDiceImage,
  //   dx: this.diceX - camera.x - currDiceFrame.origin.nX,
  //   dy: this.diceY - camera.y - currDiceFrame.origin.nY,
  // });

  canvas.drawImage({
    img: this.frameImg,
    dx: 0,
    dy: 0,
  });

  canvas.drawText({
    text: "Ver. 0.83",
    fontWeight: "bold",
    x: 595,
    y: 13,
  });

  UICommon.doRender(canvas, camera, lag, msPerTick, tdelta);
};

UILogin.removeInputs = function () {
  if (this.inputUsn) this.inputUsn.remove();
  if (this.inputPwd) this.inputPwd.remove();
  this.inputUsn = null;
  this.inputPwd = null;
};

export default UILogin;
