import MapleMap from "./MapleMap";
import MyCharacter from "./MyCharacter";
import UIState from './UIState';
import Camera, { CameraInterface } from "./Camera";
import { enterBrowserFullscreen } from "./Config";
import GameCanvas from "./GameCanvas";
import UIMap from "./UI/UIMap";
import StatsMenuSprite from "./UI/Menu/StatsMenuSprite";
import InventoryMenuSprite from "./UI/Menu/InventoryMenuSprite";
import UIQuit from "./UI/UIQuit";
import UIStatusMessenger from "./UI/UIStatusMessenger";
import UIMiniMap from "./UI/UIMiniMap";
import UINotice from "./UI/UINotice";
import UICharInfo from "./UI/UICharInfo";
import UIOptionMenu from "./UI/UIOptionMenu";
import UIKeyConfig from "./UI/UIKeyConfig";
import UIUserList from "./UI/UIUserList";
import UIWorldMap from "./UI/UIWorldMap";
import UIChannel from "./UI/UIChannel";
import UIStorage from "./UI/UIStorage";
import { UseItemPacket } from "./Net/Packets/ItemPackets";
import UISkillHotbar, { useHotbarSlot } from "./UI/UISkillHotbar";
import NameTagRenderer from "./UI/NameTagRenderer";
import ChatBubbleRenderer from "./UI/ChatBubbleRenderer";
import TooltipRenderer from "./UI/TooltipRenderer";
import UIPartyHP from "./UI/UIPartyHP";
import MovePlayerPacket from "./Net/Packets/MovePlayerPacket";
import SessionManager from "./SessionManager";
import UISkillBook from "./UI/UISkillBook";
import UIEquipInventory from "./UI/UIEquipInventory";
import UIBuffList from "./UI/UIBuffList";
import UIGameMenu from "./UI/UIGameMenu";
import UIQuestLog from "./UI/UIQuestLog";
import TouchJoyStick, {
  JoyStick,
  JoyStickDirections,
} from "./UI/TouchJoyStick";

// henesys 100000000
// 100020100 - maps with pigs - useful to test fast things with mobs
// const defaultMap = 100020100; // maps with pigs
const defaultMap = 100000000; // henesys
// const defaultMap = 104040000; // left of henesys
// const defaultMap: number = 100040102; // elinia - monkey map

export interface MapState extends UIState {
  changeMap: (map: number) => Promise<void>;
  isTouchControllsEnabled: boolean;
  joyStick: JoyStick;
  statsMenu: StatsMenuSprite;
  inventoryMenu: InventoryMenuSprite;
  quitDialog: typeof UIQuit;
  miniMap: typeof UIMiniMap;
  userList: UIUserList;
  worldMap: UIWorldMap;
  lastMoveSent: number;
  lastMoveX: number;
  lastMoveY: number;
  skillBook: UISkillBook;
  equipInventory: UIEquipInventory;
  questLog: UIQuestLog;
  UIMenus: any[];
  previousKeyboardState: { up: boolean; down: boolean; left: boolean; right: boolean; i: boolean; s: boolean; k: boolean; e: boolean; q: boolean; m: boolean; [key: string]: boolean };
}

const MapStateInstance = {} as MapState;

