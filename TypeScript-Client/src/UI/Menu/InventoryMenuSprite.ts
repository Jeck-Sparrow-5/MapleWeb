import WZManager from "../../wz-utils/WZManager";
import WZFiles from "../../Constants/enums/WZFiles";
import GeneralMenuSprite from "./GeneralMenuSprite";
import ClickManager from "../ClickManager";
import { MapleStanceButton } from "../MapleStanceButton";
import DragableMenu from "./DragableMenu";
import { MapleInventoryType } from "../../Constants/Inventory/MapleInventory";
import { CameraInterface } from "../../Camera";
import { Position } from "../../Effects/DamageIndicator";
import GameCanvas from "../../GameCanvas";

class InventoryMenuSprite extends DragableMenu {
  opts: any;
  inventoryNode: any;
  charecter: any;
  currentTab: MapleInventoryType = MapleInventoryType.EQUIP;
  generalMenuSprites: GeneralMenuSprite[] = [];
  buttons: MapleStanceButton[] = [];
  isNotFirstDraw: boolean = false;
  equipNode: any;
  useNode: any;
  setupNode: any;
  etcNode: any;
  cashNode: any;
  destroyed: boolean = false;
  delay: number = 0;
  id: number = 0;
  originalX: number = 0;
  originalY: number = 0;

  static async fromOpts(opts: any) {
    const object = new InventoryMenuSprite(opts);
    await object.load();
    return object;
  }
  constructor(opts: any) {
    super(opts);
    this.opts = opts;
  }
  async load() {
    const opts = this.opts;
    this.id = opts.id;
    this.charecter = opts.charecter;
    this.x = opts.x;
    this.y = opts.y;
    this.originalX = opts.x;
    this.originalY = opts.y;
    this.isHidden = opts.isHidden;
    this.charecter = opts.charecter;
    this.inventoryNode = await WZManager.get(`${WZFiles.UI}/UIWindow.img/Item`);
    this.currentTab = MapleInventoryType.EQUIP;
    console.log(this.inventoryNode);

    this.generalMenuSprites = [];
    this.buttons = [];

    // 5: WzInventoryType.Cash,
    // 2: WzInventoryType.Consume,
    // 3: WzInventoryType.Install,
    // 4: WzInventoryType.Etc,
    // 9: WzInventoryType.Special,
    // console.log(
    //   `${WZFiles.Item}/${MapleInventory.WzInventoryType.Install}.json`
    // );
    // this.equipNode = await WZManager.get(
    //   `${WZFiles.Item}/${MapleInventory.WzInventoryType.Install}`
    // );
    // this.useNode = await WZManager.get(
    //   `${WZFiles.Item}/${MapleInventory.WzInventoryType.Consume}`
    // );
    // this.setupNode = await WZManager.get(
    //   `${WZFiles.Item}/${MapleInventory.WzInventoryType.Install}`
    // );
    // this.etcNode = await WZManager.get(
    //   `${WZFiles.Item}/${MapleInventory.WzInventoryType.Etc}`
    // );
    // this.cashNode = await WZManager.get(
    //   `${WZFiles.Item}/${MapleInventory.WzInventoryType.Cash}`
    // );

    this.loadBackgound();

    ClickManager.addDragableMenu(this);
  }

  drawItems() {
    let currentItemsArray = [];
    let curretNode = null;

    switch (this.currentTab) {
      case MapleInventoryType.EQUIP:
        currentItemsArray = this.charecter.inventory.equip;
        curretNode = this.equipNode;
        break;
      case MapleInventoryType.USE:
        currentItemsArray = this.charecter.inventory.use;
        curretNode = this.useNode;
        break;
      case MapleInventoryType.SETUP:
        currentItemsArray = this.charecter.inventory.setup;
        curretNode = this.setupNode;
        break;
      case MapleInventoryType.ETC:
        currentItemsArray = this.charecter.inventory.etc;
        curretNode = this.etcNode;
        break;
      case MapleInventoryType.CASH:
        currentItemsArray = this.charecter.inventory.cash;
        curretNode = this.cashNode;
        break;
      default:
    }

    for (const item of currentItemsArray) {
      const itemFile = item.node;
      console.log(itemFile);
      // let itemFile = await WZManager.get(
      //   `${WZFiles.Item}/${wzInventoryType}/${idFirst4digits}.img/${strId}`
      // );
    }
  }

  getRect(camera: CameraInterface) {
    return {
      x: this.x,
      y: this.y,
      width: this.inventoryNode.FullBackgrnd.nGetImage().width,
      height: this.inventoryNode.FullBackgrnd.nGetImage().height,
    };
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach((button) => {
      button.isHidden = isHidden;
    });
  }

  async loadBackgound() {
    this.generalMenuSprites.push(
      await GeneralMenuSprite.fromOpts({
        wzImage: this.inventoryNode.FullBackgrnd,
        x: this.x,
        y: this.y,
        z: 1,
      })
    );

    // small inventory background - not supported
    // this.generalMenuSprites.push(
    //   await GeneralMenuSprite.fromOpts({
    //     wzImage: this.StatsNode.backgrnd2,
    //     x: this.x + this.StatsNode.backgrnd.nGetImage().width - 10,
    //     y:
    //       this.y +
    //       this.StatsNode.backgrnd.nGetImage().height -
    //       this.StatsNode.backgrnd2.nGetImage().height,
    //     z: 0,
    //   })
    // );
  }

  async drawText(canvas: GameCanvas) {
    const mesosWithCommas = this.charecter.inventory.mesos
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    canvas.drawText({
      text: mesosWithCommas,
      color: "#000000",
      x: this.x + 96,
      y: this.y + 270,
    });
  }

  loadButtons(canvas: GameCanvas) {
    const dropMesoButton = new MapleStanceButton(canvas, {
      x: this.x + 8,
      y: this.y + 267,
      img: this.inventoryNode.BtCoin.nChildren,
      isRelativeToCamera: true,
      isPartOfUI: true,
      onClick: () => {
        // drop meso
        console.log("drop meso not implemented");
      },
    });
    ClickManager.addButton(dropMesoButton);
    this.buttons = [dropMesoButton];
  }

  moveTo(position: Position) {
    this.x = position.x;
    this.y = position.y;
    this.buttons.forEach((button) => {
      button.x += -this.originalX + position.x;
      button.y += -this.originalY + position.y;
    });

    this.generalMenuSprites = [];
    this.loadBackgound();

    this.originalX = position.x;
    this.originalY = position.y;

    // this.loadButtons(this.canvas);
  }

  destroy() {
    this.destroyed = true;
  }

  update(msPerTick: number) {
    this.delay += msPerTick;

    this.generalMenuSprites.forEach((generalMenuSprite) => {
      generalMenuSprite.update(msPerTick);
    });
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (!this.isHidden) {
      // this probebly should be here
      if (!this.isNotFirstDraw) {
        this.loadButtons(canvas);
        this.isNotFirstDraw = true;
      }

      this.generalMenuSprites
        .sort((a, b) => {
          return a.z - b.z;
        })
        .forEach((generalMenuSprite) => {
          generalMenuSprite.draw(canvas, camera, lag, msPerTick, tdelta);
        });

      this.drawText(canvas);
    }
  }
}

export default InventoryMenuSprite;
