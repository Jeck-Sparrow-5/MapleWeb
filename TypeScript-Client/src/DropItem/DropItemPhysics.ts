import MapleMap from "../MapleMap";

/// https://github.com/NoLifeDev/NoLifeStory/blob/master/src/client/physics.cpp
const down_jump_multiplier = 0.35355339;
const epsilon = 2e-3;
const fall_speed = 670;
const float_coefficient = 0.01;
const float_drag_1 = 100000;
const float_drag_2 = 10000;
const float_multiplier = 0.0008928571428571428;
const fly_force = 120000;
const fly_jump_dec = 0.35;
const fly_speed = 200;
const gravity_acc = 2000;
const jump_speed = 555;
const max_friction = 2;
const max_land_speed = 162.5;
const min_friction = 0.05;
const shoe_fly_acc = 0;
const shoe_fly_speed = 0;
const shoe_mass = 100;
const shoe_swim_acc = 1;
const shoe_swim_speed_h = 1;
const shoe_swim_speed_v = 1;
const shoe_walk_acc = 1;
const shoe_walk_drag = 1;
const shoe_walk_jump = 0.8;
const shoe_walk_slant = 0.9;
const shoe_walk_speed = 1.0;
const slip_force = 60000;
const slip_speed = 120;
const swim_force = 120000;
const swim_jump = 700;
const swim_speed = 140;
const swim_speed_dec = 0.9;
const walk_drag = 80000;
const walk_force = 140000;
const default_walk_speed = 125;
const slide_down_speed = 300;
const slide_up_speed = 150;

const speedFactor = 90;

class DropItemPhysics {
  x = 0;
  y = 0;
  r = 0;
  vx = 0;
  vy = 0;
  vr = 0;
  layer = 0;
  group = 0;
  fh: any = null;
  lf = null;
  djump = null;
  walk_speed = default_walk_speed;
  left = false;
  right = false;
  up = false;
  down = false;
  isMoveEnalbed = true;
  isClimbing = false;

  constructor({ x = 0, y = 0, vx = 0, vy = 0 }) {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.isMoveEnalbed = true;
    this.x = x;
    this.y = y;
    this.r = 0;
    this.vx = vx;
    this.vy = vy;
    this.vr = 0;
    this.layer = 0;
    this.group = 0;
    this.fh = null;
    this.lf = null;
    this.djump = null;
    this.walk_speed = default_walk_speed;
  }

  jump() {
    let fh: any = this.fh;
    let djump = this.djump;
    let vx = this.vx;
    let vy = this.vy;
    let flying = false;
    let x = this.x;
    let y = this.y;
    if (fh) {
      if (
        this.down &&
        !fh.cantThrough &&
        !fh.forbit &&
        Object.values(MapleMap.footholds || {}).some((f: any) => {
          return f.id != fh.id && f.x1 < x && f.x2 > x && f.y1 > y && f.y2 > y;
        })
      ) {
        djump = fh;
        vx = 0;
        vy = -jump_speed * down_jump_multiplier;
      } else {
        vy = shoe_walk_jump * jump_speed * (flying ? -0.7 : -1);
        let fx = fh.x2 - fh.x1,
          fy = fh.y2 - fh.y1,
          fmax = this.walk_speed * shoe_walk_speed;
        (this.left && fy < 0) || (this.right && fy > 0)
          ? (fmax *= 1 + (fy * fy) / (fx * fx + fy * fy))
          : 0;
        vx = this.left
          ? Math.max(Math.min(vx, -fmax * 0.8), -fmax)
          : this.right
          ? Math.min(Math.max(vx, fmax * 0.8), fmax)
          : vx;
      }
      fh = null;
    } else {
      if (flying) {
        vy = -shoe_swim_speed_v * swim_jump;
      }
    }
    this.fh = fh;
    this.djump = djump;
    this.vx = vx;
    this.vy = vy;
  }

