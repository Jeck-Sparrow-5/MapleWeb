import WZManager from "./wz-utils/WZManager";
import SessionManager from "./SessionManager";
import { NpcTalkPacket } from "./Net/Packets/NpcInteractPacket";
import TouchReactorPacket from "./Net/Packets/TouchReactorPacket";
import CharInfoRequestPacket from "./Net/Packets/CharInfoRequestPacket";
import NpcTalkType from "./Constants/NpcTalkType";
import NameTagRenderer from "./UI/NameTagRenderer";
import ChatBubbleRenderer from "./UI/ChatBubbleRenderer";

import Background from "./Background";
import Foothold from "./FootHold";
import Portal from "./Portal";
import Tile from "./Tile";
import Obj from "./Obj";
import NPC from "./NPC";
import Monster from "./Monster";

import AudioManager from "./Audio/AudioManager";
import Camera, { CameraInterface } from "./Camera"; // debugging
import Timer from "./Timer";
import MapleCharacter from "./MapleCharacter";
import DropItemSprite from "./DropItem/DropItemSprite";
import GameCanvas from "./GameCanvas";
import UINpcTalk from './UI/UINpcTalk';

export interface MapleMap {
  id: number | string;
  wzNode: any;
  isTown: boolean;
  footholds: any;
  boundaries: any;
  reactors: any[];
  mists: any[];
  doors: any[];
  backgrounds: any;
  tiles: any;
  objects: any;
  characters: any;
  portals: any;
  names: any;
  npcs: any;
  npcDialog: UINpcTalk;
  monsters: any;
  itemDrops: any;
  PlayerCharacter: any;
  doneLoading: boolean;
  load: (id: number | string) => Promise<void>;
  addItemDrop: (itemDrop: any) => void;
  loadFootholds: (wzNode: any) => any;
  getLocationAboveFoothold: (footholdId: any) => any;
  getHorizontalFootHolds: () => any;
  getLocationAboveRandomFoothold: () => any;
  loadBoundaries: (wzNode: any, footholds: any) => any;
  getNearbyTownMapId: () => any;
  loadBackgrounds: (wzNode: any) => Promise<any>;
  loadPortals: (wzNode: any) => Promise<any>;
  loadNames: (id: number) => Promise<any>;
  loadTiles: (wzNode: any) => Promise<any>;
  loadObjects: (wzNode: any) => Promise<any>;
  loadNPCs: (wzNode: any) => Promise<any>;
  loadMonsters: (wzNode: any) => Promise<any>;
  spawnMonster: (opts: any) => Promise<void>;
  spawnNPC: (opts: any) => Promise<void>;
  update: (msPerTick: number) => void;
  render: (
    canvas: any,
    camera: any,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) => void;
  // New: click handling for NPCs.
  handleClick: (
    event: MouseEvent,
    canvasElement: HTMLElement,
    camera: CameraInterface
  ) => void;
}

const MapleMap = {} as MapleMap;
const minLoadTimeInSeconds = 1;

