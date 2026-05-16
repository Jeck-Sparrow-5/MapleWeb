import GameCanvas from '../GameCanvas';
import MapleMap from '../MapleMap';
import MyCharacter from '../MyCharacter';
import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import config from '../Config';

type MiniMapMode = 'min' | 'normal' | 'large';

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

  const statusBar = await NXManager.get('UI.wz/StatusBar.img');
  this.statusBarNode = statusBar;

  // Min button — cycles: normal → min → normal
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

  // Max button — expands to large mode
  const maxBtn = new MapleStanceButton(canvas, {
    x: config.originalWidth - 168,
    y: 4,
    img: statusBar?.MiniMap?.BtMax?.nChildren,
    isRelativeToCamera: true,
    isPartOfUI: true,
    onClick: () => {
      this.mode = this.mode === 'large' ? 'normal' : 'large';
    },
  });
  if (statusBar?.MiniMap?.BtMax) {
    ClickManager.addButton(maxBtn);
    this.buttons.push(maxBtn);
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

  const mapW = this.mode === 'large' ? 240 : 140;
  const mapH = this.mode === 'min' ? 0 : this.mode === 'large' ? 160 : 80;
  const barH = 16;
  const px = this.x;
  const py = this.y;

  // Background
  canvas.context.save();
  canvas.context.fillStyle = 'rgba(0,0,0,0.65)';
  canvas.context.fillRect(px, py, mapW, barH + mapH);
  canvas.context.strokeStyle = '#555555';
  canvas.context.strokeRect(px, py, mapW, barH + mapH);
  canvas.context.fillStyle = '#FFFFFF';
  canvas.context.font = '10px Arial';
  canvas.context.fillText(MapleMap.names?.streetName ?? MapleMap.names?.mapName ?? '', px + 4, py + 11);
  canvas.context.restore();

  if (this.mode === 'min') return;

  const bounds = MapleMap.boundaries;
  if (!bounds) return;

  const bw = bounds.right - bounds.left || 1;
  const bh = bounds.bottom - bounds.top || 1;
  const areaX = px + 2;
  const areaY = py + barH + 2;
  const areaW = mapW - 4;
  const areaH = mapH - 4;

  // Draw WZ minimap image or fallback
  if (this.mapImgNode) {
    try {
      const img = this.mapImgNode.nGetImage?.();
      if (img) {
        canvas.context.save();
        canvas.context.drawImage(img, areaX, areaY, areaW, areaH);
        canvas.context.restore();
      }
    } catch (_) {
      canvas.context.save();
      canvas.context.fillStyle = '#223322';
      canvas.context.fillRect(areaX, areaY, areaW, areaH);
      canvas.context.restore();
    }
  } else {
    canvas.context.save();
    canvas.context.fillStyle = '#223322';
    canvas.context.fillRect(areaX, areaY, areaW, areaH);
    canvas.context.restore();
  }

  // Helper: world coord → minimap pixel, using centerX/Y offset from WZ
  const toMiniX = (wx: number) => areaX + ((wx + this.centerX) / (this.mag || 1)) * (areaW / (bw / (this.mag || 1)));
  const toMiniY = (wy: number) => areaY + ((wy + this.centerY) / (this.mag || 1)) * (areaH / (bh / (this.mag || 1)));
  // Simpler fallback if mag/center not loaded:
  const wToMX = (wx: number) => areaX + (wx - bounds.left) / bw * areaW;
  const wToMY = (wy: number) => areaY + (wy - bounds.top)  / bh * areaH;

  canvas.context.save();

  // Portal markers (type-2 = warp portals)
  MapleMap.portals?.forEach((p: any) => {
    if (p.type !== 2) return;
    const mx = wToMX(p.x);
    const my = wToMY(p.y);
    canvas.context.fillStyle = '#FFFF44';
    canvas.context.beginPath();
    canvas.context.arc(mx, my, 2, 0, Math.PI * 2);
    canvas.context.fill();
  });

  // NPC markers (blue dots)
  MapleMap.npcs?.forEach((npc: any) => {
    const nx = npc.x ?? (npc as any).pos?.x ?? 0;
    const ny = npc.cy ?? (npc as any).pos?.y ?? 0;
    const mx = wToMX(nx);
    const my = wToMY(ny);
    canvas.context.fillStyle = '#44AAFF';
    canvas.context.fillRect(mx - 1, my - 1, 3, 3);
  });

  // Other players (white dots)
  MapleMap.characters?.forEach((c: any) => {
    if (!c.pos) return;
    const mx = wToMX(c.pos.x);
    const my = wToMY(c.pos.y);
    canvas.context.fillStyle = '#FFFFFF';
    canvas.context.beginPath();
    canvas.context.arc(mx, my, 2, 0, Math.PI * 2);
    canvas.context.fill();
  });

  // Player dot (red)
  if (MyCharacter.pos) {
    const mx = wToMX(MyCharacter.pos.x);
    const my = wToMY(MyCharacter.pos.y);
    canvas.context.fillStyle = '#FF2222';
    canvas.context.strokeStyle = '#FFFFFF';
    canvas.context.lineWidth = 0.5;
    canvas.context.beginPath();
    canvas.context.arc(mx, my, 3, 0, Math.PI * 2);
    canvas.context.fill();
    canvas.context.stroke();
  }

  canvas.context.restore();

  // NPC list on hover (show first 6, or always in large mode)
  const mx = (canvas as any).mouseX;
  const my2 = (canvas as any).mouseY;
  const showNpcList = this.mode === 'large' ||
    (mx >= px && mx < px + mapW && my2 >= py && my2 < py + barH + mapH && MapleMap.npcs?.length > 0);
  if (showNpcList && MapleMap.npcs?.length > 0) {
    const listY = py + barH + mapH + 2;
    canvas.context.save();
    canvas.context.fillStyle = 'rgba(0,0,0,0.8)';
    canvas.context.fillRect(px, listY, mapW, Math.min(MapleMap.npcs.length, 6) * 13 + 4);
    canvas.context.font = '9px Arial';
    canvas.context.fillStyle = '#AADDFF';
    MapleMap.npcs.slice(0, 6).forEach((npc: any, i: number) => {
      const name = npc.strings?.name ?? `NPC ${npc.id}`;
      canvas.context.fillText(name.substring(0, 20), px + 3, listY + 11 + i * 13);
    });
    if (MapleMap.npcs.length > 6) {
      canvas.context.fillStyle = '#666688';
      canvas.context.fillText(`+${MapleMap.npcs.length - 6} more`, px + 3, listY + 11 + 6 * 13);
    }
    canvas.context.restore();
  }

  this.buttons.forEach((btn) => btn.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
};

UIMiniMap.destroy = function () {
  this.buttons.forEach((b) => ClickManager.removeButton(b));
  this.buttons = [];
  this.initialized = false;
};

export default UIMiniMap;
