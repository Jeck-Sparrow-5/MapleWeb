import WZManager from "../../wz-utils/WZManager";
import WZFiles from "../../Constants/enums/WZFiles";
import GeneralMenuSprite from "./GeneralMenuSprite";
import getEquipTypeById from "../../Constants/EquipType";
import { AttackType } from "../../Constants/AttackType";
import ClickManager from "../ClickManager";
import { MapleStanceButton } from "../MapleStanceButton";
import DragableMenu from "./DragableMenu";
import MapleCharacter from "../../MapleCharacter";
import { CameraInterface } from "../../Camera";
import GameCanvas from "../../GameCanvas";
import { Position } from "../../Effects/DamageIndicator";

class StatsMenuSprite extends DragableMenu {
  opts: any;
  StatsNode: any;
  charecter: MapleCharacter | null = null;
  generalMenuSprites: GeneralMenuSprite[] = [];
  buttons: MapleStanceButton[] = [];
  isNotFirstDraw: boolean = false;
  destroyed: boolean = false;
  delay: number = 0;
  id: number = 0;
  originalX: number = 0;
  originalY: number = 0;

  static async fromOpts(opts: any) {
    const object = new StatsMenuSprite(opts);
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

    let StatsNode = await WZManager.get(`${WZFiles.UI}/UIWindow.img/Stat`);
    this.StatsNode = StatsNode;

    this.generalMenuSprites = [];
    this.buttons = [];

    this.loadBackgound();

    ClickManager.addDragableMenu(this);
  }