MapleMap.load = async function (id: number | string) {
  const startTime = new Date().getTime();
  this.doneLoading = false;

  let filename = "UI.wz/MapLogin.img";
  if (id !== "MapLogin") {
    const prefix = Math.floor((id as number) / 100000000);
    const strId = `${id}`.padStart(9, "0");
    filename = `Map.wz/Map/Map${prefix}/${strId}.img`;
  }
  this.wzNode = await WZManager.get(filename);
  this.isTown = !!this.wzNode.info?.town?.nValue;
  console.log(`is town: ${this.isTown}`);
  console.log("Map WZ Node:", this.wzNode);
  // Clear previous map entities
  this.npcs = [];
  this.monsters = [];
  this.characters = [];
  this.itemDrops = [];
  this.reactors = [];
  this.mists = [];
  this.doors = [];

  if (!this.PlayerCharacter) {
    this.PlayerCharacter = null;
  }

  const bgmPath = this.wzNode?.info?.bgm?.nValue;
  if (bgmPath) {
    AudioManager.playBackgroundMusic(bgmPath).catch(() => {});
  }

  this.footholds = this.loadFootholds(this.wzNode.foothold);
  this.boundaries = this.loadBoundaries(this.wzNode, this.footholds);
  Camera.setBoundaries(this.boundaries); // debugging
  Camera.lookAt(this.boundaries.left, this.boundaries.top); // debugging
  this.backgrounds = await this.loadBackgrounds(this.wzNode.back);
  this.tiles = await this.loadTiles(this.wzNode);
  this.objects = await this.loadObjects(this.wzNode);
  this.portals = await this.loadPortals(this.wzNode.portal);
  this.names = await this.loadNames(id as number);
  // Only load WZ-defined NPCs/mobs when offline; server sends SPAWN packets when connected
  if (!SessionManager.isConnected()) {
    await this.loadNPCs(this.wzNode.life);
    await this.loadMonsters(this.wzNode.life);
  }

  // Load reactors from WZ map data
  try {
    const reactorNode = this.wzNode.reactor;
    if (reactorNode?.nChildren) {
      for (const r of reactorNode.nChildren) {
        const reactorId = parseInt(r.id?.nValue ?? '0');
        let frames: any[] = [];
        let origin = { x: 0, y: 0 };
        try {
          const strId = `${reactorId}`.padStart(7, '0');
          const wzR = await WZManager.get(`Reactor.wz/${strId}.img`);
          const state0 = wzR?.nGet('0');
          if (state0?.nChildren) {
            frames = state0.nChildren.map((f: any) => ({
              img: f.nGetImage?.(),
              ox: f.origin?.nX ?? 0,
              oy: f.origin?.nY ?? 0,
              delay: parseInt(f.delay?.nValue ?? '100'),
            })).filter((f: any) => f.img);
          }
        } catch (_) {}

        this.reactors.push({
          id: reactorId,
          name: r.name?.nValue ?? '',
          x: parseInt(r.x?.nValue ?? '0'),
          y: parseInt(r.y?.nValue ?? '0'),
          oId: parseInt(r.nName ?? '0'),
          activated: false,
          frames,
          frame: 0,
          delay: 0,
        });
      }
    }
  } catch (_) {}

  Timer.doReset();

  this.id = id;

  const endTime = new Date().getTime();
  console.log(`MapleMap.load ${id} took ${endTime - startTime}ms`);
  setTimeout(() => {
    this.doneLoading = true;
  }, minLoadTimeInSeconds * 500 - (endTime - startTime));

  this.itemDrops = [];

  this.npcDialog = await UINpcTalk.fromOpts({
    isHidden: true,
    x: 300,
    y: 200,
  });
};

MapleMap.addItemDrop = function (itemDrop) {
  this.itemDrops.push(itemDrop);
};

MapleMap.loadFootholds = function (wzNode) {
  const footholds: any = {};

  (wzNode?.nChildren ?? []).forEach((layer: any) => {
    (layer?.nChildren ?? []).forEach((group: any) => {
      (group?.nChildren ?? []).forEach((fhNode: any) => {
        const fh = Foothold.fromWzNode(fhNode);
        footholds[fh.id] = fh;
      });
    });
  });

  Object.values(footholds).forEach((fh: any) => {
    fh.prev = footholds[fh.prev];
    fh.next = footholds[fh.next];
  });

  return footholds;
};

MapleMap.getLocationAboveFoothold = function (footholdId: any) {
  const foothold = this.footholds[footholdId];
  if (!foothold) return null;

  const x = (foothold.x1 + foothold.x2) / 2;
  const y = foothold.y1;

  return { x, y };
};

MapleMap.getHorizontalFootHolds = function () {
  const horizontalFootholds: any[] = [];
  Object.values(this.footholds).forEach((fh: any) => {
    if (fh.y1 === fh.y2) {
      horizontalFootholds.push(fh);
    }
  });
  return horizontalFootholds;
};

MapleMap.getLocationAboveRandomFoothold = function () {
  const randomFootholdId = Object.keys(this.getHorizontalFootHolds())[
    Math.floor(Math.random() * Object.keys(this.footholds).length)
  ];

  return this.getLocationAboveFoothold(randomFootholdId);
};

