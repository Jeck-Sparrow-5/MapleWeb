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
  mapImgNode: any;
  mag: number;
  centerX: number;
  centerY: number;
  mapName: string;
  buttons: MapleStanceButton[];
  mmNode: any;
  initialized: boolean;
  initialize: (canvas: GameCanvas) => Promise<void>;
  loadMapData: () => void;
  draw: (canvas: GameCanvas) => void;
  destroy: () => void;
  getRect: (camera: any) => { x: number; y: number; width: number; height: number };
  moveTo: (pos: { x: number; y: number }) => void;
}

const UIMiniMap = {} as UIMiniMapInterface;

UIMiniMap.initialize = async function (canvas: GameCanvas) {
  this.mode       = 'normal';
  this.x          = config.width - 150;
  this.y          = 4;
  this.mapImgNode = null;
  this.mag        = 1;
  this.centerX    = 0;
  this.centerY    = 0;
  this.mapName    = '';
  this.buttons    = [];
  this.initialized = true;

  // Assets live in UI.wz/UIWindow.img/MiniMap
  const uiWindow: any = await NXManager.get('UI.wz/UIWindow.img');
  this.mmNode = uiWindow?.MiniMap;

  const addBtn = (key: string, xOff: number, onClick: () => void) => {
    const node = this.mmNode?.[key];
    if (!node) return;
    const btn = new MapleStanceButton(canvas, {
      x: config.width - 152 + xOff, y: this.y,
      img: node.nChildren ?? [],
      isRelativeToCamera: true, isPartOfUI: true,
      onClick,
    });
    ClickManager.addButton(btn);
    this.buttons.push(btn);
  };

  addBtn('BtMin', 0,   () => { this.mode = this.mode === 'min' ? 'normal' : 'min'; });
  addBtn('BtMax', -16, () => { this.mode = this.mode === 'large' ? 'normal' : 'large'; });

  ClickManager.addDragableMenu(UIMiniMap);
  this.loadMapData();
};

UIMiniMap.loadMapData = function () {
  const wzNode = (MapleMap as any).wzNode;
  if (!wzNode) return;

  const miniMapNode = wzNode.miniMap;
  if (!miniMapNode) return;

  this.mag     = miniMapNode.mag?.nGet ? parseInt(miniMapNode.mag.nValue ?? '1') : 1;
  this.centerX = parseInt(miniMapNode.centerX?.nValue ?? '0');
  this.centerY = parseInt(miniMapNode.centerY?.nValue ?? '0');

  const imgNode = miniMapNode.canvas;
  if (imgNode) this.mapImgNode = imgNode;
};

