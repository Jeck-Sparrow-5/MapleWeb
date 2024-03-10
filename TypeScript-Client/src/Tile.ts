import { CameraInterface } from "./Camera";
import GameCanvas from "./GameCanvas";
import WZManager from "./wz-utils/WZManager";

class Tile {
  wzNode: any;
  img: any;
  originX: number = 0;
  originY: number = 0;
  x: number = 0;
  y: number = 0;
  z: number = 0;
  layer: number = 0;

  static async fromWzNode(wzNode: any) {
    const tile = new Tile(wzNode);
    await tile.load();
    return tile;
  }
  constructor(wzNode: any) {
    this.wzNode = wzNode;
  }
  async load() {
    const wzNode = this.wzNode;
    const type = wzNode.nParent.nParent.info.tS.nValue;
    const u = wzNode.u.nValue;
    const no = wzNode.no.nValue;
    const tileFile: any = await WZManager.get(`Map.wz/Tile/${type}.img`);
    const spriteNode = tileFile[u][no];

    this.img = spriteNode.nGetImage();

    this.originX = spriteNode.origin.nX;
    this.originY = spriteNode.origin.nY;

    this.x = wzNode.x.nValue;
    this.y = wzNode.y.nValue;
    this.z = spriteNode.nGet("z").nGet("nValue", 0) || wzNode.zM.nValue;
  }
  draw(canvas: GameCanvas, camera: CameraInterface) {
    canvas.drawImage({
      img: this.img,
      dx: this.x - camera.x - this.originX,
      dy: this.y - camera.y - this.originY,
    });
  }
}

export default Tile;
