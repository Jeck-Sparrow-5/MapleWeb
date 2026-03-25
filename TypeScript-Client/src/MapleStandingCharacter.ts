// MapleStandingCharacter.ts
import WZManager from "./wz-utils/WZManager";
import GameCanvas from "./GameCanvas";
import { CameraInterface } from "./Camera";

/** Public props you can pass in to define the avatar look/position */
export type StandingAppearance = {
  name?: string;
  x?: number;
  y?: number;
  flipped?: boolean; // face right if true, left if false
  skinColor?: number; // e.g. 0..?
  faceId?: number; // e.g. 20000
  faceExpr?: string; // baseline expression; defaults to "blink"@frame0
  hairId?: number; // e.g. 30030
  /** List of item IDs to equip (hat/shirt/pants/shoes/cape/glove/weapon/etc.). */
  equipIds?: number[];
  /** Optional blink tuning */
  blink?: { enabled?: boolean; minMs?: number; maxMs?: number };
};

/** Minimal stat/look to satisfy external Character typing */
export type CharacterStat = {
  level: number;
  hp: number;
  mp: number;
  str: number;
  dex: number;
  int: number;
  luk: number;
  characterName?: string;
};
export type CharacterLook = {
  name: string;
  flipped: boolean;
  skin: number; // skinColor
  face: number; // faceId
  hair: number; // hairId
  equips: number[]; // raw item IDs by slot order (flattened values)
};

type ZMap = {
  dict: Record<string | number, number>;
  indexOf: (nameOrZ: string | number) => number;
};

type SMap = {
  dict: Record<string, string>;
  reverseDict: Record<string, Set<string>>;
  getValueFromName: (name: string) => string | undefined;
  getNamesFromValue: (value: string) => Set<string> | undefined;
};

export default class MapleStandingCharacter {
  // Identity / layout
  name: string = "";
  pos = { x: 0, y: 0 };
  flipped: boolean = false;

  // WZ assets
  head: any = null;
  body: any = null;
  baseBody: any = null;
  Hair: any = null;
  Face: any = null;

  // Helpers
  zmap: ZMap | null = null;
  smap: SMap | null = null;

  // Face
  faceId: number = 20000;
  faceExpr: string = "blink"; // << idle uses blink@frame0
  faceFrame = 0;
  faceDelay = 0;
  faceNextDelay = 120;

  // Body/stance
  skinColor: number = 0;
  hairId: number = 30030;
  stance: string = "stand1";
  frame = 0;
  delay = 0;
  nextDelay = 120;
  isOscillateFrames = true; // stand idle oscillates
  oscillateFactor = 1;

  // Equips & IDs
  equips: any[] = [];
  weaponEquipId: number | null = null;
  private equippedIdsBySlot: Record<number, number> = {};

  // Public fields to match external Character type
  stat: CharacterStat = {
    level: 1,
    hp: 100,
    mp: 100,
    str: 4,
    dex: 4,
    int: 4,
    luk: 4,
    characterName: "",
  };
  look: CharacterLook = {
    name: "",
    flipped: false,
    skin: 0,
    face: 20000,
    hair: 30030,
    equips: [],
  };

  // --- Blink controller (idle = blink frame 0) ---
  private blink = {
    enabled: true,
    minMs: 6000,
    maxMs: 12000,
    nextInMs: 0,
    active: false,
    baseline: "blink" as string,
  };
  private scheduleNextBlink() {
    const min = Math.max(0, this.blink.minMs);
    const max = Math.max(min + 1, this.blink.maxMs);
    const r = min + Math.random() * (max - min);
    this.blink.nextInMs = Math.floor(r);
  }

  // --- Public API ------------------------------------------------------------

  static async fromAppearance(a: StandingAppearance = {}) {
    const c = new MapleStandingCharacter();
    await c.load();
    await c.setAppearance(a);
    return c;
  }

