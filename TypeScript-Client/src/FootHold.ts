import { CameraInterface } from "./Camera";
import GameCanvas from "./GameCanvas";

class Foothold {
  private wzNode: any; // Update the type to the actual type expected from wzNode

  id: number = 0;
  group: number = 0;
  layer: number = 0;
  x1: number = 0;
  y1: number = 0;
  x2: number = 0;
  y2: number = 0;
  prev: number = 0;
  next: number = 0;
  force: number = 0;
  forbid: number = 0;
  cantThrough: number = 0;
  isWall: boolean = false;
  slope: number = 0;
  isCeiling: boolean = false;
  isLeftWall: boolean = false;
  isRightWall: boolean = false;

  static fromWzNode(wzNode: any): Foothold {
    const fh = new Foothold(wzNode);
    fh.load();
    return fh;
  }

  constructor(wzNode: any) {
    this.wzNode = wzNode;
  }

  load(): void {
    const wzNode = this.wzNode;

    this.id = parseInt(wzNode.nName);
    this.group = parseInt(wzNode.nParent.nName);
    this.layer = parseInt(wzNode.nParent.nParent.nName);
    this.x1 = wzNode.x1.nValue;
    this.y1 = wzNode.y1.nValue;
    this.x2 = wzNode.x2.nValue;
    this.y2 = wzNode.y2.nValue;
    this.prev = wzNode.prev.nValue;
    this.next = wzNode.next.nValue;
    this.force = wzNode.nGet("force").nGet("nValue", 0);
    this.forbid = wzNode.nGet("forbidFallDown").nGet("nValue", 0);
    this.cantThrough = wzNode.nGet("cantThrough").nGet("nValue", 0);

    this.isWall = this.x1 === this.x2;
    this.slope = !this.isWall ? (this.y2 - this.y1) / (this.x2 - this.x1) : 0;
    this.isCeiling = this.x1 > this.x2;
    if (this.isWall) {
      this.isLeftWall = this.y1 < this.y2;
      this.isRightWall = this.y1 >= this.y2;
    }
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface
    // lag: number,
    // msPerTick: number
  ): void {
    //canvas.drawLine({
    //  x1: this.x1 - camera.x,
    //  x2: this.x2 - camera.x,
    //  y1: this.y1 - camera.y,
    //  y2: this.y2 - camera.y,
    //  color: "#00ff00",
    //});
  }
}

export default Foothold;
