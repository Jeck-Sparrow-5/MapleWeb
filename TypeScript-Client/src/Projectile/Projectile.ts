import WZManager from "../wz-utils/WZManager";
import WZFiles from "../Constants/enums/WZFiles";
import ProjectilePhysics from "./ProjectilePhysics";
import {
  areAnyRectanglesOverlapping,
  isPositionInsideRect,
} from "../Physics/Collision";
import Stats, { DamageRange } from "../Stats/Stats";
import MapleCharacter from "../MapleCharacter";
import { Position } from "../Effects/DamageIndicator";
import Monster from "../Monster";
import GameCanvas from "../GameCanvas";
import { CameraInterface } from "../Camera";

// bullets locations
// Item.wz/Consume/206.img/ID/bullet - arrow
// Item.wz/Consume/207.img/ID/bullet - throwing star
// info
// IncPAD = increase physical attack damage

const default_target_angle = Math.PI / 6; // 30 degrees

class Projectile {
  opts: any;
  id: number = 0;
  charecter: MapleCharacter | null = null;
  pos: ProjectilePhysics | null = null;
  originX: number = 0;
  originY: number = 0;
  maxDistance: number = 0;
  isMovementEnabled: boolean = false;
  destroyed: boolean = false;
  targetMonsters: any = [];
  willHitkill: boolean = false;
  lastPositionCenter: Position = { x: 0, y: 0 };
  weaponAttackRange: DamageRange = { min: 0, max: 0 };
  finalDamangeAfterTargetDefense: number = 0;
  stance: any = null;
  target: Monster | null = null;
  frame: any = null;
  delay: number = 0;
  nextDelay: number = 0;
  flipped: boolean = false;
  dying: boolean = false;

  // needed to enable await on constructor
  static async fromOpts(opts: any) {
    const projectile = new Projectile(opts);
    await projectile.load();
    return projectile;
  }
  constructor(opts: any) {
    this.opts = opts;
  }
  async load() {
    const opts = this.opts;
    this.id = opts.id;
    this.charecter = opts.charecter;
    this.pos = new ProjectilePhysics({
      x: opts.x,
      y: opts.y,
      right: opts.right || false,
      left: opts.left || false,
    });
    this.originX = opts.x;
    this.originY = opts.y;
    this.maxDistance = opts.maxDistance || 1000;
    this.isMovementEnabled = true;
    this.destroyed = false;
    this.targetMonsters = opts.targetMonsters || [];
    this.willHitkill = false;
    this.lastPositionCenter = {
      x: this.pos.x,
      y: this.pos.y,
    };
    this.weaponAttackRange = opts.weaponAttackRange || 0;
    this.finalDamangeAfterTargetDefense = 0;

    // this.pos.jump();
    // this.pos.left = true;

    let strId = `${this.id}`.padStart(8, "0");
    const idFirst4digits = strId.slice(0, 4);
    let projectileFile: any = await WZManager.get(
      `${WZFiles.Item}/Consume/${idFirst4digits}.img/${strId}`
    );
    // console.log("projectileFile", projectileFile);
    // this.weaponAttack = projectileFile.info.incPAD.nValue;

    this.stance = projectileFile.bullet;
    this.setFrame(projectileFile.bullet, 0);

    this.checkIfFindTarget();
  }