MapleMap.loadBackgrounds = async function (wzNode) {
  const backgrounds = [];

  for (const backNode of (wzNode?.nChildren ?? [])) {
    if (!backNode.bS?.nValue) {
      continue;
    }
    try {
      const bg = await Background.fromWzNode(backNode);
      backgrounds.push(bg);
    } catch (_) {}
  }

  backgrounds.sort((a, b) => a.z - b.z);

  return backgrounds;
};

MapleMap.loadPortals = async function (wzNode) {
  const portals = [];

  // Build map name lookup for portal destination labels
  let mapNames: Record<number, string> = {};
  try {
    const strMap = await WZManager.get('String.wz/Map.img');
    const walkMapNames = (node: any) => {
      if (!node?.nChildren) return;
      node.nChildren.forEach((child: any) => {
        const id = parseInt(child.nName);
        if (!isNaN(id)) {
          const name = child.mapName?.nValue ?? child.nGet?.('mapName')?.nValue ?? '';
          if (name) mapNames[id] = name;
        } else {
          walkMapNames(child);
        }
      });
    };
    walkMapNames(strMap);
  } catch (_) {}

  for (const portalNode of (wzNode?.nChildren ?? [])) {
    const portal = await Portal.fromWzNode(portalNode);
    if (portal.toMap > 0 && mapNames[portal.toMap]) {
      (portal as any).toMapName = mapNames[portal.toMap];
    }
    portals.push(portal);
  }

  return portals;
};

MapleMap.loadNames = async function (id: number) {
  const strMap: any = await WZManager.get("String.wz/Map.img");

  const firstDigit = Math.floor(id / 100000000);
  const firstTwoDigits = Math.floor(id / 10000000);
  const firstThreeDigits = Math.floor(id / 1000000);

  let area = "maple";
  if (firstTwoDigits === 54) {
    area = "singapore";
  } else if (firstDigit === 9) {
    area = "etc";
  } else if (firstDigit === 8) {
    area = "jp";
  } else if (firstThreeDigits === 682) {
    area = "HalloweenGL";
  } else if (firstTwoDigits === 60 || firstTwoDigits === 61) {
    area = "MasteriaGL";
  } else if (firstTwoDigits === 67 || firstTwoDigits === 68) {
    area = "weddingGL";
  } else if (firstDigit === 2) {
    area = "ossyria";
  } else if (firstDigit === 1) {
    area = "victoria";
  }

  const nameNode: any = strMap.nGet(area)?.nGet(id);
  const streetName = nameNode?.nGet("streetName")?.nGet("nValue", "") ?? "";
  const mapName = nameNode?.nGet("mapName")?.nGet("nValue", "") ?? "";

  return {
    streetName,
    mapName,
  };
};

MapleMap.loadTiles = async function (wzNode) {
  const tiles = [];
  for (let layer = 0; layer <= 7; layer += 1) {
    for (const tileNode of (wzNode[layer]?.tile?.nChildren ?? [])) {
      const tile = await Tile.fromWzNode(tileNode);
      tile.layer = layer;
      tiles.push(tile);
    }
  }

  tiles.sort((a, b) => a.z - b.z);

  return tiles;
};

MapleMap.loadObjects = async function (wzNode) {
  const objects = [];

  for (let layer = 0; layer <= 7; layer += 1) {
    for (const objNode of (wzNode[layer]?.obj?.nChildren ?? [])) {
      const obj = await Obj.fromWzNode(objNode);
      obj.layer = layer;
      objects.push(obj);
    }
  }

  objects.sort((a, b) => (a.z === b.z ? a.zid - b.zid : a.z - b.z));

  return objects;
};

let footholds: any = [];
async function initializeMonster(opts: any) {
  const mob = await Monster.fromOpts(opts);
  const whichFoothold = footholds[mob.fh];
  if (whichFoothold) {
    mob.layer = whichFoothold.layer;
  }
  return mob;
}

MapleMap.spawnMonster = async function (opts = {}) {
  const mob = await initializeMonster(opts);
  this.monsters.push(mob);
};