UIMiniMap.draw = function (canvas: GameCanvas) {
  if (!this.initialized) return;

  const mapW = this.mode === 'large' ? 240 : 140;
  const mapH = this.mode === 'min'   ? 0   : this.mode === 'large' ? 160 : 80;
  const barH = 16;
  const px   = this.x;
  const py   = this.y;

  // Background — use WZ frame or fallback rect
  const bgImg = this.mode === 'large'
    ? this.mmNode?.MaxMap?.nGetImage?.()
    : this.mmNode?.MinMap?.nGetImage?.();

  if (bgImg) {
    canvas.drawImage({ img: bgImg, dx: px, dy: py, dw: mapW, dh: barH + mapH });
  } else {
    canvas.drawRect({ x: px, y: py, width: mapW, height: barH + mapH,
      color: '#000000', alpha: 0.65, strokeColor: '#555555', strokeWidth: 1 });
  }

  canvas.drawText({
    text: MapleMap.names?.streetName ?? MapleMap.names?.mapName ?? '',
    x: px + 4, y: py + 11, color: '#FFFFFF', fontSize: 10,
  });

  if (this.mode === 'min') {
    this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
    return;
  }

  const bounds = MapleMap.boundaries;
  if (!bounds) return;

  const areaX = px + 2;
  const areaY = py + barH + 2;
  const areaW = mapW - 4;
  const areaH = mapH - 4;
  const bw    = bounds.right  - bounds.left || 1;
  const bh    = bounds.bottom - bounds.top  || 1;

  // Map tile image
  if (this.mapImgNode) {
    try {
      const img = this.mapImgNode.nGetImage?.();
      if (img) {
        canvas.drawImage({ img, dx: areaX, dy: areaY, dw: areaW, dh: areaH });
      } else {
        canvas.drawRect({ x: areaX, y: areaY, width: areaW, height: areaH, color: '#223322' });
      }
    } catch (_) {
      canvas.drawRect({ x: areaX, y: areaY, width: areaW, height: areaH, color: '#223322' });
    }
  } else {
    canvas.drawRect({ x: areaX, y: areaY, width: areaW, height: areaH, color: '#223322' });
  }

  // World → minimap coord
  const toMX = (wx: number) => areaX + (wx - bounds.left) / bw * areaW;
  const toMY = (wy: number) => areaY + (wy - bounds.top)  / bh * areaH;

  // Portal markers (yellow)
  MapleMap.portals?.forEach((p: any) => {
    if (p.type !== 2) return;
    canvas.drawCircle({ x: toMX(p.x), y: toMY(p.y), radius: 2, color: '#FFFF44' });
  });

  // NPC markers (blue)
  MapleMap.npcs?.forEach((npc: any) => {
    const nx = npc.x ?? npc.pos?.x ?? 0;
    const ny = npc.cy ?? npc.pos?.y ?? 0;
    canvas.drawCircle({ x: toMX(nx), y: toMY(ny), radius: 2, color: '#44AAFF' });
  });

  // Other players (white)
  MapleMap.characters?.forEach((c: any) => {
    if (!c.pos) return;
    canvas.drawCircle({ x: toMX(c.pos.x), y: toMY(c.pos.y), radius: 2, color: '#FFFFFF' });
  });

  // Player dot (red)
  if (MyCharacter.pos) {
    canvas.drawCircle({ x: toMX(MyCharacter.pos.x), y: toMY(MyCharacter.pos.y),
      radius: 3, color: '#FF2222', strokeColor: '#FFFFFF', strokeWidth: 0.5 });
  }

  // NPC list on hover / large mode
  const mx = canvas.mouseX;
  const my = canvas.mouseY;
  const hovering = mx >= px && mx < px + mapW && my >= py && my < py + barH + mapH;
  const npcs: any[] = MapleMap.npcs ?? [];
  if ((hovering || this.mode === 'large') && npcs.length > 0) {
    const listY = py + barH + mapH + 2;
    const shown = npcs.slice(0, 6);
    canvas.drawRect({ x: px, y: listY, width: mapW,
      height: shown.length * 13 + 4, color: '#000000', alpha: 0.8 });
    shown.forEach((npc, i) => {
      const name = npc.strings?.name ?? `NPC ${npc.id}`;
      canvas.drawText({ text: name.substring(0, 20), x: px + 3,
        y: listY + 11 + i * 13, color: '#AADDFF', fontSize: 9 });
    });
    if (npcs.length > 6) {
      canvas.drawText({ text: `+${npcs.length - 6} more`, x: px + 3,
        y: listY + 11 + 6 * 13, color: '#666688', fontSize: 9 });
    }
  }

  this.buttons.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
};

UIMiniMap.getRect = function (_camera: any) {
  const mapW = this.mode === 'large' ? 240 : 140;
  const mapH = this.mode === 'min'   ? 0   : this.mode === 'large' ? 160 : 80;
  return { x: this.x, y: this.y, width: mapW, height: 16 + mapH };
};

UIMiniMap.moveTo = function (pos: { x: number; y: number }) {
  const dx = pos.x - this.x;
  const dy = pos.y - this.y;
  this.x = pos.x;
  this.y = pos.y;
  this.buttons.forEach(b => { b.x += dx; b.y += dy; });
};

UIMiniMap.destroy = function () {
  this.buttons.forEach(b => ClickManager.removeButton(b));
  this.buttons     = [];
  this.initialized = false;
};

export default UIMiniMap;