  getRect(camera: CameraInterface) {
    return {
      x: this.x,
      y: this.y,
      width: this.StatsNode.backgrnd.nGetImage().width,
      height: this.StatsNode.backgrnd.nGetImage().height,
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
        wzImage: this.StatsNode.backgrnd,
        x: this.x,
        y: this.y,
        z: 1,
      })
    );

    // i think the bug here only happned on vite refresh (not sure yet)
    // console.log(
    //   "this.StatsNode",
    //   this.StatsNode.backgrnd.nGetImage().height,
    //   this.StatsNode.backgrnd2.nGetImage().height,
    //   this.StatsNode
    // );

    this.generalMenuSprites.push(
      await GeneralMenuSprite.fromOpts({
        wzImage: this.StatsNode.backgrnd2,
        x: this.x + this.StatsNode.backgrnd.nGetImage().width - 10,
        y:
          this.y +
          this.StatsNode.backgrnd.nGetImage().height -
          this.StatsNode.backgrnd2.nGetImage().height,
        z: 0,
      })
    );
  }

  async drawText(canvas: GameCanvas) {
    canvas.drawText({
      text: this.charecter!.name,
      color: "#000000",
      x: this.x + 60,
      y: this.y + 36,
    });

    canvas.drawText({
      text: this.charecter!.stats.jobType,
      color: "#000000",
      x: this.x + 60,
      y: this.y + 52,
    });

    canvas.drawText({
      text: `[${this.charecter!.stats.job}]`,
      color: "#000000",
      fontSize: 10,
      x: this.x + 60,
      y: this.y + 64,
    });

    canvas.drawText({
      text: this.charecter!.stats.level.toString(),
      color: "#000000",
      x: this.x + 60,
      y: this.y + 82,
    });

    canvas.drawText({
      text: " -",
      color: "#000000",
      x: this.x + 60,
      y: this.y + 100,
    });

    canvas.drawText({
      text: `${this.charecter!.hp}/${this.charecter!.stats.maxHp}`,
      color: "#000000",
      x: this.x + 60,
      y: this.y + 118,
    });

    canvas.drawText({
      text: `${this.charecter!.mp}/${this.charecter!.stats.maxMp}`,
      color: "#000000",
      x: this.x + 60,
      y: this.y + 136,
    });
    const expPrecentage = Math.floor(
      (this.charecter!.exp / this.charecter!.maxExp) * 100
    );
    canvas.drawText({
      text: `${this.charecter!.exp} (${expPrecentage}%)`,
      color: "#000000",
      x: this.x + 60,
      y: this.y + 154,
    });

    canvas.drawText({
      text: this.charecter!.fame.toString(),
      color: "#000000",
      x: this.x + 60,
      y: this.y + 172,
    });

    canvas.drawText({
      text: this.charecter!.stats.abilityPoints.toString(),
      color: "#000000",
      x: this.x + 72,
      y: this.y + 218,
      align: "left",
    });

    canvas.drawText({
      text: this.charecter!.stats.str.toString(),
      color: "#000000",
      x: this.x + 60,
      y: this.y + 248,
    });
    canvas.drawText({
      text: this.charecter!.stats.dex.toString(),
      color: "#000000",
      x: this.x + 60,
      y: this.y + 266,
    });
    canvas.drawText({
      text: this.charecter!.stats.int.toString(),
      color: "#000000",
      x: this.x + 60,
      y: this.y + 284,
    });

    canvas.drawText({
      text: this.charecter!.stats.luk.toString(),
      color: "#000000",
      x: this.x + 60,
      y: this.y + 302,
    });

    // second menu
    const attackRange = this.charecter!.stats.getAttackRange(
      this.charecter!.equips,
      getEquipTypeById(this.charecter!.weaponEquipId),
      AttackType.Swing
    );

    canvas.drawText({
      text: `${attackRange.min} ~ ${attackRange.max}`,
      color: "#000000",
      x: this.x + 242,
      y: this.y + 154,
    });

    canvas.drawText({
      text: this.charecter!.stats.getWeaponDefense(
        this.charecter!.equips
      ).toString(),
      color: "#000000",
      x: this.x + 242,
      y: this.y + 172,
    });

    // magic attack
    // canvas.drawText({
    //   text: this.charecter!.stats.getWeaponDefense(this.charecter!.equips),
    //   color: "#000000",
    //   x: this.x + 242,
    //   y: this.y + 190,
    // });

    canvas.drawText({
      text: this.charecter!.stats.getMagicDefense(
        this.charecter!.equips
      ).toString(),
      color: "#000000",
      x: this.x + 242,
      y: this.y + 208,
    });

    canvas.drawText({
      text: this.charecter!.stats.getAccuracy().toString(),
      color: "#000000",
      x: this.x + 242,
      y: this.y + 226,
    });

    canvas.drawText({
      text: this.charecter!.stats.getAvoidability().toString(),
      color: "#000000",
      x: this.x + 242,
      y: this.y + 244,
    });

    canvas.drawText({
      text: this.charecter!.stats.getHands().toString(),
      color: "#000000",
      x: this.x + 242,
      y: this.y + 262,
    });

    canvas.drawText({
      text: `${this.charecter!.stats.getSpeedPrecetnage(
        this.charecter!.equips
      )}%`,
      color: "#000000",
      x: this.x + 242,
      y: this.y + 280,
    });

    canvas.drawText({
      text: `${this.charecter!.stats.getJumpPrecetnage(
        this.charecter!.equips
      )}%`,
      color: "#000000",
      x: this.x + 242,
      y: this.y + 298,
    });
  }

  loadButtons(canvas: GameCanvas) {
    const strButton = new MapleStanceButton(canvas, {
      x: this.x + 152,
      y: this.y + 247,
      img: this.StatsNode.BtApUp.nChildren,
      isRelativeToCamera: true,
      isPartOfUI: true,
      onClick: () => {
        this.charecter!.stats.addStr();
      },
    });
    ClickManager.addButton(strButton);

    const dexButton = new MapleStanceButton(canvas, {
      x: this.x + 152,
      y: this.y + 265,
      img: this.StatsNode.BtApUp.nChildren,
      isRelativeToCamera: true,
      isPartOfUI: true,
      onClick: () => {
        this.charecter!.stats.addDex();
      },
    });
    ClickManager.addButton(dexButton);

    const intButton = new MapleStanceButton(canvas, {
      x: this.x + 152,
      y: this.y + 283,
      img: this.StatsNode.BtApUp.nChildren,
      isRelativeToCamera: true,
      isPartOfUI: true,
      onClick: () => {
        this.charecter!.stats.addInt();
      },
    });
    ClickManager.addButton(intButton);

    const lukButton = new MapleStanceButton(canvas, {
      x: this.x + 152,
      y: this.y + 301,
      img: this.StatsNode.BtApUp.nChildren,
      isRelativeToCamera: true,
      isPartOfUI: true,
      onClick: () => {
        this.charecter!.stats.addLuk();
      },
    });
    ClickManager.addButton(lukButton);

    this.buttons = [strButton, dexButton, intButton, lukButton];
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

export default StatsMenuSprite;