let currentMonsters: Monster[] = [];
MapleMap.loadMonsters = async function (wzNode) {
  footholds = this.footholds;

  for (const mobNode of (wzNode?.nChildren ?? []).filter(
    (n: any) => n.type?.nValue === "m"
  )) {
    console.log("mobNode", mobNode);
    await this.spawnMonster({
      oId: null,
      id: mobNode.id.nValue,
      x: mobNode.x.nValue,
      y: mobNode.y.nValue,
      stance: "",
      fh: mobNode.fh.nValue,
      minX: mobNode.rx0.nValue,
      maxX: mobNode.rx1.nValue,
      map: this,
    });
  }
  currentMonsters = this.monsters;
};

// --- Modified NPC spawning to include position and dialogue support ---
MapleMap.spawnNPC = async function (opts = {}) {
  const npc = await NPC.fromOpts(opts);
  // Set a position property using x and cy (vertical center) for rendering and click detection.
  (npc as any).pos = { x: opts.x, y: opts.cy };
  const whichFoothold = this.footholds[npc.fh];
  if (whichFoothold) {
    npc.layer = whichFoothold.layer;
  }
  console.log(`Spawned NPC ${opts.id} at (${opts.x}, ${opts.cy})`);
  this.npcs.push(npc);
};

MapleMap.loadNPCs = async function (wzNode) {
  for (const npcNode of (wzNode?.nChildren ?? []).filter(
    (n: any) => n.type?.nValue === "n"
  )) {
    await this.spawnNPC({
      oId: null,
      id: npcNode.id.nValue,
      x: npcNode.x.nValue,
      cy: npcNode.cy.nValue,
      f: npcNode.nGet("f")?.nGet("nValue", 0) ?? 0,
      fh: npcNode.fh.nValue
    });
  }
};

MapleMap.loadBoundaries = function (wzNode, footholds) {
  if ("VRLeft" in wzNode.info) {
    return {
      left: wzNode.info?.VRLeft?.nValue ?? 0,
      right: wzNode.info?.VRRight?.nValue ?? 0,
      top: wzNode.info?.VRTop?.nValue ?? 0,
      bottom: wzNode.info?.VRBottom?.nValue ?? 0,
    };
  }

  const xValues: any = Object.values(footholds).reduce((acc: any, fh: any) => {
    acc.push(fh.x1, fh.x2);
    return acc;
  }, []);

  const yValues: any = Object.values(footholds).reduce((acc: any, fh: any) => {
    acc.push(fh.y1, fh.y2);
    return acc;
  }, []);

  return {
    left: Math.min(...xValues) + 10,
    right: Math.max(...xValues) - 10,
    top: Math.min(...yValues) - 360,
    bottom: Math.max(...yValues) + 110,
  };
};

MapleMap.getNearbyTownMapId = function () {
  if (this.isTown) {
    return this.id;
  }
  console.log(this.wzNode);
  return this.wzNode.info?.returnMap?.nValue;
};

MapleMap.update = function (msPerTick) {
  if (!this.doneLoading) {
    return;
  }

  // Remove destroyed monsters.
  this.monsters = this.monsters.filter((m: Monster) => !m.destroyed);

  this.backgrounds.forEach((bg: Background) => bg.update(msPerTick));
  this.objects.forEach((obj: Obj) => obj.update(msPerTick));
  this.npcs.forEach((npc: NPC) => npc.update(msPerTick));
  this.monsters.forEach((mob: Monster) => mob.update(msPerTick));
  this.characters.forEach((chr: MapleCharacter) => chr.update(msPerTick));
  this.portals.forEach((p: Portal) => p.update(msPerTick));

  // Advance reactor animation frames
  this.reactors?.forEach((r: any) => {
    if (r.activated || !r.frames?.length) return;
    r.delay = (r.delay ?? 0) + msPerTick;
    const frame = r.frames[r.frame ?? 0];
    if (r.delay >= (frame?.delay ?? 100)) {
      r.delay = 0;
      r.frame = ((r.frame ?? 0) + 1) % r.frames.length;
    }
  });

  this.itemDrops = this.itemDrops.filter(
    (drop: DropItemSprite) => !drop.destroyed
  );
  this.itemDrops.forEach((drop: DropItemSprite) => {
    drop.update(msPerTick);
  });
};

