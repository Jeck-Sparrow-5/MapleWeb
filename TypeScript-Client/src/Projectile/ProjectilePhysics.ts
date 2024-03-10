import { Position } from "../Effects/DamageIndicator";

const default_speed = 850; // 850 - about normal speed
// const default_speed = 40;

class ProjectilePhysics {
  vx: number = 0;
  vy: number = 0;
  x: number = 0;
  y: number = 0;

  constructor(opts: any) {
    if (opts.left) {
      this.vx = -1 * default_speed;
    }

    if (opts.right) {
      this.vx = default_speed;
    }

    this.x = opts.x || 0;
    this.y = opts.y || 0;
  }

  update(msPerTick: number) {
    let delta = msPerTick / 1000;

    // Update position based on velocity
    this.x += this.vx * delta;
    this.y += this.vy * delta;
  }

  getRadianAngle() {
    return Math.atan2(this.vy, this.vx);
  }

  getNormalAngle() {
    return this.getRadianAngle() * (180 / Math.PI);
  }

  isWithinRange(
    targetPosition: Position,
    allowedAngle: number,
    maxDistance: number
  ) {
    const { x: targetX, y: targetY } = targetPosition;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

    if (distanceToTarget > maxDistance) {
      return false; // Target is too far away
    }

    const angleToTarget = Math.atan2(dy, dx);
    const currentAngle = Math.atan2(this.vy, this.vx);
    let angleDifference = currentAngle - angleToTarget;

    // Normalize the angle to the range [-π, π]
    while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
    while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

    if (Math.abs(angleDifference) > allowedAngle) {
      return false; // Target is not within allowed angle
    }

    return true;
  }

  distanceTo(targetPosition: Position) {
    const { x: targetX, y: targetY } = targetPosition;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setTarget(targetX: number, targetY: number) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    // Calculate the angle to the target
    const angle = Math.atan2(dy, dx);

    // Calculate the new velocities to hit the target
    this.vx = Math.cos(angle) * default_speed;
    this.vy = Math.sin(angle) * default_speed;
  }
}

export default ProjectilePhysics;
