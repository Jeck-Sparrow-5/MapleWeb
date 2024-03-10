import MapleMap from "./MapleMap";
import MyCharacter from "./MyCharacter";
import Camera, { CameraInterface } from "./Camera";
// import UIMap from "./UI/uimap";
import { enterBrowserFullscreen } from "./Config";
// import StatsMenuSprite from "./UI/Menu/StatsMenuSprite";
// import InventoryMenuSprite from "./UI/Menu/InventoryMenuSprite";
import GameCanvas from "./GameCanvas";
import UIMap from "./UI/UIMap";
import StatsMenuSprite from "./UI/Menu/StatsMenuSprite";
import InventoryMenuSprite from "./UI/Menu/InventoryMenuSprite";
import TouchJoyStick, {
  JoyStick,
  JoyStickDirections,
} from "./UI/TouchJoyStick";

// henesys 100000000
// 100020100 - maps with pigs - usefull to test fast things with mobs
// const defaultMap = 100020100; // - maps with pigs - usefull to test fast things with mobs
const defaultMap = 100000000; // henesys
// const defaultMap = 104040000; // left of henesys
// const defaultMap: number = 100040102; // elinia - monkey map

export interface MapState {
  initialize: (map?: number) => Promise<void>;
  changeMap: (map: number) => Promise<void>;
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
  isTouchControllsEnabled: boolean;
  joyStick: JoyStick;
  statsMenu: StatsMenuSprite;
  inventoryMenu: InventoryMenuSprite;
  UIMenus: any[];
  previousKeyboardState: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    i: boolean;
    s: boolean;
  };
}

const MapStateInstance = {} as MapState;

async function initializeMapState(map = defaultMap, isFirstUpdate = false) {
  console.log(`initializeMapState(${map}, isFirstUpdate: ${isFirstUpdate}`);
  await MyCharacter.load();
  MyCharacter.activate();
  // Henesys
  await MapleMap.load(map);

  MyCharacter.map = MapleMap;

  if (isFirstUpdate) {
    // todo
    await UIMap.initialize();
  }

  const xMid = Math.floor(
    (MapleMap.boundaries.right + MapleMap.boundaries.left) / 2
  );
  const yMid = Math.floor(
    (MapleMap.boundaries.bottom + MapleMap.boundaries.top) / 2
  );

  MyCharacter.pos.x = xMid;
  MyCharacter.pos.y = yMid;
}

MapStateInstance.changeMap = async function (map = defaultMap) {
  console.log("MapState changed to", map);
  await initializeMapState(map);
};

function isTouchDevice() {
  // debug
  // return true;
  return (
    "ontouchstart" in window || navigator.maxTouchPoints > 0
    //
    // || navigator.msMaxTouchPoints > 0
  );
}

MapStateInstance.initialize = async function (map: number = defaultMap) {
  console.log("MapState.initialize", map);

  this.isTouchControllsEnabled = true;
  this.isTouchControllsEnabled = isTouchDevice(); // Check if the device supports touch
  if (this.isTouchControllsEnabled) {
    this.joyStick = TouchJoyStick.init();
  }

  this.statsMenu = await StatsMenuSprite.fromOpts({
    x: 200,
    y: 200,
    charecter: MyCharacter,
    isHidden: true,
  });
  this.inventoryMenu = await InventoryMenuSprite.fromOpts({
    x: 400,
    y: 200,
    charecter: MyCharacter,
    isHidden: true,
  });

  this.UIMenus = [this.statsMenu, this.inventoryMenu];

  await initializeMapState(map, true);
};