MapleMap.render = function (
  canvas: GameCanvas,
  camera: CameraInterface,
  lag: number,
  msPerTick: number,
  tdelta: number
) {
  if (!this.doneLoading) {
    return;
  }

  currentMonsters = currentMonsters.filter((m) => !m.destroyed);
  const draw = (obj: any) =>
    obj.draw(canvas, camera, lag, msPerTick, tdelta);

  this.backgrounds.filter((bg: Background) => !bg.front).forEach(draw);

  for (let i = 0; i <= 7; i += 1) {
    const inCurrentLayer = (obj: Obj) => obj.layer === i;
    this.objects.filter(inCurrentLayer).forEach(draw);
    this.tiles.filter(inCurrentLayer).forEach(draw);
    this.monsters.filter(inCurrentLayer).forEach(draw);
    this.characters.filter(inCurrentLayer).forEach(draw);
    this.npcs.filter(inCurrentLayer).forEach(draw);
  }

  const notInAnyLayer = (obj: any) => !(obj.layer >= 0 && obj.layer <= 7);
  currentMonsters.filter(notInAnyLayer).forEach(draw);
  this.monsters.filter(notInAnyLayer).forEach(draw);
  this.characters.filter(notInAnyLayer).forEach(draw);
  this.npcs.filter(notInAnyLayer).forEach(draw);

  this.portals.forEach(draw);
  this.backgrounds.filter((bg: Background) => !!bg.front).forEach(draw);

  // Draw level-up bubbles for characters.
  const drawLevelUp = (c: MapleCharacter) => {
    const levelUpFrame = c.levelUpFrames[c.levelUpFrame];
    canvas.drawImage({
      img: levelUpFrame.nGetImage(),
      dx: c.pos.x - levelUpFrame.origin.nX - camera.x,
      dy: c.pos.y - levelUpFrame.origin.nY - camera.y,
    });
  };
  this.characters
    .filter((c: MapleCharacter) => !!c.levelingUp)
    .forEach(drawLevelUp);

  if (this.PlayerCharacter) {
    this.PlayerCharacter.draw(canvas, camera, lag, msPerTick, tdelta);
    if (this.PlayerCharacter.levelingUp) {
      drawLevelUp(this.PlayerCharacter);
    }
  }

  this.itemDrops.forEach((drop: DropItemSprite) => {
    drop.draw(canvas, camera);
  });

  // Reactors (clickable objects)
  this.reactors?.forEach((r: any) => {
    if (r.activated) return;
    const rx = r.x - camera.x;
    const ry = r.y - camera.y;
    const frame = r.frames?.[r.frame ?? 0];
    if (frame?.img) {
      canvas.context.drawImage(frame.img, rx - (frame.ox ?? 0), ry - (frame.oy ?? 0));
    } else {
      // Fallback yellow box
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(255,200,50,0.6)';
      canvas.context.strokeStyle = '#FFDD00';
      canvas.context.fillRect(rx - 15, ry - 30, 30, 30);
      canvas.context.strokeRect(rx - 15, ry - 30, 30, 30);
      canvas.context.restore();
    }
  });

  // Hit flash effects
  const hitNow = Date.now();
  if ((this as any).hitEffects) {
    (this as any).hitEffects = (this as any).hitEffects.filter((e: any) => hitNow - e.startTime < e.duration);
    (this as any).hitEffects.forEach((e: any) => {
      const alpha = 1 - (hitNow - e.startTime) / e.duration;
      const radius = 18 + (1 - alpha) * 10;
      canvas.context.save();
      canvas.context.globalAlpha = alpha * 0.8;
      canvas.context.strokeStyle = '#FFEE44';
      canvas.context.lineWidth = 2;
      canvas.context.beginPath();
      canvas.context.arc(e.x - camera.x, e.y - camera.y, radius, 0, Math.PI * 2);
      canvas.context.stroke();
      // Star lines
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        canvas.context.beginPath();
        canvas.context.moveTo(e.x - camera.x + dx * 0.5, e.y - camera.y + dy * 0.5);
        canvas.context.lineTo(e.x - camera.x + dx * 1.3, e.y - camera.y + dy * 1.3);
        canvas.context.stroke();
      }
      canvas.context.restore();
    });
  }

  // Monster status indicators (frozen=blue, stunned=grey, poisoned=green)
  this.monsters?.forEach((m: any) => {
    if (!(m.statusMask ?? 0)) return;
    const mx = (m.pos?.x ?? m.x) - camera.x;
    const my = (m.pos?.y ?? m.y) - camera.y - (m.height ?? 60) - 8;
    canvas.context.save();
    if (m.statusMask & 0x2) {          // stun
      canvas.context.fillStyle = '#AAAAFF';
      canvas.context.fillText('★', mx - 4, my);
    } else if (m.statusMask & 0x200) { // freeze
      canvas.context.fillStyle = '#44AAFF';
      canvas.context.fillText('❄', mx - 4, my);
    } else if (m.statusMask & 0x400) { // poison
      canvas.context.fillStyle = '#44FF44';
      canvas.context.fillText('☠', mx - 4, my);
    }
    canvas.context.restore();
    // Clear expired status
    if (m.statusExpiry && Date.now() > m.statusExpiry) m.statusMask = 0;
  });

  // Mist clouds (poison, smoke)
  const now = Date.now();
  if ((this as any).mists) {
    (this as any).mists = (this as any).mists.filter((m: any) => now < m.expiry);
    (this as any).mists.forEach((mist: any) => {
      canvas.context.save();
      canvas.context.globalAlpha = 0.35;
      canvas.context.fillStyle = mist.type === 2 ? '#88FF44' : '#AAAAFF';
      canvas.context.fillRect(
        mist.rect.l - camera.x, mist.rect.t - camera.y,
        mist.rect.r - mist.rect.l, mist.rect.b - mist.rect.t
      );
      canvas.context.restore();
    });
  }

  // Mystic doors
  if ((this as any).doors) {
    (this as any).doors.forEach((door: any) => {
      const dx = door.x - camera.x;
      const dy = door.y - camera.y;
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(150,100,255,0.7)';
      canvas.context.strokeStyle = '#AAAAFF';
      canvas.context.beginPath();
      canvas.context.ellipse(dx, dy, 20, 30, 0, 0, Math.PI * 2);
      canvas.context.fill();
      canvas.context.stroke();
      canvas.context.restore();
    });
  }

  // Pet rendering (above their owner)
  const renderPets = (owner: any) => {
    const pets = (owner as any).pets;
    if (!pets?.length) return;
    pets.forEach((pet: any) => {
      if (!pet?.visible) return;
      const px = (pet.x ?? owner.pos?.x ?? 0) - camera.x;
      const py = (pet.y ?? owner.pos?.y ?? 0) - 30 - camera.y;
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(255,180,80,0.8)';
      canvas.context.strokeStyle = '#FFAA44';
      canvas.context.lineWidth = 1;
      canvas.context.beginPath();
      canvas.context.ellipse(px, py, 14, 10, 0, 0, Math.PI * 2);
      canvas.context.fill();
      canvas.context.stroke();
      canvas.context.fillStyle = '#FFFFFF';
      canvas.context.font = '8px Arial';
      canvas.context.textAlign = 'center';
      canvas.context.fillText('Pet', px, py + 3);
      canvas.context.textAlign = 'left';
      canvas.context.restore();
    });
  };
  if (this.PlayerCharacter) renderPets(this.PlayerCharacter);
  this.characters?.forEach((c: any) => renderPets(c));

  // Name tags above NPCs
  this.npcs.forEach((npc: any) => {
    const nx = npc.x ?? (npc as any).pos?.x ?? 0;
    const ny = (npc.cy ?? (npc as any).pos?.y ?? 0) - 80;
    const name = npc.strings?.name ?? '';
    if (name) NameTagRenderer.draw(canvas, camera, nx, ny, name, '5');
    ChatBubbleRenderer.draw(canvas, camera, npc.oId ?? npc.id, nx, ny);
  });

  // Name tags + bubbles above other players
  this.characters.forEach((char: any) => {
    if (!char.pos) return;
    NameTagRenderer.draw(canvas, camera, char.pos.x, char.pos.y - 90, char.name ?? '', '3');
    ChatBubbleRenderer.draw(canvas, camera, char.id, char.pos.x, char.pos.y - 90);
  });

  // Player name tag + bubble
  if (this.PlayerCharacter?.pos) {
    const pc = this.PlayerCharacter as any;
    NameTagRenderer.draw(canvas, camera, pc.pos.x, pc.pos.y - 90, pc.name ?? '', '3');
    ChatBubbleRenderer.draw(canvas, camera, pc.id ?? 0, pc.pos.x, pc.pos.y - 90);
  }

  // Portal name on hover
  if (canvas.mouseX !== undefined && canvas.mouseY !== undefined) {
    this.portals.forEach((portal: any) => {
      if (!portal.toMapName) return;
      const px = portal.x - camera.x;
      const py = portal.y - camera.y;
      if (Math.abs(canvas.mouseX - px) < 30 && Math.abs(canvas.mouseY - py) < 30) {
        canvas.context.save();
        canvas.context.fillStyle = 'rgba(0,0,0,0.75)';
        canvas.context.fillRect(px - 40, py - 22, 80, 16);
        canvas.context.fillStyle = '#FFFFFF';
        canvas.context.font = '10px Arial';
        canvas.context.textAlign = 'center';
        canvas.context.fillText(portal.toMapName, px, py - 9);
        canvas.context.textAlign = 'left';
        canvas.context.restore();
      }
    });
  }

  Object.values(this.footholds).forEach(draw);

  this.npcDialog.draw(canvas, camera, lag, msPerTick, tdelta);
};