  update(msPerTick: number) {
    if (!this.isMoveEnalbed) {
      return;
    }

    let mleft = this.left && !this.right;
    let mright = !this.left && this.right;
    let delta = msPerTick / 1000;
    let vx = this.vx;
    let vy = this.vy;
    let fh = this.fh;

    if (this.isClimbing) {
      this.x = this.x + vx * delta;
      this.y = this.y + vy * delta;
      return;
    } else {
      if (fh) {
        const fx = fh.x2 - fh.x1,
          fy = fh.y2 - fh.y1,
          fx2 = fx * fx,
          fy2 = fy * fy,
          len = Math.sqrt(fx2 + fy2);
        let mvr = (vx * len) / fx;
        mvr -= fh.force;
        let fs = (1 / shoe_mass) * delta;
        let maxf = 1 * this.walk_speed * shoe_walk_speed;
        let drag =
          Math.max(Math.min(shoe_walk_drag, max_friction), min_friction) *
          walk_drag;
        let slip = fy / len;
        if (shoe_walk_slant < Math.abs(slip)) {
          let slipf = slip_force * slip;
          let slips = slip_speed * slip;
          mvr += mleft ? -drag * fs : mright ? drag * fs : 0;
          mvr =
            slips > 0
              ? Math.min(slips, mvr + slipf * delta)
              : Math.max(slips, mvr + slipf * delta);
        } else {
          mvr = mleft
            ? mvr < -maxf
              ? Math.min(-maxf, mvr + drag * fs)
              : Math.max(-maxf, mvr - shoe_walk_acc * walk_force * fs)
            : mright
            ? mvr > maxf
              ? Math.max(maxf, mvr - drag * fs)
              : Math.min(maxf, mvr + shoe_walk_acc * walk_force * fs)
            : mvr < 0
            ? Math.min(0, mvr + drag * fs)
            : mvr > 0
            ? Math.max(0, mvr - drag * fs)
            : mvr;
        }
        mvr += fh.force;
        this.vx = (mvr * fx) / len;
        this.vy = (mvr * fy) / len;
      } else {
        let shoefloat = (float_drag_2 / shoe_mass) * delta;
        vy > 0
          ? (vy = Math.max(0, vy - shoefloat))
          : (vy = Math.min(0, vy + shoefloat));
        this.vy = Math.min(vy + gravity_acc * delta, fall_speed);
        this.vx = mleft
          ? vx > -float_drag_2 * float_multiplier
            ? Math.max(-float_drag_2 * float_multiplier, vx - 2 * shoefloat)
            : vx
          : mright
          ? vx < float_drag_2 * float_multiplier
            ? Math.min(float_drag_2 * float_multiplier, vx + 2 * shoefloat)
            : vx
          : vy < fall_speed
          ? vx > 0
            ? Math.max(0, vx - float_coefficient * shoefloat)
            : Math.min(0, vx + float_coefficient * shoefloat)
          : vx > 0
          ? Math.max(0, vx - shoefloat)
          : Math.min(0, vx + shoefloat);
      }
      while (delta > epsilon) {
        let x = this.x;
        let y = this.y;
        vx = this.vx;
        vy = this.vy;
        fh = this.fh;

        if (fh) {
          let nx = x + vx * delta,
            ny = y + vy * delta;
          if (nx > fh.x2) {
            if (!fh.next) {
              (nx = fh.x2 + epsilon), (ny = fh.y2);
              fh = null;
              delta *= 1 - (nx - x) / (vx * delta);
            } else if (fh.next.x1 < fh.next.x2) {
              fh = fh.next;
              let fx = fh.x2 - fh.x1,
                fy = fh.y2 - fh.y1;
              let dot = (vx * fx + vy * fy) / (fx * fx + fy * fy);
              (nx = fh.x1), (ny = fh.y1);
              delta *= 1 - (nx - x) / (vx * delta);
              (vx = dot * fx), (vy = dot * fy);
            } else if (fh.next.y1 > fh.next.y2) {
              (nx = fh.x2 - epsilon), (ny = fh.y2);
              (vx = 0), (vy = 0);
              delta = 0;
            } else {
              (nx = fh.x2 + epsilon), (ny = fh.y2);
              fh = null;
              delta *= 1 - (nx - x) / (vx * delta);
            }
          } else if (nx < fh.x1) {
            if (!fh.prev) {
              (nx = fh.x1 - epsilon), (ny = fh.y1);
              fh = null;
              delta *= 1 - (nx - x) / (vx * delta);
            } else if (fh.prev.x1 < fh.prev.x2) {
              fh = fh.prev;
              let fx = fh.x2 - fh.x1,
                fy = fh.y2 - fh.y1;
              let dot = (vx * fx + vy * fy) / (fx * fx + fy * fy);
              (nx = fh.x2), (ny = fh.y2);
              delta *= 1 - (nx - x) / (vx * delta);
              (vx = dot * fx), (vy = dot * fy);
            } else if (fh.prev.y1 < fh.prev.y2) {
              (nx = fh.x1 + epsilon), (ny = fh.y1);
              (vx = 0), (vy = 0);
              delta = 0;
            } else {
              (nx = fh.x1 - epsilon), (ny = fh.y1);
              fh = null;
              delta *= 1 - (nx - x) / (vx * delta);
            }
          } else {
            delta = 0;
          }
          (x = nx), (y = ny);
        } else {
          let dx1 = vx * delta;
          let dy1 = vy * delta;
          let distance = 1;
          let nnx = x + dx1;
          let nny = y + dy1;

          for (let f of Object.values<any>(MapleMap.footholds || {})) {
            let dx2 = f.x2 - f.x1,
              dy2 = f.y2 - f.y1;
            let dx3 = x - f.x1,
              dy3 = y - f.y1;
            let denom = dx1 * dy2 - dy1 * dx2;
            let n1 = (dx1 * dy3 - dy1 * dx3) / denom;
            let n2 = (dx2 * dy3 - dy2 * dx3) / denom;
            if (
              n1 >= 0 &&
              n1 <= 1 &&
              n2 >= 0 &&
              denom < 0 &&
              f != this.djump &&
              n2 <= distance
            )
              if (
                this.group == f.group ||
                dx2 > 0 ||
                f.group == 0 ||
                f.cantThrough
              ) {
                nnx = x + n2 * dx1;
                nny = y + n2 * dy1;
                distance = n2;
                fh = f;
              }
          }

          x = nnx;
          y = nny;
          if (fh) {
            this.djump = null;
            let fx = fh.x2 - fh.x1,
              fy = fh.y2 - fh.y1;
            if (fh.x1 > fh.x2) {
              y += epsilon;
              fh = null;
            } else if (fh.x1 == fh.x2) {
              if (fy > 0) x += epsilon;
              else x -= epsilon;
              fh = null;
            } else {
              this.group = fh.group;
              this.layer = fh.layer;
              if (vy > max_land_speed) vy = max_land_speed;
            }
            let dot = (vx * fx + vy * fy) / (fx * fx + fy * fy);
            this.vx = dot * fx;
            this.vy = dot * fy;
            delta *= 1 - distance;
          } else {
            delta = 0;
          }
        }
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.fh = fh;
      }
    }
  }
}

export default DropItemPhysics;
