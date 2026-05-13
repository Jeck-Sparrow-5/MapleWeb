import GameCanvas from '../GameCanvas';
import MapleMap from '../MapleMap';
import MyCharacter from '../MyCharacter';
import WZManager from '../wz-utils/WZManager';
import MapleStanceButton from './MapleStanceButton';
import ClickManager from './ClickManager';
import config from '../Config';

type MiniMapMode = 'min' | 'normal';

interface UIMiniMapInterface {
  mode: MiniMapMode;
  x: number;
  y: number;
  mapCanvas: HTMLCanvasElement | null;
  mapImgNode: any;
  mag: number;
  centerX: number;
  centerY: number;
  mapName: string;
  buttons: MapleStanceButton[];
  statusBarNode: any;
  initialized: boolean;
  initialize: (canvas: GameCanvas) => Promise<void>;
  loadMapData: () => void;
  draw: (canvas: GameCanvas) => void;
  destroy: () => void;
}

const UIMiniMap = {} as UIMiniMapInterface;

UIMiniMap.initialize = async function (canvas: GameCanvas) {
  this.mode = 'normal';
  this.x = config.originalWidth - 150;
  this.y = 4;
  this.mapCanvas = null;
  this.mapImgNode = null;
  this.mag = 1;
  this.centerX = 0;
  this.centerY = 0;
  this.mapName = '';
  this.buttons = [];
  this.initialized = true;

  const statusBar = await WZManager.get('UI.wz/StatusBar.img');
  this.statusBarNode = statusBar;

  // Min button
  const minBtn = new MapleStanceButton(canvas, {
    x: config.originalWidth - 152,
    y: 4,
    img: statusBar?.MiniMap?.BtMin?.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      this.mode = this.mode === 'min' ? 'normal' : 'min';
    },
  });
  if (statusBar?.MiniMap?.BtMin) {
    ClickManager.addButton(minBtn);
    this.buttons.push(minBtn);
  }

  this.loadMapData();
};

UIMiniMap.loadMapData = function () {
  const wzNode = (MapleMap as any).wzNode;
  if (!wzNode) return;

  const miniMapNode = wzNode.miniMap;
  if (!miniMapNode) return;

  this.mag = miniMapNode.mag?.nGet ? parseInt(miniMapNode.mag.nValue ?? '1') : 1;
  this.centerX = parseInt(miniMapNode.centerX?.nValue ?? '0');
  this.centerY = parseInt(miniMapNode.centerY?.nValue ?? '0');

  const imgNode = miniMapNode.canvas;
  if (imgNode) {
    this.mapImgNode = imgNode;
  }
};

UIMiniMap.draw = function (canvas: GameCanvas) {
  if (!this.initialized) return;

  const mapW = 140;
  const mapH = this.mode === 'min' ? 0 : 80;
  const barH = 16;
  const px = this.x;
  const py = this.y;

  // Background bar
  canvas.context.save();
  canvas.context.fillStyle = 'rgba(0,0,0,0.65)';
  canvas.context.fillRect(px, py, mapW, barH + mapH);
  canvas.context.strokeStyle = '#555555';
  canvas.context.strokeRect(px, py, mapW, barH + mapH);

  // Map name
  canvas.context.fillStyle = '#FFFFFF';
  canvas.context.font = '10px Arial';
  canvas.context.fillText(MapleMap.names?.streetName ?? MapleMap.names?.mapName ?? '', px + 4, py + 11);
  canvas.context.restore();

  if (this.mode === 'min') return;

  // Map canvas image
  if (this.mapImgNode) {
    try {
      const img = this.mapImgNode.nGetImage?.();
      if (img) {
        canvas.context.save();
        canvas.context.drawImage(img, px + 2, py + barH + 2, mapW - 4, mapH - 4);
        canvas.context.restore();
      }
    } catch (_) {}
  } else {
    // Fallback: gray rectangle representing the map bounds
    const bounds = MapleMap.boundaries;
    if (bounds) {
      const bw = bounds.right - bounds.left;
      const bh = bounds.bottom - bounds.top;
      const scale = Math.min((mapW - 4) / bw, (mapH - 4) / bh, 1 / this.mag);

      canvas.context.save();
      canvas.context.fillStyle = '#334433';
      canvas.context.fillRect(px + 2, py + barH + 2, mapW - 4, mapH - 4);

      // Player dot
      const px2 = px + 2 + (MyCharacter.pos.x - bounds.left) * scale;
      const py2 = py + barH + 2 + (MyCharacter.pos.y - bounds.top) * scale;
      canvas.context.fillStyle = '#FF0000';
      canvas.context.beginPath();
      canvas.context.arc(px2, py2, 2, 0, Math.PI * 2);
      canvas.context.fill();
      canvas.context.restore();
    }
  }

  // Player dot on WZ minimap image
  if (this.mapImgNode) {
    const bounds = MapleMap.boundaries;
    if (bounds) {
      const bw = bounds.right - bounds.left || 1;
      const bh = bounds.bottom - bounds.top || 1;
      const scaleX = (mapW - 4) / bw;
      const scaleY = (mapH - 4) / bh;
      const dx = px + 2 + (MyCharacter.pos.x - bounds.left) * scaleX;
      const dy = py + barH + 2 + (MyCharacter.pos.y - bounds.top) * scaleY;

      canvas.context.save();
      canvas.context.fillStyle = '#FF0000';
      canvas.context.beginPath();
      canvas.context.arc(dx, dy, 2, 0, Math.PI * 2);
      canvas.context.fill();
      canvas.context.restore();
    }
  }

  this.buttons.forEach((btn) => btn.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
};

UIMiniMap.destroy = function () {
  this.buttons.forEach((b) => ClickManager.removeButton(b));
  this.buttons = [];
  this.initialized = false;
};

export default UIMiniMap;