  checkIfFindTarget() {
    const targetsInRange = this.targetMonsters.filter((monster: Monster) => {
      return this.pos!.isWithinRange(
        monster.centerPosition,
        default_target_angle,
        this.maxDistance
      );
    });

    if (targetsInRange.length > 0) {
      // Find the closest target among those in range
      let closestDistance = this.maxDistance + 1; // Initialize with a value greater than
      let closestMonster = null;

      for (const monster of targetsInRange) {
        const distance = this.pos!.distanceTo(monster.centerPosition);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestMonster = monster;
        }
      }

      this.target = closestMonster;
      this.pos!.setTarget(
        closestMonster.centerPosition.x,
        closestMonster.centerPosition.y
      );

      const attackRange =
        this.charecter!.stats.getAttackDamageRangeAfterMonsterDefense(
          this.weaponAttackRange,
          this.target!.mobFile.info.PDDamage.nValue,
          this.target!.mobFile.info.level.nValue
        );

      const isMiss = this.charecter!.stats.getRandomIsMiss(
        this.target!.mobFile.info.level.nValue,
        this.target!.mobFile.info.eva.nValue
      );
      this.finalDamangeAfterTargetDefense = isMiss
        ? 0
        : Stats.getRandomAttackDamageFromAttackRange(attackRange);

      // This follows the real maple, where if a projectile will kill a mob, it will hit it instantly
      this.willHitkill = this.target!.willHitkill(
        this.finalDamangeAfterTargetDefense
      );

      if (this.willHitkill) {
        this.target!.hit(
          this.finalDamangeAfterTargetDefense,
          this.pos!.x < this.target!.centerPosition.x ? 1 : -1,
          this.charecter
        );
      } else {
        // will happned when projectile hit the mob
      }
    } else {
      console.log("no target found");
    }
  }

  playAudio() {
    // if (!!this.sounds[name]) {
    //   PLAY_AUDIO(this.sounds[name]);
    // }ss
  }
  setFrame(stance: any, frame = 0, carryOverDelay = 0) {
    const f = !this.stance.nChildren[frame] ? 0 : frame;
    const stanceFrame = this.stance.nChildren[f];
    this.stance = stance;
    this.frame = f;
    this.delay = carryOverDelay;
    this.nextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
  }

  getTravelDistance() {
    return Math.sqrt(
      Math.pow(this.pos!.x - this.originX, 2) +
        Math.pow(this.pos!.y - this.originY, 2)
    );
  }

  destroy() {
    this.destroyed = true;
  }

  checkForHittingTarget() {
    if (!this.target) {
      return;
    }

    const targetRect = {
      x: this.target.x,
      y: this.target.y,
      width: this.target.width,
      height: this.target.height,
    };

    const isHit = isPositionInsideRect(this.pos!, targetRect);

    if (isHit) {
      // todo:
      // 1. add hit effect (cloud not find it yet)

      if (!this.willHitkill) {
        this.target.hit(
          this.finalDamangeAfterTargetDefense,
          this.pos!.x < this.target.centerPosition.x ? 1 : -1,
          this.charecter
        );
      }
      this.destroy();
    } else {
      // console.log("not hit target", this.lastPositionCenter, targetRect);
    }
  }

  update(msPerTick: number) {
    this.delay += msPerTick;

    if (this.delay > this.nextDelay) {
      const hasNextFrame = !!this.stance.nChildren[this.frame + 1];
      if (!!this.dying && !hasNextFrame) {
        this.destroy();
        return;
      }
      this.setFrame(this.stance, this.frame + 1, this.delay - this.nextDelay);
    }

    // console.log(minX, maxX, this.pos.x, this.pos.y);

    if (this.isMovementEnabled) {
      this.pos!.update(msPerTick);
    }

    if (!this.destroyed) {
      if (this.getTravelDistance() > this.maxDistance) {
        this.destroy();
      } else {
        this.checkForHittingTarget();
      }
    }
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (this.pos!.vx > 0) {
      this.flipped = true;
    } else if (this.pos!.vx < 0) {
      this.flipped = false;
    }
    const currentFrame = this.stance.nChildren[this.frame];
    const currentImage = currentFrame.nGetImage();

    const originX = currentFrame.nGet("origin").nGet("nX", 0);
    const originY = currentFrame.nGet("origin").nGet("nY", 0);

    const adjustX = !this.flipped ? originX : currentFrame.nWidth - originX;

    const angle = this.flipped
      ? this.pos!.getNormalAngle()
      : this.pos!.getNormalAngle() + 180;
    // console.log(angle);

    canvas.drawImage({
      img: currentImage,
      dx: this.pos!.x - camera.x - currentFrame.nWidth / 2,
      dy: this.pos!.y - camera.y - currentFrame.nHeight / 2,
      flipped: !!this.flipped,
      angle,
    });

    this.lastPositionCenter = {
      x: this.pos!.x - camera.x,
      y: this.pos!.y - camera.y,
    };

    // draw body middle point - usefull for debugging
    // canvas.context.fillStyle = "red";
    // canvas.context.fillRect(
    //   this.pos.x - camera.x - 2,
    //   this.pos.y - camera.y - 2,
    //   4,
    //   4
    // );

    // draw a box around the projectile usefull for debugging
    // const boxColor = "orange"; // You can set the desired box color
    // const borderWidth = 2; // You can adjust the border width as needed
    // canvas.context.strokeStyle = boxColor;
    // canvas.context.lineWidth = borderWidth;
    // canvas.context.strokeRect(
    //   this.pos.x - camera.x - currentFrame.nWidth / 2,
    //   this.pos.y - camera.y - currentFrame.nHeight / 2,
    //   currentFrame.nWidth,
    //   currentFrame.nHeight
    // );

    // draw a line from the projectile to the target usefull for debugging
    // if (this.target) {
    //   console.log(this.target.centerPosition);
    //   canvas.context.strokeStyle = "red";
    //   canvas.context.beginPath();
    //   canvas.context.moveTo(this.pos.x - camera.x, this.pos.y - camera.y);
    //   canvas.context.lineTo(
    //     this.target.centerPosition.x - camera.x,
    //     this.target.centerPosition.y - camera.y
    //   );
    //   canvas.context.stroke();
    // }
  }
}

export default Projectile;