  async setAppearance(a: StandingAppearance = {}) {
    if (typeof a.name === "string") {
      this.name = a.name;
      this.stat.characterName = a.name;
    }
    if (typeof a.x === "number") this.pos.x = a.x;
    if (typeof a.y === "number") this.pos.y = a.y;
    if (typeof a.flipped === "boolean") this.flipped = a.flipped;

    if (typeof a.skinColor === "number") await this.setSkinColor(a.skinColor);
    if (typeof a.faceId === "number") await this.setFace(a.faceId);

    // Baseline: use "blink" so idle is blink@frame0 (open eyes).
    if (typeof a.faceExpr === "string") this.blink.baseline = a.faceExpr;
    this.ensureValidBaseline();
    this.setFaceExpr(this.blink.baseline);
    this.setFaceFrame(0);

    if (typeof a.hairId === "number") await this.setHair(a.hairId);
    if (a.equipIds?.length) await this.setEquipsByIds(a.equipIds);
    else this.equippedIdsBySlot = {};

    if (a.blink) {
      if (typeof a.blink.enabled === "boolean")
        this.blink.enabled = a.blink.enabled;
      if (typeof a.blink.minMs === "number") this.blink.minMs = a.blink.minMs;
      if (typeof a.blink.maxMs === "number") this.blink.maxMs = a.blink.maxMs;
    }

    this.setStance("stand1", 0, true);
    this.scheduleNextBlink();
    this.syncLook();
  }

  setPosition(x: number, y: number) {
    this.pos.x = x;
    this.pos.y = y;
  }
  setFlipped(flipped: boolean) {
    this.flipped = flipped;
    this.syncLook();
  }
  setName(name: string) {
    this.name = name;
    this.stat.characterName = name;
    this.syncLook();
  }

  // --- Lifecycle / Loading ---------------------------------------------------

  async load() {
    // zmap: draw order
    const zmap: any = await WZManager.get("Base.wz/zmap.img");
    const zmapDict = [...zmap.nChildren]
      .reverse()
      .reduce((acc: Record<string | number, number>, node: any, i: number) => {
        acc[node.nName] = i;
        return acc;
      }, {});
    this.zmap = {
      dict: zmapDict,
      indexOf: (name: string | number) => (zmapDict as any)[name] ?? -1,
    };

    // smap: visibility / slot masking
    const smap: any = await WZManager.get("Base.wz/smap.img");
    const nonNullSmapNodes = smap.nChildren.filter((n: any) => !!n.nValue);
    const smapDict = nonNullSmapNodes.reduce(
      (acc: Record<string, string>, node: any) => {
        acc[node.nName] = node.nValue;
        return acc;
      },
      {}
    );
    const reverseSmapDict = nonNullSmapNodes.reduce(
      (acc: Record<string, Set<string>>, node: any) => {
        if (!acc[node.nValue]) acc[node.nValue] = new Set();
        acc[node.nValue].add(node.nName);
        return acc;
      },
      {}
    );
    this.smap = {
      dict: smapDict,
      reverseDict: reverseSmapDict,
      getValueFromName: (name: string) => smapDict[name],
      getNamesFromValue: (value: string) => reverseSmapDict[value],
    };

    // Default look
    await this.setSkinColor(this.skinColor);
    await this.setFace(this.faceId);
    await this.setHair(this.hairId);

    this.ensureValidBaseline();
    this.setFaceExpr(this.blink.baseline);
    this.setFaceFrame(0);

    this.setStance("stand1", 0, true);
    this.scheduleNextBlink();
    this.syncLook();
  }

  // --- Look setters ----------------------------------------------------------

  async setSkinColor(sc = 0) {
    this.head = await WZManager.get(`Character.wz/0001200${sc}.img`);
    this.body = await WZManager.get(`Character.wz/0000200${sc}.img`);
    this.baseBody = await WZManager.get(`Character.wz/00002000.img`);
    this.skinColor = sc;
    this.syncLook();
  }

  async setFace(faceId = 20000) {
    this.Face = await WZManager.get(`Character.wz/Face/000${faceId}.img`);
    this.faceId = faceId;
    this.ensureValidBaseline();
    this.setFaceFrame(0);
    this.syncLook();
  }

  private ensureValidBaseline() {
    if (!this.Face) return;
    if (!this.Face[this.blink.baseline]) {
      if (this.Face["blink"]) this.blink.baseline = "blink";
      else if (this.Face["default"]) this.blink.baseline = "default";
      else {
        const keys = Object.keys(this.Face).filter(
          (k) => !k.startsWith("info")
        );
        if (keys.length) this.blink.baseline = keys[0];
      }
    }
  }

  setFaceExpr(expr = "blink") {
    if (this.Face && this.Face[expr]) {
      this.faceExpr = expr;
      this.setFaceFrame(0);
    }
  }

  setFaceFrame(faceFrame = 0) {
    if (!this.Face || !this.Face[this.faceExpr]) {
      this.faceFrame = 0;
      this.faceNextDelay = 120;
      this.faceDelay = 0;
      return;
    }
    const frames = this.Face[this.faceExpr];
    this.faceFrame = frames[faceFrame] ? faceFrame : 0;
    this.faceDelay = 0;
    const node = frames[this.faceFrame];
    this.faceNextDelay =
      Math.abs(node?.nGet?.("delay")?.nGet?.("nValue", 120)) || 120;
  }

