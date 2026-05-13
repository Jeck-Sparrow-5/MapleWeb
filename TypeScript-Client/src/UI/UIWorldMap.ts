import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import MapleMap from '../MapleMap';
import { Position } from '../Effects/DamageIndicator';

class UIWorldMap extends DragableMenu {
  bgImg: any = null;
  buttons: MapleStanceButton[] = [];
  loaded = false;
  readonly W = 600;
  readonly H = 420;
  mapImages: Map<string, any> = new Map();

  static async fromOpts(opts: any) {
    const o = new UIWorldMap(opts);
    await o.load(opts.canvas);
    return o;
  }

  currentWorldMapImg: any = null;
  worldMapFiles: string[] = [
    'WorldMap000','WorldMap010','WorldMap011','WorldMap012','WorldMap013','WorldMap014',
    'WorldMap020','WorldMap021','WorldMap030','WorldMap031','WorldMap032',
    'WorldMap040','WorldMap050','WorldMap051',
  ];
  currentWorldMapIdx = 0;

  async load(canvas: GameCanvas) {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('WorldMap')?.nGetImage?.() ?? null;

    // Load base world map image
    try {
      const wmBase = await WZManager.get('Map.wz/WorldMap/WorldMap.img');
      this.currentWorldMapImg = wmBase?.nGet('BaseImg')?.nGetImage?.() ?? null;
    } catch (_) {}

    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => this.setIsHidden(true),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Prev/Next world map area buttons
    const btPrev = uiWin?.nGet('BtPrev');
    const btNext = uiWin?.nGet('BtNext');
    if (btPrev) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 10, y: this.y + this.H - 30,
        img: btPrev.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: async () => {
          this.currentWorldMapIdx = Math.max(0, this.currentWorldMapIdx - 1);
          await this.loadWorldMapArea(this.worldMapFiles[this.currentWorldMapIdx]);
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }
    if (btNext) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 60, y: this.y + this.H - 30,
        img: btNext.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: async () => {
          this.currentWorldMapIdx = Math.min(this.worldMapFiles.length - 1, this.currentWorldMapIdx + 1);
          await this.loadWorldMapArea(this.worldMapFiles[this.currentWorldMapIdx]);
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.loaded = true;
  }

  async loadWorldMapArea(fileName: string) {
    try {
      const node = await WZManager.get(`Map.wz/WorldMap/${fileName}.img`);
      this.currentWorldMapImg = node?.nGet('BaseImg')?.nGetImage?.() ?? this.currentWorldMapImg;
    } catch (_) {}
  }

  setIsHidden(v: boolean) {
    this.isHidden = v;
    this.buttons.forEach((b) => (b.isHidden = v));
  }

  moveTo(pos: Position) {
    const dx = pos.x - this.x; const dy = pos.y - this.y;
    this.x = pos.x; this.y = pos.y;
    this.buttons.forEach((b) => { b.x += dx; b.y += dy; });
  }

  getRect(_cam: CameraInterface) {
    return { x: this.x, y: this.y, width: this.W, height: this.H };
  }

  update(_ms: number) {}

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.loaded) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(10,10,25,0.97)';
      canvas.context.fillRect(this.x, this.y, this.W, this.H);
      canvas.context.strokeStyle = '#334466';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H);
      canvas.context.restore();
    }

    canvas.drawText({ text: 'World Map', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 13 });

    // Current map info
    const mapName = MapleMap.names?.streetName ?? 'Unknown';
    const townName = MapleMap.names?.mapName ?? '';
    canvas.drawText({ text: 'Current:', color: '#AAAACC', x: this.x + 10, y: this.y + 35, fontSize: 10 });
    canvas.drawText({ text: `${townName} - ${mapName}`, color: '#FFFFFF', x: this.x + 60, y: this.y + 35, fontSize: 10 });
    canvas.drawText({ text: `Map ID: ${MapleMap.id ?? '?'}`, color: '#888888', x: this.x + 10, y: this.y + 50, fontSize: 9 });

    // Actual world map image
    const mapArea = { x: this.x + 5, y: this.y + 55, w: this.W - 10, h: this.H - 85 };
    canvas.context.save();
    canvas.context.fillStyle = '#0a1208';
    canvas.context.fillRect(mapArea.x, mapArea.y, mapArea.w, mapArea.h);
    if (this.currentWorldMapImg) {
      try {
        canvas.context.drawImage(this.currentWorldMapImg, mapArea.x, mapArea.y, mapArea.w, mapArea.h);
      } catch (_) {}
    }
    // Player dot
    canvas.context.fillStyle = '#FF4444';
    canvas.context.strokeStyle = '#FFFFFF';
    canvas.context.lineWidth = 1;
    canvas.context.beginPath();
    canvas.context.arc(mapArea.x + mapArea.w / 2, mapArea.y + mapArea.h / 2, 5, 0, Math.PI * 2);
    canvas.context.fill();
    canvas.context.stroke();
    canvas.context.restore();

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }
}

export default UIWorldMap;
