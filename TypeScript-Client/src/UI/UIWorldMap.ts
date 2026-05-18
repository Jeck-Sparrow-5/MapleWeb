import NXManager from '../wz-utils/NXManager';
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
  _currentAreaNode: any = null;
  _playerMapEntry: any = null;

  async load(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('WorldMap')?.nGetImage?.() ?? null;

    // Load base world map image
    try {
      const wmBase = await NXManager.get('Map.wz/WorldMap/WorldMap.img');
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
      const node = await NXManager.get(`Map.wz/WorldMap/${fileName}.img`);
      this.currentWorldMapImg = node?.nGet('BaseImg')?.nGetImage?.() ?? this.currentWorldMapImg;
      this._currentAreaNode = node;
    } catch (_) {}
  }

  // Find which world map area contains the given mapId, load it automatically
  async autoSelectArea(mapId: number) {
    for (const fileName of this.worldMapFiles) {
      try {
        const node = await NXManager.get(`Map.wz/WorldMap/${fileName}.img`);
        const mapList = node?.nGet('MapList');
        if (!mapList) continue;
        for (const entry of (mapList.nChildren ?? [])) {
          if (parseInt(entry.nGet?.('mapNo')?.nValue ?? '-1') === mapId) {
            this.currentWorldMapImg = node?.nGet('BaseImg')?.nGetImage?.() ?? this.currentWorldMapImg;
            this._currentAreaNode = node;
            this._playerMapEntry = entry;
            return;
          }
        }
      } catch (_) {}
    }
  }

  getPlayerDotOnMap(mapArea: { x: number; y: number; w: number; h: number }): { x: number; y: number } | null {
    // Use WZ MapList entry if available (has cx, cy for dot position on map image)
    const entry = (this as any)._playerMapEntry;
    if (entry) {
      const cx = parseInt(entry.nGet?.('cx')?.nValue ?? '-1');
      const cy = parseInt(entry.nGet?.('cy')?.nValue ?? '-1');
      if (cx >= 0 && cy >= 0) {
        const img = this.currentWorldMapImg;
        if (img) {
          return {
            x: mapArea.x + (cx / img.width) * mapArea.w,
            y: mapArea.y + (cy / img.height) * mapArea.h,
          };
        }
      }
    }
    return null;
  }

  setIsHidden(v: boolean) {
    this.isHidden = v;
    this.buttons.forEach((b) => (b.isHidden = v));
    if (!v && MapleMap.id != null) {
      this.autoSelectArea(Number(MapleMap.id)); // auto-navigate to player's current area
    }
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
      canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H, color: '#0a0a19', alpha: 0.97, strokeColor: '#334466', strokeWidth: 1 });
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
    canvas.drawRect({ x: mapArea.x, y: mapArea.y, width: mapArea.w, height: mapArea.h, color: '#0a1208' });
    if (this.currentWorldMapImg) {
      try {
        canvas.drawImage({ img: this.currentWorldMapImg, dx: mapArea.x, dy: mapArea.y, dw: mapArea.w, dh: mapArea.h });
      } catch (_) {}
    }

    // Player location dot — try WZ MapList cx/cy, fallback to center
    const dot = this.getPlayerDotOnMap(mapArea) ?? { x: mapArea.x + mapArea.w / 2, y: mapArea.y + mapArea.h / 2 };
    canvas.drawCircle({ x: dot.x, y: dot.y, radius: 5, color: '#FF4444', strokeColor: '#FFFFFF', strokeWidth: 1.5 });
    // Pulsing ring
    canvas.drawCircle({ x: dot.x, y: dot.y, radius: 8 + Math.sin(Date.now() / 400) * 2, color: undefined as any, strokeColor: '#ff4444', strokeWidth: 1, strokeAlpha: 0.5 });

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }
}

export default UIWorldMap;
