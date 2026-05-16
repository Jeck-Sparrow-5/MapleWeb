import { CameraInterface } from "./Camera";
import GameCanvas from "./GameCanvas";
import NXManager from "./wz-utils/NXManager";

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
    const type = wzNode.nParent?.nParent?.info?.tS?.nValue;
    const u = wzNode.u?.nValue;
    const no = wzNode.no?.nValue ?? 0;
    if (!type || !u) return;
    const tileFile: any = await NXManager.get(`Map.wz/Tile/${type}.img`);
    if (!tileFile) return;
    const spriteNode = tileFile[u]?.[no];
    if (!spriteNode) return;

    this.img = spriteNode.nGetImage();

    this.originX = spriteNode.origin?.nX ?? 0;
    this.originY = spriteNode.origin?.nY ?? 0;

    this.x = wzNode.x?.nValue ?? 0;
    this.y = wzNode.y?.nValue ?? 0;
    this.z = spriteNode.nGet("z")?.nGet("nValue", 0) ?? wzNode.zM.nValue ?? 0;
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