// --- New: Simple click handler for NPCs ---
// When a click occurs, convert mouse coordinates into canvas coordinates,
// check each NPC (assumed to be a 56x70 rectangle), and if clicked, log the NPC and set its dialogue flag.
MapleMap.handleClick = function (
  event: MouseEvent,
  canvasElement: HTMLElement,
  camera: CameraInterface
) {
  const rect = canvasElement.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  console.log("Click detected at:", mouseX, mouseY);

  // Reactor click
  this.reactors?.forEach((r: any) => {
    if (r.activated) return;
    const rx = r.x - camera.x;
    const ry = r.y - camera.y;
    if (mouseX >= rx - 15 && mouseX <= rx + 15 && mouseY >= ry - 30 && mouseY <= ry) {
      r.activated = true;
      if (SessionManager.isConnected()) {
        new TouchReactorPacket(r.oId ?? r.id ?? 0).dispatch();
      }
    }
  });

  // Click on another player → request their info
  this.characters?.forEach((chr: any) => {
    if (!chr.pos) return;
    const cx = chr.pos.x - camera.x;
    const cy = chr.pos.y - camera.y;
    if (mouseX >= cx - 20 && mouseX <= cx + 20 && mouseY >= cy - 60 && mouseY <= cy + 5) {
      if (SessionManager.isConnected() && chr.id) {
        new CharInfoRequestPacket(chr.id).dispatch();
      }
    }
  });

  this.npcs.forEach(async (npc: any) => {
    if (!npc.pos) return;
    // Convert NPC's world position to canvas coordinates.
    const npcX = npc.pos.x - camera.x - 25;
    const npcY = npc.pos.y - camera.y - 70;
    //console.log(`Checking NPC ${npc.id}: screen coords (${npcX}, ${npcY})`);
    // Check if the mouse click is within the NPC's bounding box (56x70).
    if (
      mouseX >= npcX &&
      mouseX <= npcX + 56 &&
      mouseY >= npcY &&
      mouseY <= npcY + 70
    ) {
      console.log(`Clicked on NPC ${npc.id}:`, npc);
      if (SessionManager.isConnected()) {
        new NpcTalkPacket(npc.oId ?? npc.id).dispatch();
      } else {
        await this.npcDialog.changeText(npc.id, NpcTalkType.TextOnly, npc.strings?.name ?? 'NPC', 'Hello');
        this.npcDialog.setIsHidden(false);
      }
    }
  });
};


export default MapleMap;
