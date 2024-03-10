import WZManager from "../wz-utils/WZManager";
import WZFiles from "../Constants/enums/WZFiles";
import MapleInventory from "../Constants/Inventory/MapleInventory";
import DropItemPhysics from "./DropItemPhysics";
import PLAY_AUDIO from "../Audio/PlayAudio";
import GameCanvas from "../GameCanvas";
import { CameraInterface } from "../Camera";

const AnimationStates = {
  None: "none",
  GoingUp: "goingUp",
  GoingDown: "goingDown",
};

const dropItemJumpVelocity = 600;

class DropItemSprite {
  id: number = 0;
  monster: any;
  destroyed: boolean = false;
  pos: DropItemPhysics | null = null;
  animationState: string = AnimationStates.None;
  animationHeight: number = 4; // Animation height in pixels
  animationMovementTime: number = 600;
  animationTime: number = 0; // Current time during animation
  isInPickupAnimation: boolean = false;
  pickupAnimationTime: number = 0;
  pickAnimtionMaxTime: number = 250;
  stance: any;
  frame: any;
  amount: number = 0;
  isAlreadyPickedUp: boolean = false;
  itemFile: any;
  frameNumber: number = 0;
  icon: any;
  lastPositionCenter: any;
  flipped: boolean = false;
  delay: number = 0;
  nextDelay: number = 0;
  isFirstUpdateFinished: boolean = false;
  isSecondUpdateFinished: boolean = false;
  opts: any = null;

  // needed to enable await on constructor
  static async fromOpts(opts: any) {
    const dropItem = new DropItemSprite(opts);
    await dropItem.load();
    return dropItem;
  }
  constructor(opts: any) {
    this.opts = opts;
  }
  async load() {
    const opts = this.opts;
    this.id = opts.id;
    this.monster = opts.monster;
    this.destroyed = false;
    this.pos = new DropItemPhysics({
      x: this.monster.pos.x,
      y: this.monster.pos.y,
      vx: this.monster.pos.vx / 2,
      vy: -dropItemJumpVelocity,
    });
    this.animationState = AnimationStates.None;
    this.stance = null;
    this.frame = null;
    this.amount = opts.amount;
    console.log("DropItemSprite.load", this.id, this.amount);
    // mesos
    if (this.id === 0) {
      const mesoAmount = this.amount;
      const itemId = MapleInventory.getMesosItemId(mesoAmount);
      let strId = `${itemId}`.padStart(8, "0");
      const idFirst4digits = strId.slice(0, 4);
      let itemFile = await WZManager.get(
        `${WZFiles.Item}/${MapleInventory.WzInventoryType.Special}/${idFirst4digits}.img/${itemId}`
      );
      this.itemFile = itemFile;
      this.stance = this.itemFile.iconRaw;
      this.setFrame(this.itemFile.iconRaw, 0);
    } else {
      const wzInventoryType = MapleInventory.getWzNameFromInventoryId(
        `${this.id}`.padStart(8, "0")
      );
      if (wzInventoryType === MapleInventory.WzInventoryType.Pet) {
        this.itemFile = await WZManager.get(
          `${WZFiles.Item}/${wzInventoryType}/${this.id}.img`
        );
        this.frame = this.itemFile.info.iconRaw;
        this.icon = this.itemFile.info.iconRaw.nGetImage();
      } else if (wzInventoryType === MapleInventory.WzInventoryType.Special) {
        let strId = `${this.id}`.padStart(8, "0");
        const idFirst4digits = strId.slice(0, 4);
        let itemFile = await WZManager.get(
          `${WZFiles.Item}/${wzInventoryType}/${idFirst4digits}.img/${strId}`
        );
        this.itemFile = itemFile;

        this.stance = this.itemFile.iconRaw;
        this.setFrame(this.itemFile.iconRaw, 0);
      } else {
        let strId = `${this.id}`.padStart(8, "0");
        const idFirst4digits = strId.slice(0, 4);
        let itemFile = await WZManager.get(
          `${WZFiles.Item}/${wzInventoryType}/${idFirst4digits}.img/${strId}`
        );
        this.itemFile = itemFile;
        this.frame = this.itemFile.info.iconRaw;

        this.icon = this.itemFile.info.iconRaw.nGetImage();
      }
    }

    // this.setFrame(projectileFile.bullet, 0);

    this.playDropItemAudio();
  }