  advanceFaceFrame() {
    const frames = this.Face?.[this.faceExpr];
    if (!frames) return;

    const next = this.faceFrame + 1;
    const hasNext = !!frames[next];

    if (hasNext) {
      this.setFaceFrame(next);
    } else {
      if (this.faceExpr === "blink") {
        this.setFaceFrame(0);
        this.blink.active = false;
        this.scheduleNextBlink();
      } else {
        this.setFaceFrame(0);
      }
    }
  }

  async setHair(hairId = 30030) {
    this.Hair = await WZManager.get(`Character.wz/Hair/000${hairId}.img`);
    this.hairId = hairId;
    this.syncLook();
  }

  /** Replace all equips by raw item IDs. */
  async setEquipsByIds(ids: number[] = []) {
    this.equips = [];
    this.weaponEquipId = null;
    this.equippedIdsBySlot = {};
    for (const id of ids) await this.attachEquipByItemId(id);
    this.syncLook();
  }

  /** Attach a single equip by its item ID (auto-slot). */
  async attachEquipByItemId(id: number) {
    const firstThree = Math.floor(id / 10000);
    const equipMap: Record<number, { dir: string; slot?: number }> = {
      101: { dir: "Accessory", slot: 1 },
      102: { dir: "Accessory", slot: 2 },
      103: { dir: "Accessory", slot: 3 },
      112: { dir: "Accessory", slot: 16 },
      100: { dir: "Cap", slot: 0 },
      110: { dir: "Cape", slot: 8 },
      104: { dir: "Coat", slot: 4 },
      108: { dir: "Glove", slot: 7 },
      105: { dir: "Longcoat", slot: 4 },
      106: { dir: "Pants", slot: 5 },
      111: { dir: "Ring" },
      109: { dir: "Shield", slot: 9 },
      107: { dir: "Shoes", slot: 6 },
      130: { dir: "Weapon", slot: 10 },
      131: { dir: "Weapon", slot: 10 },
      132: { dir: "Weapon", slot: 10 },
      133: { dir: "Weapon", slot: 10 },
      137: { dir: "Weapon", slot: 10 },
      138: { dir: "Weapon", slot: 10 },
      139: { dir: "Weapon", slot: 10 },
      140: { dir: "Weapon", slot: 10 },
      141: { dir: "Weapon", slot: 10 },
      142: { dir: "Weapon", slot: 10 },
      143: { dir: "Weapon", slot: 10 },
      144: { dir: "Weapon", slot: 10 },
      145: { dir: "Weapon", slot: 10 },
      146: { dir: "Weapon", slot: 10 },
      147: { dir: "Weapon", slot: 10 },
      148: { dir: "Weapon", slot: 10 },
      149: { dir: "Weapon", slot: 10 },
      160: { dir: "Weapon", slot: 10 },
      170: { dir: "Weapon", slot: 10 },
    };

    const meta = equipMap[firstThree];
    if (!meta || meta.slot === undefined) return;

    const equip = await WZManager.get(`Character.wz/${meta.dir}/0${id}.img`);
    this.equips[meta.slot] = equip;
    this.equippedIdsBySlot[meta.slot] = id;
    if (meta.slot === 10) this.weaponEquipId = id;
    this.syncLook();
  }

  // --- Animation control -----------------------------------------------------

  setStance(stance = "stand1", frame = 0, oscillate = true) {
    if (this.stance !== stance) {
      this.stance = stance;
      this.isOscillateFrames = oscillate || stance.startsWith("stand");
      this.oscillateFactor = 1;
    }
    this.setFrame(frame, 0);
  }

  setFrame(frame = 0, carryOverDelay = 0) {
    const seq = this.baseBody?.[this.stance];
    if (!seq) {
      this.frame = 0;
      this.nextDelay = 120;
      this.delay = 0;
      return;
    }

    if (!seq[frame]) frame = 0;
    this.frame = frame;

    this.delay = carryOverDelay;
    const node = seq[this.frame];
    this.nextDelay =
      Math.abs(node?.nGet?.("delay")?.nGet?.("nValue", 120)) || 120;
  }

  private advanceBodyFrame() {
    const carry = this.delay - this.nextDelay;
    if (!this.isOscillateFrames) {
      this.setFrame(this.frame + 1, carry);
    } else {
      const next = this.frame + 1 * this.oscillateFactor;
      const seq = this.baseBody[this.stance];
      if (!seq[next]) this.oscillateFactor *= -1;
      const nextOsc = this.frame + 1 * this.oscillateFactor;
      this.setFrame(nextOsc, carry);
    }
  }

