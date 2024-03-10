import WZManager from "./wz-utils/WZManager";

import Background from "./Background";
import Foothold from "./FootHold";
import Portal from "./Portal";
import Tile from "./Tile";
import Obj from "./Obj";
import NPC from "./NPC";
import Monster from "./Monster";

import AudioManager from "./Audio/AudioManager";
import Camera, { CameraInterface } from "./Camera"; //debugging
import Timer from "./Timer";
import MapleCharacter from "./MapleCharacter";
import DropItemSprite from "./DropItem/DropItemSprite";
import GameCanvas from "./GameCanvas";

export interface MapleMap {
  id: number | string;
  wzNode: any;
  isTown: boolean;
  footholds: any;
  boundaries: any;
  backgrounds: any;
  tiles: any;
  objects: any;
  characters: any;
  portals: any;
  names: any;
  npcs: any;
  monsters: any;
  itemDrops: any;
  clickManagerObjects: any;
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
  this.isTown = !!this.wzNode.info.town.nValue;
  console.log(`is town: ${this.isTown}`);
  console.log("Map WZ Node:", this.wzNode);
  this.npcs = [];
  this.monsters = [];
  this.characters = [];

  if (!this.PlayerCharacter) {
    this.PlayerCharacter = null;
  }

  // disabled for debugging other sound
  await AudioManager.playBackgroundMusic(this.wzNode.info.bgm.nValue);

  this.footholds = this.loadFootholds(this.wzNode.foothold);
  this.boundaries = this.loadBoundaries(this.wzNode, this.footholds);
  Camera.setBoundaries(this.boundaries); //debugging
  Camera.lookAt(this.boundaries.left, this.boundaries.top); //debugging
  this.backgrounds = await this.loadBackgrounds(this.wzNode.back);
  this.tiles = await this.loadTiles(this.wzNode);
  this.objects = await this.loadObjects(this.wzNode);
  this.clickManagerObjects = [];
  this.portals = await this.loadPortals(this.wzNode.portal);
  this.names = await this.loadNames(id as number);
  await this.loadNPCs(this.wzNode.life);
  await this.loadMonsters(this.wzNode.life);

  Timer.doReset();

  this.id = id;

  const endTime = new Date().getTime();
  console.log(`MapleMap.load ${id} took ${endTime - startTime}ms`);
  setTimeout(() => {
    this.doneLoading = true;
  }, minLoadTimeInSeconds * 500 - (endTime - startTime));

  this.itemDrops = [];
};

MapleMap.addItemDrop = function (itemDrop) {
  this.itemDrops.push(itemDrop);
};

