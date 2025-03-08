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

// Increased to make items jump higher
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
  
  // Flag to prevent items from being destroyed immediately
  hasLanded: boolean = false;
  lifeTime: number = 120000; // 2 minutes item life
  currentLifeTime: number = 0;

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
    this.isAlreadyPickedUp = false;
    this.hasLanded = false;
    this.currentLifeTime = 0;
    
    console.log("DropItemSprite.load", this.id, this.amount);
    
    // mesos
    if (this.id === 0) {
      const mesoAmount = this.amount;
      const itemId = MapleInventory.getMesosItemId(mesoAmount);
      let strId = `${itemId}`.padStart(8, "0");
      const idFirst4digits = strId.slice(0, 4);
      
      try {
        let itemFile = await WZManager.get(
          `${WZFiles.Item}/${MapleInventory.WzInventoryType.Special}/${idFirst4digits}.img/${itemId}`
        );
        this.itemFile = itemFile;
        
        // Ensure we have valid stance data
        if (this.itemFile && this.itemFile.iconRaw) {
          this.stance = this.itemFile.iconRaw;
          this.setFrame(this.itemFile.iconRaw, 0);
        } else {
          console.error("Failed to load mesos icon data");
          this.destroyed = true;
          return;
        }
      } catch (e) {
        console.error("Error loading mesos item:", e);
        this.destroyed = true;
        return;
      }
    } else {
      const wzInventoryType = MapleInventory.getWzNameFromInventoryId(
        `${this.id}`.padStart(8, "0")
      );
      
      try {
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
      } catch (e) {
        console.error("Error loading item:", e);
        this.destroyed = true;
        return;
      }
    }

    await this.playDropItemAudio();
  }

  async playDropItemAudio() {
    try {
      const pickupNode: any = await WZManager.get(
        `${WZFiles.Sound}/Game.img/DropItem`
      );
      const pickupAudio = pickupNode.nGetAudio();
      PLAY_AUDIO(pickupAudio);
    } catch (e) {
      console.error("Error playing drop item audio:", e);
    }
  }

  async playPickupAudio() {
    try {
      const pickupNode: any = await WZManager.get(
        `${WZFiles.Sound}/Game.img/PickUpItem`
      );
      const pickupAudio = pickupNode.nGetAudio();
      PLAY_AUDIO(pickupAudio);
    } catch (e) {
      console.error("Error playing pickup audio:", e);
    }
  }

  goToPlayer(playerVx: number, playerVy: number) {
    if (this.isAlreadyPickedUp) {
      return; // Prevent picking up multiple times
    }

    this.isInPickupAnimation = true;
    this.isAlreadyPickedUp = true;
    this.animationState = AnimationStates.None;
    
    // Apply a jump motion toward the player
    if (this.pos) {
      this.pos.jump();
      this.pos.vx = playerVx;
    }

    this.playPickupAudio();
  }

  goToPlayerAnimationFinished() {
    this.destroy();
  }

  setFrame(stance: any, frame = 0, carryOverDelay = 0) {
    if (!this.stance || !this.stance.nChildren) {
      console.error("Invalid stance or missing nChildren in setFrame");
      return;
    }
    
    // Prevent index out of bounds
    const f = !this.stance.nChildren[frame] ? 0 : frame;
    
    try {
      const stanceFrame = this.stance.nChildren[f];
      this.stance = stance;
      this.frameNumber = f;
      this.delay = carryOverDelay;
      this.nextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
    } catch (e) {
      console.error("Error in setFrame:", e);
    }
  }

  destroy() {
    this.destroyed = true;
  }

  update(msPerTick: number) {
    // Update lifetime for all items
    this.currentLifeTime += msPerTick;
    if (this.currentLifeTime >= this.lifeTime) {
      this.destroy();
      return;
    }
    
    this.delay += msPerTick;

    // Update animation frame if needed
    if (this.delay > this.nextDelay && this.stance && this.stance.nChildren) {
      try {
        const hasNextFrame = !!this.stance.nChildren[this.frameNumber + 1];
        if (!hasNextFrame) {
          // Instead of destroying the item, just reset to frame 0
          this.setFrame(this.stance, 0, this.delay - this.nextDelay);
        } else {
          this.setFrame(
            this.stance,
            this.frameNumber + 1,
            this.delay - this.nextDelay
          );
        }
      } catch (e) {
        console.error("Error updating frames:", e);
      }
    }

    // Update physics and position
    if (this.pos) {
      this.pos.update(msPerTick);
    }

    if (this.isFirstUpdateFinished && !this.isSecondUpdateFinished) {
      this.isSecondUpdateFinished = true;
    }

    // Handle floating animation states
    if (this.animationState === AnimationStates.GoingUp) {
      this.animationTime += msPerTick;
      if (this.animationTime >= this.animationMovementTime) {
        this.animationState = AnimationStates.GoingDown;
      }
    } else if (this.animationState === AnimationStates.GoingDown) {
      this.animationTime -= msPerTick;
      if (this.animationTime <= -this.animationMovementTime) {
        this.animationState = AnimationStates.GoingUp;
      }
    } else if (this.pos && this.pos.vy === 0 && !this.isInPickupAnimation) {
      // Start bobbing animation when item lands on ground
      this.animationState = AnimationStates.GoingUp;
      
      // Mark as landed to prevent premature destruction
      if (!this.hasLanded) {
        this.hasLanded = true;
      }
    }

    // Handle pickup animation completion
    if (this.isInPickupAnimation) {
      this.pickupAnimationTime += msPerTick;
      if (this.pickupAnimationTime >= this.pickAnimtionMaxTime || (this.pos && this.pos.vy >= 0)) {
        this.goToPlayerAnimationFinished();
      }
    }
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface
  ) {
    if (!this.pos || this.destroyed) {
      return;
    }
    
    // Calculate y-offset for bobbing animation
    let yOffset = 0;
    if (this.animationState !== AnimationStates.None) {
      yOffset =
        -this.animationHeight *
        (this.animationTime / this.animationMovementTime);
    }

    // Calculate alpha for fade-out during pickup
    let alpha = 1;
    if (this.isInPickupAnimation) {
      alpha = 1 - this.pickupAnimationTime / this.pickAnimtionMaxTime;
    }

    // Determine which image to draw
    let currentImage = this.icon;
    let currentFrame = this.frame;
    if (this.stance && this.stance.nChildren) {
      // Update flipped state based on velocity
      if (this.pos.vx > 0) {
        this.flipped = true;
      } else if (this.pos.vx < 0) {
        this.flipped = false;
      }
      
      try {
        currentFrame = this.stance.nChildren[this.frameNumber];
        currentImage = currentFrame.nGetImage();
      } catch (e) {
        console.error("Error getting frame image:", e);
        return;
      }
    }
    
    // Update frame reference
    this.frame = currentFrame;
    
    // Draw the item
    if (currentImage && currentFrame) {
      canvas.drawImage({
        img: currentImage,
        dx: this.pos.x - camera.x - currentFrame.nWidth / 2,
        dy: this.pos.y - camera.y - currentFrame.nHeight + yOffset,
        flipped: this.flipped,
        alpha,
      });
      
      // Store last position for pickup detection
      this.lastPositionCenter = {
        x: this.pos.x - camera.x,
        y: this.pos.y - camera.y,
      };
    }
  }
}

export default DropItemSprite;