  // --- Main loop hook --------------------------------------------------------

  /** Call each tick with ms delta */
  update(msPerTick: number) {
    // Body idle animation
    this.delay += msPerTick;
    if (this.delay > this.nextDelay) this.advanceBodyFrame();

    // Face timing: only advance when blink is active OR expression isn't "blink"
    const shouldAdvanceFace = this.faceExpr !== "blink" || this.blink.active;
    if (shouldAdvanceFace) {
      this.faceDelay += msPerTick;
      if (this.faceDelay > this.faceNextDelay) {
        const carry = this.faceDelay - this.faceNextDelay;
        this.advanceFaceFrame();
        this.faceDelay = carry;
      }
    } else {
      if (this.faceFrame !== 0) this.setFaceFrame(0);
    }

    // Blink scheduler
    if (this.blink.enabled && this.Face?.["blink"]) {
      if (!this.blink.active) {
        this.blink.nextInMs -= msPerTick;
        if (this.blink.nextInMs <= 0) {
          this.blink.active = true;
          if (this.faceExpr !== "blink") this.setFaceExpr("blink");
          this.setFaceFrame(1);
        }
      }
    }
  }

  /** Draw the avatar — pos is in world coordinates, camera offsets are applied */
  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    _lag: number,
    _msPerTick: number,
    _tdelta: number
  ) {
    const seq = this.baseBody?.[this.stance];
    if (!seq) return;
    const imgdir = seq[this.frame];
    if (!imgdir) return;

    const characterIsFlipped = !!this.flipped;
    const imgdirFlip = !!imgdir.nGet("flip").nGet("nValue", 0);
    const frameIsFlipped = characterIsFlipped !== imgdirFlip;

    const drawableFrames = this.getDrawableFrames(
      this.stance,
      this.frame,
      frameIsFlipped,
      true
    );

    const mx = imgdir.nGet("move").nGet("nX", 0);
    const moveX = !characterIsFlipped ? mx : -mx;
    const moveY = imgdir.nGet("move").nGet("nY", 0);
    const rotate = imgdir.nGet("rotate").nGet("nValue", 0);
    const angle = !characterIsFlipped ? rotate : 360 - rotate;

    for (const f of drawableFrames) {
      const dx = Math.floor(this.pos.x + f.x - camera.x + moveX);
      const dy = Math.floor(this.pos.y + f.y - camera.y + moveY);
      canvas.drawImage({
        img: f.img,
        dx,
        dy,
        flipped: frameIsFlipped,
        rx: -f.x,
        ry: -f.y,
        angle,
      });
    }

    if (this.name) this.drawName(canvas, camera);
  }

  // --- Drawing helpers -------------------------------------------------------

  getDrawableFrames(
    stance: string,
    frame: number,
    flipped: boolean,
    includeEquips = true
  ) {
    const imgdir = this.baseBody[stance][frame];
    const realStance = !imgdir.action ? stance : imgdir.action.nValue;
    const realFrame = !imgdir.action ? frame : imgdir.frame.nValue;

    const bodyFrame = this.body?.[realStance]?.[realFrame];
    const faceFlag = bodyFrame?.face?.nValue;
    const useBackHead = faceFlag === 0;

    const isDrawable = (n: any) =>
      n.nTagName === "canvas" || n.nTagName === "uol";
    const getParts = (img: any) =>
      img.nGet(realStance).nGet(realFrame).nChildren;
    const getFParts = (img: any) =>
      img.nGet(this.faceExpr).nGet(this.faceFrame).nChildren;

    const [hat, faceAcc, ...restEquips] = this.equips;

    const twoChars = /.{1,2}/g;
    const hatVslot = !hat ? "" : hat.info.vslot.nValue;
    const hatParts = !hat ? [] : getParts(hat).filter(isDrawable);

    const hatSmapValues = hatParts.reduce((acc: string, p: any) => {
      try {
        const part = p.nTagName === "uol" ? p.nResolveUOL() : p;
        const v = this.smap?.getValueFromName(part.z.nValue);
        return v ? `${acc}${v}` : acc;
      } catch {
        return acc;
      }
    }, "");

    const hatVslotPairs = new Set(hatVslot.match(twoChars) || []);
    const hatSmapPairs = new Set(hatSmapValues.match(twoChars) || []);
    const hatSmapIntersection = new Set(
      [...hatVslotPairs].filter((val) => hatSmapPairs.has(val))
    );

    const map: any = {};
    const drawableFrames: any[] = [];

    const addFrame = (p: any, vslot: string) => {
      try {
        p.nResolveUOL();
      } catch {
        return;
      }
      const part = p.nTagName === "uol" ? p.nResolveUOL() : p;

      const pointInMap = (v: any) => !!map[v.nName];
      const pointNotInMap = (v: any) => !map[v.nName];

      const mapped = part.map.nChildren.filter(pointInMap);
      const xSum = mapped.reduce((acc: number, v: any) => {
        const ax = !flipped ? v.nX : -v.nX;
        return acc + map[v.nName].x - ax;
      }, 0);
      const ySum = mapped.reduce(
        (acc: number, v: any) => acc + map[v.nName].y - v.nY,
        0
      );
      const nMapped = Math.max(mapped.length, 1);
      let x = Math.floor(xSum / nMapped);
      let y = Math.floor(ySum / nMapped);

      part.map.nChildren.filter(pointNotInMap).forEach((v: any) => {
        map[v.nName] = { x: x + (!flipped ? v.nX : -v.nX), y: y + v.nY };
      });

      const originX = part.origin.nX;
      const adjustX = !flipped ? originX : part.nWidth - originX;
      x -= adjustX;
      y -= part.origin.nY;

      const partSmapValue = this.smap?.getValueFromName(part.z.nValue) || "";
      const partVslotPairs = new Set(vslot.match(twoChars) || []);
      const partSmapPairs = new Set(partSmapValue.match(twoChars) || []);
      const partSmapIntersection = new Set(
        [...partVslotPairs].filter((val) => partSmapPairs.has(val))
      );
      const intersectionWithHat = [...partSmapIntersection].filter((val) =>
        hatSmapIntersection.has(val)
      );
      const invisibleZs = intersectionWithHat.reduce(
        (acc: Set<string>, val: string) => {
          (this.smap?.getNamesFromValue(val) || new Set()).forEach((z) =>
            acc.add(z)
          );
          return acc;
        },
        new Set<string>()
      );

      if (invisibleZs.has(part.z.nValue)) return;

      const realZ = part.z.nValue === 0 ? part.nName : part.z.nValue;
      drawableFrames.push({
        img: part.nGetImage(),
        z: this.zmap?.indexOf(realZ) ?? 0,
        x,
        y,
      });
    };

    const imgs: any[] = [
      this.body,
      this.head,
      this.Hair,
      this.Face,
      hat,
      faceAcc,
    ];
    if (includeEquips) imgs.push(...restEquips);

    imgs.forEach((img) => {
      if (!img) return;
      const vslot = img.info.vslot.nValue;
      const isHead = img === this.head;
      const isFace = img === this.Face || img === faceAcc;
      const isHair = img === this.Hair;

      let parts: any[] = [];
      if (isHead) {
        parts =
          (useBackHead ? img.back?.nChildren : img.front?.nChildren) || [];
      } else if (isFace) {
        parts = getFParts(img);
      } else if (isHair) {
        parts = getParts(img).filter((n: any) => n.nName !== "hairShade");
      } else {
        parts = getParts(img);
      }

      parts.filter(isDrawable).forEach((p: any) => addFrame(p, vslot));
    });

    drawableFrames.sort((a, b) => a.z - b.z);
    return drawableFrames;
  }

  private drawName(canvas: GameCanvas, camera: CameraInterface) {
    const tagHeight = 16;
    const tagPadding = 4;
    const tagColor = "#000000";
    const tagAlpha = 0.7;
    const offsetFromY = 2;
    const name = this.name || this.stat.characterName || "";
    if (!name) return;

    const nameOpts = {
      text: name,
      x: Math.floor(this.pos.x - camera.x),
      y: Math.floor(this.pos.y - camera.y + offsetFromY + 3),
      color: "#ffffff",
      align: "center" as const,
    };
    const nameWidth = Math.ceil(
      canvas.measureText(nameOpts).width + tagPadding
    );
    const nameTagX = Math.round(this.pos.x - camera.x - nameWidth / 2);
    canvas.drawRect({
      x: nameTagX,
      y: Math.floor(this.pos.y - camera.y + offsetFromY),
      width: nameWidth,
      height: tagHeight,
      color: tagColor,
      alpha: tagAlpha,
    });
    canvas.drawText(nameOpts);
  }

  // --- internal --------------------------------------------------------------

  private syncLook() {
    this.look = {
      name: this.name,
      flipped: this.flipped,
      skin: this.skinColor,
      face: this.faceId,
      hair: this.hairId,
      equips: Object.values(this.equippedIdsBySlot),
    };
  }
}
