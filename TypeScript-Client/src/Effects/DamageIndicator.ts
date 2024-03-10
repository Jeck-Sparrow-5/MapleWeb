import WZManager from "../wz-utils/WZManager";
import WZFiles from "../Constants/enums/WZFiles";
import GameCanvas from "../GameCanvas";
import { CameraInterface } from "../Camera";

const DamageIndicatorTimeTillFade = 1500;
const DamageIndicatorDistanceToMove = 50;

export interface Position {
  x: number;
  y: number;
}

export enum DamageIndicatorType {
  PlayerHitMob = "PlayerHitMob",
  PlayerCritialHitMob = "PlayerCritialHitMob",
  MobHitPlayer = "MobHitPlayer",
}

export class DamageIndicator {
  noRed0Node = null;
  noRed1Node = null;
  noCri0Node = null;
  noCri1Node = null;
  noVioletNode = null;
  noViolet1Node = null;
  damageIndicatorsToDraw: any[] = [];
  DamageIndicatorTypeToImages: any = {};

  constructor() {}

  async initialize() {
    const basicEffectWzNode: any = await WZManager.get(
      `${WZFiles.Effect}/BasicEff.img`
    );

    this.DamageIndicatorTypeToImages = {
      [DamageIndicatorType.PlayerHitMob]: {
        firstNumberNode: basicEffectWzNode.NoRed1,
        otherNumberNode: basicEffectWzNode.NoRed0,
      },
      [DamageIndicatorType.PlayerCritialHitMob]: {
        firstNumberNode: basicEffectWzNode.NoCri1,
        otherNumberNode: basicEffectWzNode.NoCri0,
      },
      [DamageIndicatorType.MobHitPlayer]: {
        firstNumberNode: basicEffectWzNode.NoViolet1,
        otherNumberNode: basicEffectWzNode.NoViolet0,
      },
    };
  }

  drawDamage = (
    canvas: GameCanvas,
    position: Position,
    firstNumberNode: any,
    otherNumberNode: any,
    damageNumber = 6000,
    alpha: number = 1
  ) => {
    if (damageNumber <= 0) {
      let image = otherNumberNode["Miss"].nGetImage();
      canvas.drawImage({
        img: image,
        dx: position.x,
        dy: position.y,
        alpha,
      });
    } else {
      [...`${damageNumber}`].reduce((x, digit, index) => {
        let image = otherNumberNode[digit].nGetImage();
        let y = position.y;
        if (index % 2 === 1) {
          y += 4;
        }

        if (index === 0) {
          image = firstNumberNode[digit].nGetImage();
          y -= 4;
        }

        canvas.drawImage({
          img: image,
          dx: x,
          dy: y,
          alpha,
        });
        x += image.width - 5;
        return x;
      }, position.x);
    }
  };

  drawPlayerHitDamage(
    canvas: GameCanvas,
    position: Position,
    damageNumber = 6000
  ) {
    this.drawDamage(
      canvas,
      position,
      this.noRed1Node,
      this.noRed0Node,
      damageNumber
    );
  }

  drawPlayerHitCriticalDamage(
    canvas: GameCanvas,
    position: Position,
    damageNumber = 6000
  ) {
    this.drawDamage(
      canvas,
      position,
      this.noCri1Node,
      this.noCri0Node,
      damageNumber
    );
  }

  drawAllDamageIndicators = (
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => {
    const currentTime = Date.now();

    const damageIndicatorIndexesToRemove: number[] = [];

    this.damageIndicatorsToDraw.forEach(
      ({ type, position, damageNumber, timeAdded }, index) => {
        const elapsedTime = currentTime - timeAdded;
        if (elapsedTime <= DamageIndicatorTimeTillFade) {
          const { firstNumberNode, otherNumberNode } =
            this.DamageIndicatorTypeToImages[type];
          const alpha = 1 - elapsedTime / DamageIndicatorTimeTillFade; // Calculate alpha based on time

          const totalDistanceToMove = 50;
          const movementSpeed =
            totalDistanceToMove / DamageIndicatorTimeTillFade;
          const offsetY = movementSpeed * elapsedTime;

          this.drawDamage(
            canvas,
            {
              x: Math.floor(position.x - camera.x),
              y: Math.floor(position.y - camera.y - offsetY), // Apply the offset
            },
            firstNumberNode,
            otherNumberNode,
            damageNumber,
            alpha // Pass the calculated alpha value
          );
        } else {
          damageIndicatorIndexesToRemove.push(index);
        }
      }
    );

    damageIndicatorIndexesToRemove.forEach((index) => {
      this.damageIndicatorsToDraw.splice(index, 1);
    });
  };

  addDamageIndicator(
    type: DamageIndicatorType,
    position: Position,
    damageNumber = 6000
  ) {
    this.damageIndicatorsToDraw.push({
      type,
      position,
      damageNumber,
      timeAdded: Date.now(),
    });
  }
}

export default DamageIndicator;