async function initializeMapState(map = defaultMap, isFirstUpdate = false) {
  await MyCharacter.load();
  MyCharacter.activate();
  // Henesys
  await MapleMap.load(map);

  MyCharacter.map = MapleMap;

  if (isFirstUpdate) {
    // todo: additional UI initialization if needed
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
  await initializeMapState(map);
  if (this.miniMap?.initialized) {
    this.miniMap.loadMapData();
  }
};

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

MapStateInstance.initialize = async function (gameCanvas?: GameCanvas) {
  // StateManager passes the GameCanvas as first arg; fall back to DOM lookup
  const canvas: GameCanvas = gameCanvas ?? (document.getElementById('game') as any);

  this.isTouchControllsEnabled = isTouchDevice();
  if (this.isTouchControllsEnabled) {
    this.joyStick = TouchJoyStick.init();
  }

  await UIQuit.initialize(canvas);
  this.quitDialog = UIQuit;

  await UIMiniMap.initialize(canvas);
  this.miniMap = UIMiniMap;

  this.skillBook = await UISkillBook.fromOpts({ x: 300, y: 150, isHidden: true, canvas });
  this.equipInventory = await UIEquipInventory.fromOpts({ x: 500, y: 150, isHidden: true, canvas });
  this.questLog = await UIQuestLog.fromOpts({ x: 100, y: 80, isHidden: true, canvas });

  await UIBuffList.initialize();
  await NameTagRenderer.initialize();
  await ChatBubbleRenderer.initialize();
  await TooltipRenderer.initialize();
  await UIPartyHP.initialize();
  await UIOptionMenu.initialize(canvas);
  await UIKeyConfig.initialize(canvas);
  await UIChannel.initialize(canvas);
  this.userList = await UIUserList.fromOpts({ x: 400, y: 80, isHidden: true, canvas });
  this.worldMap = await UIWorldMap.fromOpts({ x: 80, y: 80, isHidden: true, canvas });

  await UIGameMenu.initialize(canvas, {
    onQuit: () => this.quitDialog?.show(),
    onChannel: () => UIChannel.show(),
  });

  this.UIMenus.push(this.skillBook, this.equipInventory, this.questLog, this.userList, this.worldMap);

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

  this.lastMoveSent = 0;
  this.lastMoveX = 0;
  this.lastMoveY = 0;
  // UIMenus populated after all menus initialize (skillBook/equipInventory/questLog added below)
  this.UIMenus = [this.statsMenu, this.inventoryMenu];

  // Initialize previous keyboard state with all keys set to false.
  this.previousKeyboardState = {
    up: false, down: false, left: false, right: false,
    i: false, s: false, k: false, e: false, q: false, m: false,
  };

  await initializeMapState(defaultMap, true);

  // --- Attach click event listener to the canvas element using the correct id ---
  const canvasElement = document.getElementById("game"); // updated to "game"
  if (canvasElement) {
    canvasElement.addEventListener("click", (event) => {
      MapleMap.handleClick(event, canvasElement, Camera);
    });
  } else {
    console.warn("Canvas element with id 'game' not found.");
  }
};

MapStateInstance.doUpdate = function (
  msPerTick: number,
  camera: CameraInterface,
  canvas: GameCanvas
) {
  if (!!MapleMap.doneLoading) {
    MapleMap.update(msPerTick);

    if (this.isTouchControllsEnabled) {
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

      if (canvas.isKeyDown("s") && !this.previousKeyboardState.s) {
        this.statsMenu.setIsHidden(!this.statsMenu.isHidden);
      }
      if (canvas.isKeyDown("i") && !this.previousKeyboardState.i) {
        this.inventoryMenu.setIsHidden(!this.inventoryMenu.isHidden);
      }
      if (canvas.isKeyDown("k") && !this.previousKeyboardState.k) {
        this.skillBook?.setIsHidden(!this.skillBook.isHidden);
      }
      if (canvas.isKeyDown("e") && !this.previousKeyboardState.e) {
        this.equipInventory?.setIsHidden(!this.equipInventory.isHidden);
      }
      if (canvas.isKeyDown("q") && !this.previousKeyboardState.q) {
        this.questLog?.setIsHidden(!this.questLog.isHidden);
      }
      if (canvas.isKeyDown("m") && !this.previousKeyboardState.m) {
        UIGameMenu.toggle();
      }

      // Skill hotbar: keys 1-9 = slots 0-8, 0 = slot 9
      const numberKeys = ['1','2','3','4','5','6','7','8','9','0'] as const;
      numberKeys.forEach((key, idx) => {
        if (canvas.isKeyDown(key) && !(this.previousKeyboardState as any)[key]) {
          useHotbarSlot(idx);
        }
      });
      // F1-F10 = slots 10-19
      for (let fi = 1; fi <= 10; fi++) {
        const fkey = `f${fi}` as any;
        if (canvas.isKeyDown(fkey) && !(this.previousKeyboardState as any)[fkey]) {
          useHotbarSlot(9 + fi);
        }
      }

      if (canvas.isKeyDown("esc")) {
        if (!this.quitDialog.isHidden) {
          this.quitDialog.hide();
        } else if (MapleMap.npcDialog && !MapleMap.npcDialog.isHidden) {
          MapleMap.npcDialog.close(0);
        } else {
          const notHiddenMenus = this.UIMenus.filter((menu) => !menu.isHidden);
          if (notHiddenMenus.length > 0) {
            notHiddenMenus[notHiddenMenus.length - 1].setIsHidden(true);
          } else {
            this.quitDialog.show();
          }
        }
      }

      MyCharacter.update(msPerTick);

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

    // Auto-pot: use first HP potion if HP < 50%, MP potion if MP < 30%
    if (SessionManager.isConnected()) {
      const now = Date.now();
      const hpRatio = MyCharacter.hp / (MyCharacter.maxHp || 1);
      const mpRatio = MyCharacter.mp / (MyCharacter.maxMp || 1);
      const lastAutoPot = (this as any)._lastAutoPot ?? 0;
      if (now - lastAutoPot > 2000) { // 2s cooldown
        const inv = MyCharacter.inventory;
        if (hpRatio < 0.5 && inv.use?.length > 0) {
          const hpPot = inv.use.find((it: any) => {
            const id = it?.itemId ?? 0;
            return id >= 2000000 && id < 2010000; // HP potion range
          });
          if (hpPot) {
            const slot = inv.use.indexOf(hpPot) + 1;
            // UseItemPacket imported at top
            new UseItemPacket(slot, hpPot.itemId).dispatch();
            (this as any)._lastAutoPot = now;
          }
        } else if (mpRatio < 0.3 && inv.use?.length > 0) {
          const mpPot = inv.use.find((it: any) => {
            const id = it?.itemId ?? 0;
            return id >= 2010000 && id < 2020000; // MP potion range
          });
          if (mpPot) {
            const slot = inv.use.indexOf(mpPot) + 1;
            // UseItemPacket imported at top
            new UseItemPacket(slot, mpPot.itemId).dispatch();
            (this as any)._lastAutoPot = now;
          }
        }
      }
    }

    // Send movement packet ~10×/s when connected and position changed
    if (SessionManager.isConnected()) {
      const now = Date.now();
      const cx = Math.round(MyCharacter.pos?.x ?? 0);
      const cy = Math.round(MyCharacter.pos?.y ?? 0);
      if (now - this.lastMoveSent > 100 && (cx !== this.lastMoveX || cy !== this.lastMoveY)) {
        new MovePlayerPacket(0, [{
          x: cx, y: cy,
          vx: Math.round((MyCharacter.pos as any)?.vx ?? 0),
          vy: Math.round((MyCharacter.pos as any)?.vy ?? 0),
          newstate: 0, duration: 100, foothold: 0,
        }]).dispatch();
        this.lastMoveSent = now;
        this.lastMoveX = cx;
        this.lastMoveY = cy;
      }
    }

    this.previousKeyboardState.i = canvas.isKeyDown("i");
    this.previousKeyboardState.s = canvas.isKeyDown("s");
    this.previousKeyboardState.k = canvas.isKeyDown("k");
    this.previousKeyboardState.e = canvas.isKeyDown("e");
    this.previousKeyboardState.q = canvas.isKeyDown("q");
    this.previousKeyboardState.m = canvas.isKeyDown("m");
    this.previousKeyboardState.up = canvas.isKeyDown("up");
    this.previousKeyboardState.down = canvas.isKeyDown("down");
    this.previousKeyboardState.left = canvas.isKeyDown("left");
    this.previousKeyboardState.right = canvas.isKeyDown("right");

    Camera.lookAt(MyCharacter.pos.x, MyCharacter.pos.y - 78);

    UIMap.doUpdate(msPerTick, camera, canvas);

    this.UIMenus.forEach((menu) => {
      menu.update(msPerTick, camera, canvas);
    });
  }
};

MapStateInstance.doRender = function (
  canvas: GameCanvas,
  camera: CameraInterface,
  lag: number,
  msPerTick: number,
  tdelta: number
) {
  if (!!MapleMap.doneLoading) {
    MapleMap.render(canvas, camera, lag, msPerTick, tdelta);

    if (!!MyCharacter.active) {
      MyCharacter.draw(canvas, camera, lag, msPerTick, tdelta);
    }

    this.UIMenus.forEach((menu) => {
      menu.draw(canvas, camera, lag, msPerTick, tdelta);
    });

    UIMap.doRender(canvas, camera, lag, msPerTick, tdelta);
    this.userList?.draw(canvas, camera, lag, msPerTick, tdelta);
    this.worldMap?.draw(canvas, camera, lag, msPerTick, tdelta);
    UIOptionMenu.draw(canvas);
    UIKeyConfig.draw(canvas);
    UIChannel.draw(canvas);
    this.skillBook?.draw(canvas, camera, lag, msPerTick, tdelta);
    this.equipInventory?.draw(canvas, camera, lag, msPerTick, tdelta);
    this.questLog?.draw(canvas, camera, lag, msPerTick, tdelta);
    UIPartyHP.draw(canvas);
    UIBuffList.update();
    UIBuffList.draw(canvas);
    UIStatusMessenger.update();
    UIStatusMessenger.draw(canvas);
    this.miniMap.draw(canvas);
    UIGameMenu.draw(canvas, camera, lag, msPerTick, tdelta);
    ChatBubbleRenderer.update();
    UISkillHotbar.draw(canvas);
    TooltipRenderer.draw(canvas); // always last so it renders on top
    if (UIStorage.instance && !UIStorage.instance.isHidden) {
      UIStorage.instance.draw(canvas, camera, lag, msPerTick, tdelta);
    }
    UINotice.draw(canvas);
    UICharInfo.draw(canvas);
    this.quitDialog.draw(canvas);
  }
};

declare global {
  interface Window {
    MapStateInstance: MapState;
  }
}

// Expose MapStateInstance globally
window.MapStateInstance = MapStateInstance;

declare global {
  interface Window {
    UINotice: typeof UINotice;
    UICharInfo: typeof UICharInfo;
  }
}
window.UINotice = UINotice;
window.UICharInfo = UICharInfo;

export default MapStateInstance;