  async playDropItemAudio() {
    const pickupNode: any = await WZManager.get(
      `${WZFiles.Sound}/Game.img/DropItem`
    );
    const pickupAudio = pickupNode.nGetAudio();
    PLAY_AUDIO(pickupAudio);
  }

  async playPickupAudio() {
    const pickupNode: any = await WZManager.get(
      `${WZFiles.Sound}/Game.img/PickUpItem`
    );
    const pickupAudio = pickupNode.nGetAudio();
    PLAY_AUDIO(pickupAudio);
  }

  goToPlayer(playerVx: number, playerVy: number) {
    this.isInPickupAnimation = true;
    this.animationState = AnimationStates.None;
    this.pos!.jump();
    this.pos!.vx = playerVx;

    this.playPickupAudio();
  }

  goToPlayerAnimationFinished() {
    this.destroy();
  }

  setFrame(stance: any, frame = 0, carryOverDelay = 0) {
    const f = !this.stance.nChildren[frame] ? 0 : frame;
    const stanceFrame = this.stance.nChildren[f];
    this.stance = stance;
    this.frameNumber = f;
    this.delay = carryOverDelay;
    this.nextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
  }

  destroy() {
    this.destroyed = true;
  }

  update(msPerTick: number) {
    this.delay += msPerTick;

    if (this.delay > this.nextDelay && this.stance) {
      const hasNextFrame = !!this.stance.nChildren[this.frameNumber + 1];
      if (!hasNextFrame) {
        this.destroy();
        return;
      }
      this.setFrame(
        this.stance,
        this.frameNumber + 1,
        this.delay - this.nextDelay
      );
    }

    this.pos!.update(msPerTick);

    if (this.isFirstUpdateFinished && !this.isSecondUpdateFinished) {
      this.isSecondUpdateFinished = true;
    }

    // console.log(minX, maxX, this.pos.x, this.pos.y);

    if (this.animationState === AnimationStates.GoingUp) {
      this.animationTime += msPerTick;
      if (this.animationTime >= this.animationMovementTime) {
        // Adjust this duration as needed
        this.animationState = AnimationStates.GoingDown;
      }
    } else if (this.animationState === AnimationStates.GoingDown) {
      this.animationTime -= msPerTick;
      if (this.animationTime <= -this.animationMovementTime) {
        // Adjust this duration as needed
        this.animationState = AnimationStates.GoingUp;
      }
    } else {
      if (this.pos!.vy === 0 && !this.isInPickupAnimation) {
        this.animationState = AnimationStates.GoingUp;
      }

      if (this.isInPickupAnimation && this.pos!.vy >= 0) {
        this.goToPlayerAnimationFinished();
      }
    }

    if (this.isInPickupAnimation) {
      this.pickupAnimationTime += msPerTick;
    }
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface
    // lag: number,
    // msPerTick: number,
    // tdelta: number
  ) {
    let yOffset = 0;
    if (this.animationState !== AnimationStates.None) {
      yOffset =
        -this.animationHeight *
        (this.animationTime / this.animationMovementTime);
    }

    let alpha = 1;
    if (this.isInPickupAnimation) {
      alpha = 1 - this.pickupAnimationTime / this.pickAnimtionMaxTime;
    }

    let currentImage = this.icon;
    let currentFrame = this.frame;
    if (this.stance) {
      if (this.pos!.vx > 0) {
        this.flipped = true;
      } else if (this.pos!.vx < 0) {
        this.flipped = false;
      }
      currentFrame = this.stance.nChildren[this.frameNumber];
      currentImage = currentFrame.nGetImage();
    }
    this.frame = currentFrame;
    canvas.drawImage({
      img: currentImage,
      dx: this.pos!.x - camera.x - currentFrame.nWidth / 2,
      dy: this.pos!.y - camera.y - currentFrame.nHeight + yOffset,
      // dx: this.pos.x - camera.x - this.icon.nWidth / 2,
      // dy: this.pos.y - camera.y - this.icon.nHeight / 2,
      flipped: this.flipped,
      alpha,
    });

    this.lastPositionCenter = {
      x: this.pos!.x - camera.x,
      y: this.pos!.y - camera.y,
    };
  }
}

export default DropItemSprite;