MapleMap.loadFootholds = function (wzNode) {
  const footholds: any = {};

  wzNode.nChildren.forEach((layer: any) => {
    layer.nChildren.forEach((group: any) => {
      group.nChildren.forEach((fhNode: any) => {
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

  // Calculate the x-coordinate at the middle of the foothold
  const x = (foothold.x1 + foothold.x2) / 2;

  // Calculate the y-coordinate above the target foothold
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

  for (const backNode of wzNode.nChildren) {
    if (!backNode.bS.nValue) {
      continue;
    }

    const bg = await Background.fromWzNode(backNode);
    backgrounds.push(bg);
  }

  backgrounds.sort((a, b) => a.z - b.z);

  return backgrounds;
};

MapleMap.loadPortals = async function (wzNode) {
  const portals = [];

  for (const portalNode of wzNode.nChildren) {
    const portal = await Portal.fromWzNode(portalNode);
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

  const nameNode: any = strMap.nGet(area).nGet(id);
  const streetName = nameNode.nGet("streetName").nGet("nValue", "");
  const mapName = nameNode.nGet("mapName").nGet("nValue", "");

  return {
    streetName,
    mapName,
  };
};

MapleMap.loadTiles = async function (wzNode) {
  const tiles = [];
  for (let layer = 0; layer <= 7; layer += 1) {
    for (const tileNode of wzNode[layer].tile.nChildren) {
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
    for (const objNode of wzNode[layer].obj.nChildren) {
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
  // console.log('spawning monster', opts, mob, footholds);
  const whichFoothold = footholds[mob.fh];
  if (!!whichFoothold) {
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

  for (const mobNode of wzNode.nChildren.filter(
    (n: any) => n.type.nValue === "m"
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

    // for debugging- will load only 1 monster
    // return;
  }
  currentMonsters = this.monsters;
};

MapleMap.spawnNPC = async function (opts = {}) {
  const npc = await NPC.fromOpts(opts);
  const whichFoothold = this.footholds[npc.fh];
  if (!!whichFoothold) {
    npc.layer = whichFoothold.layer;
  }

  this.npcs.push(npc);
};

MapleMap.loadNPCs = async function (wzNode) {
  for (const npcNode of wzNode.nChildren.filter(
    (n: any) => n.type.nValue === "n"
  )) {
    await this.spawnNPC({
      oId: null,
      id: npcNode.id.nValue,
      x: npcNode.x.nValue,
      cy: npcNode.cy.nValue,
      f: npcNode.nGet("f").nGet("nValue", 0),
      fh: npcNode.fh.nValue,
    });
  }
};

MapleMap.loadBoundaries = function (wzNode, footholds) {
  if ("VRLeft" in wzNode.info) {
    return {
      left: wzNode.info.VRLeft.nValue,
      right: wzNode.info.VRRight.nValue,
      top: wzNode.info.VRTop.nValue,
      bottom: wzNode.info.VRBottom.nValue,
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

// for exmaple near henesys this will return henesys map
MapleMap.getNearbyTownMapId = function () {
  if (this.isTown) {
    return this.id;
  }
  console.log(this.wzNode);
  return this.wzNode.info.returnMap.nValue;
};

MapleMap.update = function (msPerTick) {
  if (!this.doneLoading) {
    return;
  }

  // handle destroyed objects
  this.monsters = this.monsters.filter((m: Monster) => !m.destroyed);

  this.backgrounds.forEach((bg: Background) => bg.update(msPerTick));
  this.objects.forEach((obj: Obj) => obj.update(msPerTick));
  this.npcs.forEach((npc: NPC) => npc.update(msPerTick));
  this.monsters.forEach((mob: Monster) => mob.update(msPerTick));
  this.characters.forEach((chr: MapleCharacter) => chr.update(msPerTick));
  this.portals.forEach((p: Portal) => p.update(msPerTick));

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

  // handle destroyed objects
  // this.monsters = this.monsters.filter(m => !m.destroyed);
  currentMonsters = currentMonsters.filter((m) => !m.destroyed);

  const draw = (obj: any) => obj.draw(canvas, camera, lag, msPerTick, tdelta);

  this.backgrounds.filter((bg: Background) => !bg.front).forEach(draw);

  for (let i = 0; i <= 7; i += 1) {
    const inCurrentLayer = (obj: Obj) => obj.layer === i;
    this.objects.filter(inCurrentLayer).forEach(draw);
    this.tiles.filter(inCurrentLayer).forEach(draw);
    this.monsters.filter(inCurrentLayer).forEach(draw);
    this.characters.filter(inCurrentLayer).forEach(draw);
    this.npcs.filter(inCurrentLayer).forEach(draw);
  }

  // how about obj.layer = null?
  const notInAnyLayer = (obj: Monster) => !(obj.layer >= 0 && obj.layer <= 7);

  currentMonsters.filter(notInAnyLayer).forEach(draw);
  this.monsters.filter(notInAnyLayer).forEach(draw);

  this.characters.filter(notInAnyLayer).forEach(draw);

  this.npcs.filter(notInAnyLayer).forEach(draw);

  this.portals.forEach(draw);

  this.backgrounds.filter((bg: Background) => !!bg.front).forEach(draw);

  // draw speech bubbles
  // draw levelup
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
  // draw damage

  Object.values(this.footholds).forEach(draw);

  if (this.PlayerCharacter) {
    this.PlayerCharacter.draw(canvas, camera, lag, msPerTick, tdelta);
    if (this.PlayerCharacter.levelingUp) {
      drawLevelUp(this.PlayerCharacter);
    }
  }

  this.itemDrops.forEach((drop: DropItemSprite) => {
    drop.draw(canvas, camera);
  });

  this.clickManagerObjects.forEach((obj: Obj) => {
    obj.draw(canvas, camera, lag, msPerTick, tdelta);
  });
};

// const getCurrentMonsters = () => currentMonsters;
// const getFootholds = () => footholds;
// MapleMap.getCurrentMonsters = getCurrentMonsters;
// MapleMap.getFootholds = getFootholds;
// window.MapleMap = MapleMap;

export default MapleMap;
