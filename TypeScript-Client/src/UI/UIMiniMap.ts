import GameCanvas from '../GameCanvas';
import MapleMap from '../MapleMap';
import MyCharacter from '../MyCharacter';
import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import config from '../Config';

type MiniMapMode = 'min' | 'normal' | 'large';

const MAP_W_NORMAL = 140;
const MAP_W_LARGE  = 240;
const MAP_H_NORMAL = 80;
const MAP_H_LARGE  = 160;
const BAR_H        = 16;

interface UIMiniMapInterface {
  mode: MiniMapMode;
  x: number;
  y: number;
  mapImgNode: any;
  mag: number;
  centerX: number;
  centerY: number;
  buttons: MapleStanceButton[];
  mmNode: any;        // StatusBar.img/MiniMap
  bgImg: any;         // normal background frame
  bgLargeImg: any;    // large background frame
  nameTagImg: any;    // title bar image
  initialized: boolean;
  initialize: (canvas: GameCanvas) => Promise<void>;
  loadMapData: () => void;
  draw: (canvas: GameCanvas) => void;
  destroy: () => void;
}

const UIMiniMap = {} as UIMiniMapInterface;

UIMiniMap.initialize = async function (canvas: GameCanvas) {
  this.mode       = 'normal';
  this.mapImgNode = null;
  this.mag        = 1;
  this.centerX    = 0;
  this.centerY    = 0;
  this.buttons    = [];
  this.initialized = true;

  const mapW = MAP_W_NORMAL;
  // Anchor top-right, respecting screen width
  this.x = config.width - mapW - 4;
  this.y = 4;

  const statusBar: any = await NXManager.get('UI.wz/StatusBar.img');
  this.mmNode = statusBar?.MiniMap;

  // Load WZ frame images if available
  this.bgImg      = this.mmNode?.backgrnd?.nGetImage?.()   ?? null;
  this.bgLargeImg = this.mmNode?.MaxMap?.nGetImage?.()     ?? null;
  this.nameTagImg = this.mmNode?.nameTag?.nGetImage?.()    ?? null;

  const addBtn = (key: string, xOff: number, onClick: () => void) => {
    const node = this.mmNode?.[key];
    if (!node) return;
    const btn = new MapleStanceButton(canvas, {
      x: this.x + xOff, y: this.y,
      img: node.nChildren ?? [],
      isRelativeToCamera: true, isPartOfUI: true,
      onClick,
    });
    ClickManager.addButton(btn);
    this.buttons.push(btn);
  };

  addBtn('BtMin', mapW - 16, () => { this.mode = this.mode === 'min' ? 'normal' : 'min'; });
  addBtn('BtMax', mapW - 32, () => { this.mode = this.mode === 'large' ? 'normal' : 'large'; });

  this.loadMapData();
};

UIMiniMap.loadMapData = function () {
  const wzNode = (MapleMap as any).wzNode;
  if (!wzNode) return;

  const mm = wzNode.miniMap;
  if (!mm) return;

  this.mag     = parseInt(mm.mag?.nValue     ?? '1')  || 1;
  this.centerX = parseInt(mm.centerX?.nValue ?? '0')  || 0;
  this.centerY = parseInt(mm.centerY?.nValue ?? '0')  || 0;
  this.mapImgNode = mm.canvas ?? null;
};