MapStateInstance.doUpdate = function (
  msPerTick: number,
  camera: CameraInterface,
  canvas: GameCanvas
) {
  console.log(canvas.keys);
  // if (this.previousKeyboardState == null) {
  //   this.previousKeyboardState = canvas.keys;

  //   return;
  // }
  if (!!MapleMap.doneLoading) {
    MapleMap.update(msPerTick);

    if (this.isTouchControllsEnabled) {
      console.log(this.joyStick.cardinalDirection);

      switch (this.joyStick.cardinalDirection) {
        case JoyStickDirections.N:
          MyCharacter.upClick();
          break;
        case JoyStickDirections.S:
          MyCharacter.downClick();
          break;
        case JoyStickDirections.E:
          MyCharacter.rightClick();
          break;
        case JoyStickDirections.W:
          MyCharacter.leftClick();
          break;
        case JoyStickDirections.NE:
          MyCharacter.upClick();
          MyCharacter.rightClick();
          break;
        case JoyStickDirections.NW:
          MyCharacter.upClick();
          MyCharacter.leftClick();
          break;
        case JoyStickDirections.SE:
          MyCharacter.downClick();
          MyCharacter.rightClick();
          break;
        case JoyStickDirections.SW:
          MyCharacter.downClick();
          MyCharacter.leftClick();
          break;
        case JoyStickDirections.C:
          MyCharacter.downClickRelease();
          MyCharacter.upClickRelease();
          MyCharacter.leftClickRelease();
          MyCharacter.rightClickRelease();

          break;
        default:
          break;
      }

      MyCharacter.update(msPerTick);
    } else {
      if (canvas.isKeyDown("up")) {
        MyCharacter.upClick();
      }
      if (canvas.isKeyDown("down")) {
        MyCharacter.downClick();
      }
      if (canvas.isKeyDown("left")) {
        MyCharacter.leftClick();
      }
      if (canvas.isKeyDown("right")) {
        MyCharacter.rightClick();
      }
      if (canvas.isKeyDown("alt")) {
        MyCharacter.jump();
      }
      if (canvas.isKeyDown("ctrl")) {
        MyCharacter.attack();
      }
      if (canvas.isKeyDown("z")) {
        MyCharacter.pickUp();
      }

      if (canvas.isKeyDown("s")) {
        this.statsMenu.setIsHidden(!this.statsMenu.isHidden);
      }

      if (canvas.isKeyDown("i")) {
        this.inventoryMenu.setIsHidden(!this.inventoryMenu.isHidden);
      }

      if (canvas.isKeyDown("esc")) {
        console.log("escape");
        // hide the last menu that is not hidden
        const notHiddenMenus = this.UIMenus.filter((menu) => !menu.isHidden);
        if (notHiddenMenus.length > 0) {
          notHiddenMenus[notHiddenMenus.length - 1].setIsHidden(true);
        }
      }

      MyCharacter.update(msPerTick);

      // now unset if the key is not pressed
      if (!canvas.isKeyDown("up")) {
        MyCharacter.upClickRelease();
      }
      if (!canvas.isKeyDown("down")) {
        MyCharacter.downClickRelease();
      }
      if (!canvas.isKeyDown("left")) {
        MyCharacter.leftClickRelease();
      }
      if (!canvas.isKeyDown("right")) {
        MyCharacter.rightClickRelease();
      }
    }

    let x = Camera.x + 400;
    let y = Camera.y + 300;
    //Camera.lookAt(x, y);
    Camera.lookAt(MyCharacter.pos.x, MyCharacter.pos.y - 78);

    UIMap.doUpdate(msPerTick, camera, canvas);

    this.UIMenus.forEach((menu) => {
      menu.update(msPerTick, camera, canvas);
    });
  }
};

MapStateInstance.doRender = function (canvas, camera, lag, msPerTick, tdelta) {
  if (!!MapleMap.doneLoading) {
    MapleMap.render(canvas, camera, lag, msPerTick, tdelta);

    if (!!MyCharacter.active) {
      MyCharacter.draw(canvas, camera, lag, msPerTick, tdelta);
    }

    this.UIMenus.forEach((menu) => {
      menu.draw(canvas, camera, lag, msPerTick, tdelta);
    });

    UIMap.doRender(canvas, camera, lag, msPerTick, tdelta);
  } else {
    // black screen
    // canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

declare global {
  interface Window {
    MapStateInstance: MapState;
  }
}

// fix this
window.MapStateInstance = MapStateInstance;

export default MapStateInstance;