UIMiniMap.draw = function (canvas: GameCanvas) {
  if (!this.initialized) return;

  const mapW = this.mode === 'large' ? MAP_W_LARGE : MAP_W_NORMAL;
  const mapH = this.mode === 'min'   ? 0           : this.mode === 'large' ? MAP_H_LARGE : MAP_H_NORMAL;
  const px   = config.width - mapW - 4; // recompute so large mode anchors correctly
  const py   = this.y;

  // Title bar — WZ image or fallback rect
  if (this.nameTagImg) {
    canvas.drawImage({ img: this.nameTagImg, dx: px, dy: py, dw: mapW, dh: BAR_H });
  } else {
    canvas.drawRect({ x: px, y: py, width: mapW, height: BAR_H, color: '#000000', alpha: 0.75, strokeColor: '#555555', strokeWidth: 1 });
  }

  const mapName = (MapleMap as any).names?.streetName ?? (MapleMap as any).names?.mapName ?? '';
  canvas.drawText({ text: mapName, x: px + 6, y: py + 11, color: '#FFFFFF', fontSize: 10 });

  if (this.mode === 'min') {
    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
    return;
  }

  const areaX = px + 2;
  const areaY = py + BAR_H + 1;
  const areaW = mapW - 4;
  const areaH = mapH - 2;

  // Map area background
  if (this.bgImg && this.mode !== 'large') {
    canvas.drawImage({ img: this.bgImg, dx: px, dy: areaY, dw: mapW, dh: mapH });
  } else if (this.bgLargeImg && this.mode === 'large') {
    canvas.drawImage({ img: this.bgLargeImg, dx: px, dy: areaY, dw: mapW, dh: mapH });
  } else {
    canvas.drawRect({ x: px, y: areaY, width: mapW, height: mapH, color: '#0d1a0d', alpha: 0.85, strokeColor: '#334433', strokeWidth: 1 });
  }

  // WZ minimap image (map tiles)
  if (this.mapImgNode) {
    try {
      const img = this.mapImgNode.nGetImage?.();
      if (img) canvas.drawImage({ img, dx: areaX, dy: areaY, dw: areaW, dh: areaH });
    } catch (_) {}
  }

  // Coordinate mapper: world → minimap pixel
  // Uses WZ mag + centerX/Y when available, else simple bounds normalisation
  const bounds = MapleMap.boundaries;
  if (!bounds) {
    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
    return;
  }

  const bw = bounds.right  - bounds.left || 1;
  const bh = bounds.bottom - bounds.top  || 1;

  const toMX = (wx: number): number => {
    if (this.mag > 1 && (this.centerX || this.centerY)) {
      // WZ minimap coordinates: (worldX / mag) + centerX gives pixel in minimap image
      const imgW = this.mapImgNode ? (this.mapImgNode.nGetImage?.()?.width  || areaW) : areaW;
      const imgH = this.mapImgNode ? (this.mapImgNode.nGetImage?.()?.height || areaH) : areaH;
      const px2 = (wx / this.mag) + this.centerX;
      return areaX + (px2 / imgW) * areaW;
    }
    return areaX + (wx - bounds.left) / bw * areaW;
  };
  const toMY = (wy: number): number => {
    if (this.mag > 1 && (this.centerX || this.centerY)) {
      const imgH = this.mapImgNode ? (this.mapImgNode.nGetImage?.()?.height || areaH) : areaH;
      const py2 = (wy / this.mag) + this.centerY;
      return areaY + (py2 / imgH) * areaH;
    }
    return areaY + (wy - bounds.top) / bh * areaH;
  };

  // Portal markers (yellow)
  (MapleMap as any).portals?.forEach((p: any) => {
    if (p.type !== 2) return;
    canvas.drawRect({ x: toMX(p.x) - 1, y: toMY(p.y) - 1, width: 3, height: 3, color: '#FFFF44' });
  });

  // NPC markers (blue)
  (MapleMap as any).npcs?.forEach((npc: any) => {
    const nx = npc.x ?? npc.pos?.x ?? 0;
    const ny = npc.cy ?? npc.pos?.y ?? 0;
    canvas.drawRect({ x: toMX(nx) - 1, y: toMY(ny) - 1, width: 3, height: 3, color: '#44AAFF' });
  });

  // Other players (white)
  (MapleMap as any).characters?.forEach((c: any) => {
    if (!c.pos) return;
    canvas.drawRect({ x: toMX(c.pos.x) - 1, y: toMY(c.pos.y) - 1, width: 3, height: 3, color: '#FFFFFF' });
  });

  // Player dot (red, slightly larger)
  if (MyCharacter.pos) {
    const dx = toMX(MyCharacter.pos.x);
    const dy = toMY(MyCharacter.pos.y);
    canvas.drawRect({ x: dx - 2, y: dy - 2, width: 5, height: 5, color: '#FF3333' });
    canvas.drawRect({ x: dx - 1, y: dy - 1, width: 3, height: 3, color: '#FF8888' });
  }

  // NPC name list (hover or large mode)
  const npcs: any[] = (MapleMap as any).npcs ?? [];
  const mx = canvas.mouseX;
  const my = canvas.mouseY;
  const hovering = mx >= px && mx < px + mapW && my >= py && my < py + BAR_H + mapH;
  if ((hovering || this.mode === 'large') && npcs.length > 0) {
    const listY = py + BAR_H + mapH + 2;
    const shown = npcs.slice(0, 6);
    canvas.drawRect({ x: px, y: listY, width: mapW, height: shown.length * 13 + 4, color: '#000000', alpha: 0.8 });
    shown.forEach((npc, i) => {
      const name = npc.strings?.name ?? `NPC ${npc.id}`;
      canvas.drawText({ text: name.substring(0, 22), x: px + 4, y: listY + 11 + i * 13, color: '#AADDFF', fontSize: 9 });
    });
    if (npcs.length > 6) {
      canvas.drawText({ text: `+${npcs.length - 6} more`, x: px + 4, y: listY + 11 + 6 * 13, color: '#666688', fontSize: 9 });
    }
  }

  // Update button x for current mapW (large mode shifts left)
  this.buttons.forEach((b, i) => {
    b.x = px + mapW - 16 * (i + 1);
  });
  this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
};

UIMiniMap.destroy = function () {
  this.buttons.forEach(b => ClickManager.removeButton(b));
  this.buttons    = [];
  this.initialized = false;
};

export default UIMiniMap;
