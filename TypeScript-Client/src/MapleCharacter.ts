import WZManager from "./wz-utils/WZManager";
import PLAY_AUDIO from "./Audio/PlayAudio";
import { Physics } from "./Physics";
import Stance from "./Constants/enums/Stance";
import {
  areAnyRectanglesOverlapping,
  areRectanglesOverlappingWithMinOverlap,
  findMaxXY,
  findMinXY,
  isPositionInsideRect,
  isPositionInsideRectByConrners,
} from "./Physics/Collision";
import ClimbDirections from "./Constants/enums/ClimbDirections";
import getEquipTypeById, {
  WeaponTypeToStance,
  playAudioForAttackByWeaponType,
} from "./Constants/EquipType";
import ExpTable from "./Constants/ExpTable";
import Projectile from "./Projectile/Projectile";
import DamageIndicator, {
  DamageIndicatorType,
} from "./Effects/DamageIndicator";
import { AttackType } from "./Constants/AttackType";
import Inventory from "./Inventory/Inventory";
import Stats from "./Stats/Stats";
import { MapleMap } from "./MapleMap";
import Monster from "./Monster";
import Portal from "./Portal";
import DropItemSprite from "./DropItem/DropItemSprite";
import GameCanvas from "./GameCanvas";
import { CameraInterface } from "./Camera";

class MapleCharacter {
  opts: any;
  active: boolean = true;
  skinColor: number = 0;
  stance: string = "stand1";
  frame: number = 0;
  delay: number = 0;
  nextDelay: number = 0;
  useStanceUntilMaxFrame: boolean = false;
  stanceMaxTime: number = 0;
  isOscillateFrames: boolean = false;
  oscillateFactor: number = 1;
  head: any = null;
  body: any = null;
  baseBody: any = null;
  hair: any = null;
  Face: any = null;
  face: number = 20000;
  faceExpr: string = "blink";
  faceFrame: number = 0;
  faceDelay: number = 0;
  faceNextDelay: number = 0;
  equips: any = [];
  flipped: boolean = false;
  id: number = 0;
  name: string = "";
  gender: number = 0;
  hp: number = 100;
  maxHp: number = 100;
  mp: number = 100;
  maxMp: number = 100;
  exp: number = 0;
  fame: number = 0;
  job: number = 0;
  stats: Stats;
  maxExp: number = 0;
  inventory: Inventory = new Inventory({});
  pos: Physics;
  bodyRects: any = [];
  bodyStartPoistion: any = { x: 0, y: 0 };
  isInAttack: boolean = false;
  isInAlert: boolean = false;
  isInPortal: boolean = false;
  isInClimbingRope: boolean = false;
  isClimbMoving: boolean = false;
  isDead: boolean = false;
  maxCloseToMobDistance: number = 0;
  mobHitMinOverlapPercentage: number = 0;
  hitCooldownTimeInMS: number = 0;
  lastHitTime: number = 0;
  spawnDefaultHp: number = 0;
  weaponEquip: any = null;
  weaponEquipId: any = null;
  alertStanceTimeout: any = null;
  deathTimeout: any = null;
  projectiles: any = [];
  DamageIndicator: any = null;
  destroyed: boolean = false;
  levelingUp: boolean = false;
  levelUpFrames: any = null;
  levelUpFrame: number = 0;
  levelUpDelay: number = 0;
  onStanceFinish: any = null;
  onLastFrame: any = null;
  zmap: any = null;
  smap: any = null;
  map: MapleMap | null = null;
  Hair: any = null;

  static async fromOpts(opts: any) {
    const mc = new MapleCharacter(opts);
    await mc.load();
    return mc;
  }
  constructor(opts: any) {
    // body
    this.skinColor = opts.skinColor || 0;
    this.stance = opts.stance || "stand1";
    this.frame = opts.frame || 0;
    this.delay = opts.delay || 0;
    this.nextDelay = opts.nextDelay || 0;
    this.useStanceUntilMaxFrame = false;
    this.stanceMaxTime = 0;
    this.isOscillateFrames = false;
    this.oscillateFactor = 1;

    this.hair = opts.hair || 30030;

    // face
    this.face = opts.face || 20000;
    this.faceExpr = opts.faceExpr || "blink";
    this.faceFrame = opts.faceFrame || 0;
    this.faceDelay = opts.faceDelay || 0;
    this.faceNextDelay = opts.faceNextDelay || 0;

    this.equips = [];

    this.flipped = false;

    this.id = opts.id;
    this.name = opts.name;
    this.gender = opts.gender || 0;
    // male shirt = 1040036 male boxers = 1060026
    // female shirt = 1041046 female boxers = 1061039

    this.hp = opts.hp || 100;
    this.maxHp = opts.maxHp || 100;
    this.mp = opts.mp || 100;
    this.maxMp = opts.maxMp || 100;
    this.exp = opts.exp || 0;
    this.fame = opts.fame || 0;
    this.job = opts.job || 0;
    this.exp = opts.exp || 0;
    this.inventory = opts.inventory;
    // must get stats
    this.stats = opts.stats;
    this.maxExp = ExpTable.getExpNeededForLevel(this.stats.level);

    // physics stuff
    this.pos = new Physics();
    this.bodyRects = [];
    this.bodyStartPoistion = { x: 0, y: 0 };
    this.isInAttack = false;
    this.isInAlert = false;
    this.isInPortal = false;
    this.isInClimbingRope = false;
    this.isClimbMoving = false;
    this.isDead = false;

    this.maxCloseToMobDistance = 80;
    this.mobHitMinOverlapPercentage = 10;
    this.hitCooldownTimeInMS = 1500;
    this.lastHitTime = Date.now();
    this.spawnDefaultHp = 100;

    this.weaponEquip = null;
    this.weaponEquipId = null;

    this.alertStanceTimeout = null;
    this.deathTimeout = null;

    // this.projectiles = [];
  }

  async load() {
    console.log("loading MapleCharacter");
    const zmap: any = await WZManager.get("Base.wz/zmap.img");
    const zmapDict = [...zmap.nChildren].reverse().reduce((acc, node, i) => {
      acc[node.nName] = i;
      return acc;
    }, {});
    this.zmap = {
      dict: zmapDict,
      indexOf: (name: string) => this.zmap.dict[name] || -1,
    };

    const smap: any = await WZManager.get("Base.wz/smap.img");
    const nonNullSmapNodes = smap.nChildren.filter((n: any) => !!n.nValue);
    const smapDict = nonNullSmapNodes.reduce((acc: any, node: any) => {
      return acc;
      acc[node.nName] = node.nValue;
    }, {});
    const reverseSmapDict = nonNullSmapNodes.reduce((acc: any, node: any) => {
      if (!acc[node.nValue]) {
        acc[node.nValue] = new Set();
      }
      acc[node.nValue].add(node.nName);
      return acc;
    }, {});
    this.smap = {
      dict: smapDict,
      reverseDict: reverseSmapDict,
      getValueFromName: (name: string) => this.smap.dict[name],
      getNamesFromValue: (value: string) => this.smap.reverseDict[value],
    };

    await this.setSkinColor(this.skinColor);
    await this.setFace(this.face);
    await this.setHair(this.hair);
    this.setStance(this.stance);

    this.projectiles = [];
    this.DamageIndicator = new DamageIndicator();
    this.DamageIndicator.initialize();
  }
  async setSkinColor(sc = 0) {
    this.head = await WZManager.get(`Character.wz/0001200${sc}.img`);
    this.body = await WZManager.get(`Character.wz/0000200${sc}.img`);
    this.baseBody = await WZManager.get(`Character.wz/00002000.img`);
    this.skinColor = sc;
  }
  setStance(
    stance = "stand1",
    frame = 0,
    useStanceUntilMaxFrame = false,
    isOscillateFrames = true, // is looping back and forth,
    onFinish = () => {}, // only if not looping -> meaning isOscillateFrames = false,
    onLastFrame = () => {} // only if looping -> meaning isOscillateFrames = true,
  ) {
    // print all possible stances
    // console.log(this.baseBody);

    if (this.stance != stance) {
      console.log("stance changed to", stance);
      this.useStanceUntilMaxFrame = useStanceUntilMaxFrame;
      this.stance = stance;
      this.setFrame(frame);
      this.isOscillateFrames = stance.startsWith("stand") || isOscillateFrames;
      this.oscillateFactor = 1;
      this.onStanceFinish = onFinish;
      this.onLastFrame = onLastFrame;
    }
  }
  setFrame(frame = 0, carryOverDelay = 0) {
    if (
      this.useStanceUntilMaxFrame &&
      !this.baseBody[this.stance][frame + 1] &&
      this.baseBody[this.stance][frame]
    ) {
      this.onLastFrame();
    }

    if (!this.baseBody[this.stance][frame]) {
      if (this.useStanceUntilMaxFrame) {
        console.log("Animation ended, switching to stand or alert");

        this.onStanceFinish();

        if (this.isInAttack) {
          this.setAlert();
        } else {
          this.isInAlert = false;
        }
      } else {
        console.log("Animation ended, looping back to 0");
        frame = 0;
      }
    } else {
      this.frame = frame;
    }
    // this.frame = !this.baseBody[this.stance][frame] ? 0 : frame;
    this.delay = carryOverDelay;
    this.nextDelay = Math.abs(
      this.baseBody[this.stance][this.frame].nGet("delay").nGet("nValue", 100)
    );
  }
  advanceFrame() {
    const carryOverDelay = this.delay - this.nextDelay;
    if (!this.isOscillateFrames) {
      this.setFrame(this.frame + 1, carryOverDelay);
    } else {
      const nextFrame = this.frame + 1 * this.oscillateFactor;
      if (!this.baseBody[this.stance][nextFrame]) {
        this.oscillateFactor *= -1;
      }
      const nextOscillatedFrame = this.frame + 1 * this.oscillateFactor;
      // console.log(nextOscillatedFrame);
      this.setFrame(nextOscillatedFrame, carryOverDelay);
    }
  }

  isCloseToMob = (inAllDirections = true) => {
    const monstersToConsider = inAllDirections
      ? this.map!.monsters
      : this.map!.monsters.filter((monster: Monster) => {
          const isMonsterOnRight = monster.pos.x > this.pos.x;
          const isMonsterOnLeft = monster.pos.x < this.pos.x;
          const isPlayerFacingRight = this.flipped;

          return (
            (isMonsterOnRight && isPlayerFacingRight) ||
            (isMonsterOnLeft && !isPlayerFacingRight)
          );
        });

    console.log(monstersToConsider.length, this.map!.monsters.length);

    const isCloseToMonster = monstersToConsider.some((monster: Monster) => {
      const distance = Math.sqrt(
        (monster.pos.x - this.pos.x) ** 2 + (monster.pos.y - this.pos.y) ** 2
      );

      return distance <= this.maxCloseToMobDistance;
    });

    return isCloseToMonster;
  };

  async setFace(face = 20000) {
    this.Face = await WZManager.get(`Character.wz/Face/000${face}.img`);
    this.face = face;
  }
  setFaceExpr(faceExpr = "blink", faceFrame = 0) {
    if (!!this.Face[faceExpr]) {
      this.faceExpr = faceExpr;
      this.setFaceFrame(faceFrame);
    }
  }
  setFaceFrame(faceFrame = 0) {
    this.faceFrame = !this.Face[this.faceExpr][faceFrame] ? 0 : faceFrame;
  }
  advanceFaceFrame() {
    this.setFaceFrame(this.faceFrame + 1);
  }
  async setHair(hair = 30030) {
    this.Hair = await WZManager.get(`Character.wz/Hair/000${hair}.img`);
    this.hair = hair;
  }

  async attachEquip(slot: number, id: number) {
    const realSlot = slot < 0 ? -(slot + 1) : slot;
    const firstThreeDigits = Math.floor(id / 10000);
    const equipMap: any = {
      101: { dir: "Accessory", slot: 1 }, // face accessory
      102: { dir: "Accessory", slot: 2 }, // eye accessory
      103: { dir: "Accessory", slot: 3 }, // earring
      112: { dir: "Accessory", slot: 16 }, // necklace
      100: { dir: "Cap", slot: 0 },
      110: { dir: "Cape", slot: 8 },
      104: { dir: "Coat", slot: 4 },
      108: { dir: "Glove", slot: 7 },
      105: { dir: "Longcoat", slot: 4 },
      106: { dir: "Pants", slot: 5 },
      180: { dir: "PetEquip" },
      181: { dir: "PetEquip" },
      182: { dir: "PetEquip" },
      183: { dir: "PetEquip" },
      111: { dir: "Ring" },
      109: { dir: "Shield", slot: 9 },
      107: { dir: "Shoes", slot: 6 },
      190: { dir: "TamingMob" },
      191: { dir: "TamingMob" },
      193: { dir: "TamingMob" },
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
    if (realSlot === equipMap[firstThreeDigits].slot) {
      const dir = equipMap[firstThreeDigits].dir;
      const equip = await WZManager.get(`Character.wz/${dir}/0${id}.img`);
      this.equips[realSlot] = equip;
      console.log(
        "Adding equip",
        equip,
        "slot",
        equipMap[firstThreeDigits].slot,
        "number of equips now: ",
        this.equips.length
      );
      if (equipMap[firstThreeDigits].slot === 10) {
        this.weaponEquip = equip;
        this.weaponEquipId = id;
      }
    }
  }
  detachEquip(slot: number) {
    const realSlot = slot < 0 ? -(slot + 1) : slot;
    this.equips[realSlot] = undefined;
    // this.equips = this.equips.filter((e, i) => i !== realSlot);
  }
  destroy() {
    this.destroyed = true;
  }
  deactivate() {
    this.active = false;
  }
  activate() {
    this.active = true;
  }

  levelUp() {
    this.stats.level += 1;
    this.maxExp = ExpTable.getExpNeededForLevel(this.stats.level);
    this.stats.addAbilityPoints();
    this.playLevelUp();
  }

  addExp(exp: number) {
    if (this.exp + exp >= this.maxExp) {
      this.exp = this.exp + exp - this.maxExp;
      this.levelUp();
    } else {
      this.exp += exp;
    }
  }

  async playLevelUp() {
    const levelUpNode: any = await WZManager.get("Sound.wz/Game.img/LevelUp");
    const levelUpAudio = levelUpNode.nGetAudio();

    const lu: any = await WZManager.get("Effect.wz/BasicEff.img/LevelUp");
    this.levelUpFrames = lu.nChildren;

    PLAY_AUDIO(levelUpAudio);
    this.levelingUp = true;
    this.levelUpFrame = 0;
    this.levelUpDelay = 0;
  }

  async jump() {
    if (this.stance !== "jump") {
      const jumpNode: any = await WZManager.get("Sound.wz/Game.img/Jump");
      const jumpAudio = jumpNode.nGetAudio();
      PLAY_AUDIO(jumpAudio);
    }

    this.pos.jump();
    this.isInClimbingRope = false;
  }

 /**
 * Improved implementation of the attack method for MapleCharacter
 */
async attack() {
  // Don't allow attacking if already in attack animation
  if (this.isInAttack) return;
  
  // Set attack state and reset movement
  this.isInAttack = true;
  this.rightClickRelease();
  this.leftClickRelease();
  this.isInAlert = false;

  // Get weapon type and corresponding stance
  const weaponType = getEquipTypeById(this.weaponEquipId);
  const weaponStanceByAttackType = WeaponTypeToStance[weaponType];
  
  console.log("Weapon Type", weaponType);
  console.log("Weapon Stance Mapping", weaponStanceByAttackType);

  if (!weaponStanceByAttackType) {
    console.error("Unknown weapon type:", weaponType);
    this.isInAttack = false;
    return;
  }

  // Choose the appropriate attack stance (melee/range)
  let attackStance = "swingO1"; // Default stance if none available
  
  if (this.isCloseToMob(false)) {
    // Use melee attack if close to monster
    if (weaponStanceByAttackType.melee && weaponStanceByAttackType.melee.length > 0) {
      attackStance = weaponStanceByAttackType.melee[0];
    }
  } else {
    // Use ranged attack if not close to monster
    if (weaponStanceByAttackType.range && weaponStanceByAttackType.range.length > 0) {
      attackStance = weaponStanceByAttackType.range[0];
    }
  }

  console.log("Using attack stance:", attackStance);
  
  // Set the stance with proper callbacks
  this.setStance(
    attackStance,
    0,
    true,  // useStanceUntilMaxFrame - ensure animation completes
    false, // isOscillateFrames - don't oscillate, we want to complete one animation
    () => {
      // onFinish callback - called when animation completes
      console.log("Attack animation finished");
      this.isInAttack = false;
    },
    async () => {
      // onLastFrame callback - called at the "hit" frame of the animation
      console.log("Executing attack at peak frame");
      await this.executeAttackDamage();
    }
  );
}

/**
 * Execute the actual attack damage calculation and effects
 */
async executeAttackDamage() {
  console.log("Executing attack damage");
  
  try {
    // Play appropriate sound for the weapon
    playAudioForAttackByWeaponType(getEquipTypeById(this.weaponEquipId));
  } catch (error) {
    console.error("Error playing attack sound:", error);
  }

  // Define attack range based on weapon type
  const weaponType = getEquipTypeById(this.weaponEquipId);
  let attackRange = 50; // Default range
  
  // Adjust range based on weapon type
  switch (weaponType) {
    case "Sword":
      attackRange = 60;
      break;
    case "Bow":
    case "Crossbow":
      attackRange = 150;
      break;
    case "Claw":
      attackRange = 100;
      break;
    default:
      attackRange = 50;
  }

  // Directional attack: only hit monsters in the direction the character is facing
  const isCharacterFacingRight = this.flipped;
  
  // Find all monsters within range (that are not already dying)
  const monsters = this.map?.monsters.filter((monster: Monster) => {
    if (monster.dying) return false;
    
    // Check if monster is in the right direction
    const isMonsterOnRight = monster.pos.x > this.pos.x;
    const isMonsterOnLeft = monster.pos.x < this.pos.x;
    
    // Only hit monsters in the direction we're facing
    if ((isMonsterOnRight && !isCharacterFacingRight) || 
        (isMonsterOnLeft && isCharacterFacingRight)) {
      return false;
    }
    
    // Calculate distance
    const dx = monster.pos.x - this.pos.x;
    const dy = monster.pos.y - this.pos.y;
    
    // Use a more generous vertical range to make hitting easier
    // This helps with platforms where monsters might be slightly above/below
    const horizontalDistance = Math.abs(dx);
    const verticalDistance = Math.abs(dy);
    
    return horizontalDistance <= attackRange && verticalDistance <= 70;
  }) || [];

  // Log how many monsters are in range
  console.log(`Found ${monsters.length} monsters in attack range`);

  // If no monsters are hit, just play a swing sound
  if (monsters.length === 0) {
    try {
      const missNode = await WZManager.get("Sound.wz/Game.img/Swing");
      if (missNode && missNode.nGetAudio) {
        PLAY_AUDIO(missNode.nGetAudio());
      }
    } catch (error) {
      console.error("Error playing swing sound:", error);
    }
    return;
  }

  // Process each hit monster
  for (const monster of monsters) {
    try {
      // Calculate damage based on weapon type and stats
      const weaponAttack = this.stats.getWeaponAttack(this.equips);
      const baseDamage = weaponAttack + (this.stats.str / 4);
      
      // Add some random variation (80% to 120% of base damage)
      const randomFactor = 0.8 + Math.random() * 0.4;
      
      // Calculate final damage (ensure it's at least 1)
      const damage = Math.max(1, Math.floor(baseDamage * randomFactor));
      
      console.log(`Dealing ${damage} damage to monster`);
      
      // Apply knockback in the direction we're facing
      const knockbackDirection = isCharacterFacingRight ? 1 : -1;
      
      // Apply the damage to the monster
      monster.hit(damage, knockbackDirection, this);
      
      // Visual feedback: display hit effect at monster position
      this.createHitEffect(monster.pos.x, monster.pos.y);
    } catch (error) {
      console.error("Error processing monster hit:", error);
    }
  }
  
  // Play hit sound
  try {
    const hitNode = await WZManager.get("Sound.wz/Game.img/Hit");
    if (hitNode && hitNode.nGetAudio) {
      PLAY_AUDIO(hitNode.nGetAudio());
    }
  } catch (error) {
    console.error("Error playing hit sound:", error);
  }
  
  // Check for item drops after the attack
  this.checkForItemDropPickup(true);
}

/**
 * Create a visual hit effect at the specified position
 */
async createHitEffect(x, y) {
  try {
    // This is a placeholder for creating hit effects
    // You would typically load a sprite sheet and animate it
    // For now, we'll just log that we want to create an effect
    console.log(`Creating hit effect at (${x}, ${y})`);
    
    // In the future, you could implement something like:
    // const hitEffect = await HitEffect.fromOpts({
    //   x: x, y: y, type: "normal"
    // });
    // this.map.addEffect(hitEffect);
  } catch (error) {
    console.error("Error creating hit effect:", error);
  }
}

/**
 * Improved implementation of isCloseToMob for more accurate distance detection
 */
isCloseToMob = (inAllDirections = true) => {
  if (!this.map || !this.map.monsters || this.map.monsters.length === 0) {
    return false;
  }

  // Filter monsters by direction if not checking in all directions
  const monstersToConsider = inAllDirections
    ? this.map.monsters
    : this.map.monsters.filter((monster: Monster) => {
        const isMonsterOnRight = monster.pos.x > this.pos.x;
        const isMonsterOnLeft = monster.pos.x < this.pos.x;
        const isPlayerFacingRight = this.flipped;

        return (
          (isMonsterOnRight && isPlayerFacingRight) ||
          (isMonsterOnLeft && !isPlayerFacingRight)
        );
      });

  // Use a more generous distance check
  const HORIZONTAL_DISTANCE = 80;
  const VERTICAL_DISTANCE = 60;

  // Check if any monster is within attack range
  const isCloseToMonster = monstersToConsider.some((monster: Monster) => {
    // Skip dead/dying monsters
    if (monster.dying || monster.destroyed) {
      return false;
    }
    
    // Calculate horizontal and vertical distances separately
    const horizontalDistance = Math.abs(monster.pos.x - this.pos.x);
    const verticalDistance = Math.abs(monster.pos.y - this.pos.y);
    
    // Consider monster in range if both horizontal and vertical distances are within limits
    return horizontalDistance <= HORIZONTAL_DISTANCE && verticalDistance <= VERTICAL_DISTANCE;
  });

  return isCloseToMonster;
};
  
  
  async pickUp() {
    console.log("pickUp");
    this.checkForItemDropPickup();
  }

  setAlert() {
    this.isInAttack = false;
    this.isInAlert = true;
    this.setStance(Stance.alert, 0, false, true);

    if (this.alertStanceTimeout) {
      clearTimeout(this.alertStanceTimeout);
    }
    this.alertStanceTimeout = setTimeout(() => {
      this.isInAlert = false;
    }, 5 * 1000);
  }

  checkForLadder(direction: ClimbDirections) {
    const ladderRope = this.map!.wzNode.ladderRope.nChildren.find(
      (ladderRope: any) => {
        // its ladder or rope
        const isLadder = ladderRope.nGet("l").nValue === 1;

        const xRange = isLadder ? 15 : 8;

        return isPositionInsideRectByConrners(
          {
            x: this.pos.x,
            y: this.pos.y,
          },
          {
            x: ladderRope.x.nValue - xRange,
            y: ladderRope.y1.nValue - 4,
          },
          {
            x: ladderRope.x.nValue + xRange,
            y: ladderRope.y2.nValue,
          }
        );
      }
    );
    if (ladderRope) {
      console.log("ladderRope", ladderRope);
      this.pos.x = ladderRope.x.nValue;
      this.climbRope(direction);
      return true;
    } else {
      this.isInClimbingRope = false;
      this.pos.stopClimb();

      return false;
    }
  }

  async checkForPortal() {
    const portal = this.map!.portals.filter(
      (portal: Portal) => portal.rect
    ).find((portal: Portal) => {
      return isPositionInsideRect(
        {
          x: this.pos.x,
          y: this.pos.y,
        },
        portal.rect!
      );
    });

    console.log("chosenxportal", portal);
    if (portal && !this.isInPortal) {
      this.isInPortal = true;
      const jumpNode: any = await WZManager.get("Sound.wz/Game.img/Portal");
      const jumpAudio: any = jumpNode.nGetAudio();
      PLAY_AUDIO(jumpAudio);

      if (this.map!.id !== portal.toMap) {
        await this.map!.load(portal.toMap);
      }

      const othersidePortal = this.map!.portals.find(
        (newMapPortals: Portal) => {
          return newMapPortals.name === portal.toName;
        }
      );

      if (othersidePortal) {
        setTimeout(() => {
          this.pos = new Physics();
          this.pos.x = othersidePortal.x;
          this.pos.y = othersidePortal.y - 10;
        }, 50);

        setTimeout(() => {
          this.isInPortal = false;
        }, 1000);

        console.log("position changed", this.pos.x, this.pos.y);
      }
    }
  }

  async upClick() {
    this.pos.up = true;

    if (this.pos) {
      await this.checkForPortal();

      this.checkForLadder(ClimbDirections.UP);
    }
  }

  async downClick() {
    this.pos.down = true;
    this.checkForLadder(ClimbDirections.DOWN);
  }

  rightClick() {
    if (!this.isInAttack) {
      this.pos.right = true;
    }
  }

  leftClick() {
    if (!this.isInAttack) {
      this.pos.left = true;
    }
  }

  downClickRelease() {
    this.pos.down = false;
    if (this.isInClimbingRope) {
      this.pos.stopClimbMovement();
      this.isClimbMoving = false;
    }
  }

  upClickRelease() {
    this.pos.up = false;

    if (this.isInClimbingRope) {
      this.pos.stopClimbMovement();
      this.isClimbMoving = false;
    }
  }

  rightClickRelease() {
    this.pos.right = false;
  }

  leftClickRelease() {
    this.pos.left = false;
  }

  // ClimbDirections enum
  climbRope(direction: ClimbDirections) {
    this.isClimbMoving = true;
    this.pos.down = false;
    this.pos.up = false;

    if (direction === ClimbDirections.UP) {
      this.pos.climbUp();
    } else {
      this.pos.climbDown();
    }

    this.isInClimbingRope = true;
  }

  die() {
    console.log("player died");
    this.isDead = true;
    this.pos.isMoveEnalbed = false;

    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
    }

    this.deathTimeout = setTimeout(async () => {
      this.isDead = false;
      this.hp = this.spawnDefaultHp;
      console.log(this.map!.getLocationAboveRandomFoothold());

      if (!this.map!.isTown) {
        await this.map!.load(this.map!.getNearbyTownMapId());
      }

      const randomLocationInMap = this.map!.getLocationAboveRandomFoothold();
      if (randomLocationInMap) {
        this.pos = new Physics();
        // todo
        // 1. fix - sometimes the y location is way off,
        this.pos.x = randomLocationInMap.x;
        this.pos.y = randomLocationInMap.y - 100;
      }
    }, 5 * 1000);
  }

  async takeDamage(damage: number) {
    console.log(`Player take ${damage} damage`);

    if (!this.isDead) {
      if (this.hp - damage <= 0) {
        this.hp = 0;
        this.die();
      } else {
        this.hp -= damage;
      }
    }
  }

  checkForMobsHit = () => {
    if (!this.isDead) {
      const currentTime = new Date().getTime();

      if (currentTime - this.lastHitTime >= this.hitCooldownTimeInMS) {
        const monster = this.map!.monsters.filter(
          (monster: Monster) => monster.dying === false
        ).find((monster: Monster) => {
          const monsterPos = monster.pos;
          const playerPos = this.pos;
          const isHit = areAnyRectanglesOverlapping(
            this.bodyRects,
            {
              x: monster.x,
              y: monster.y,
              width: monster.width,
              height: monster.height,
            },
            this.mobHitMinOverlapPercentage
          );

          return isHit;
        });

        if (monster) {
          this.lastHitTime = currentTime;

          const isMiss = this.stats.getRandomMonsterTouchMiss(
            monster.mobFile.info.level.nValue,
            monster.mobFile.info.acc.nValue
          );

          const minXYPosition = findMinXY(this.bodyRects);
          const middleX = (minXYPosition.minX + this.pos.x) / 2;

          if (isMiss) {
            this.DamageIndicator.addDamageIndicator(
              DamageIndicatorType.MobHitPlayer,
              {
                x: middleX,
                y: minXYPosition.minY - 20,
              },
              0
            );
          } else {
            const knowbackXdirection = this.pos.x - monster.pos.x > 0 ? 1 : -1;
            const knowbackYdirection = this.pos.y > monster.pos.y ? 1 : -1;
            this.pos.applyKnockback(knowbackXdirection, knowbackYdirection);

            // todo
            // 2. if not miss -> calculate take demage (monster damage - player defense)
            const finalTakenDamage =
              monster.mobFile.info.PADamage.nValue -
              this.stats.getWeaponDefense(this.equips);
            this.takeDamage(finalTakenDamage);

            // send    // 0 - for miss
            this.DamageIndicator.addDamageIndicator(
              DamageIndicatorType.MobHitPlayer,
              {
                x: middleX,
                y: minXYPosition.minY - 20,
              },
              finalTakenDamage
            );

            // 2. Could not find hit animation for player
            // it suppost to be like flashing the alert stance

            if (!this.isInAttack) {
              this.setAlert();
            }
          }
        }
      }
    }
  };

  checkForItemDropPickup = (AllowMultiPickupAtOnce = false) => {
    const itemDrops: DropItemSprite[] = this.map!.itemDrops.filter(
      (itemDrop: DropItemSprite) => {
        if (itemDrop.isAlreadyPickedUp) {
          return false;
        }
        const isHit = areAnyRectanglesOverlapping(
          this.bodyRects,
          {
            x: itemDrop.pos!.x - itemDrop.frame.nWidth / 2,
            y: itemDrop.pos!.y - itemDrop.frame.nHeight,
            width: itemDrop.frame.nWidth,
            height: itemDrop.frame.nHeight,
          },
          1
        );

        return isHit;
      }
    );

    for (const itemDrop of itemDrops) {
      // this.inventory.addItem(itemDrop.item);
      itemDrop.goToPlayer(this.pos.vx, this.pos.vy);
      itemDrop.isAlreadyPickedUp = true;
      console.log("itemDrop", itemDrop);
      // this is async
      this.inventory.addToInventory(itemDrop.itemFile.nName, itemDrop.amount);

      if (!AllowMultiPickupAtOnce) {
        break;
      }
    }
  };

  update(msPerTick: number) {
    if (!this.active) {
      return;
    }

    if (!!this.levelingUp) {
      this.levelUpDelay += msPerTick;
      if (this.levelUpDelay > 120) {
        this.levelUpDelay = this.levelUpDelay - 120;
        this.levelUpFrame += 1;
      }
      if (!this.levelUpFrames[this.levelUpFrame]) {
        this.levelingUp = false;
        this.levelUpFrame = 0;
        this.levelUpDelay = 0;
      }
    }

    this.delay += msPerTick;
    if (this.delay > this.nextDelay) {
      this.advanceFrame();
    }

    // check if hit by mob
    this.checkForMobsHit();

    this.pos.update(msPerTick);

    this.projectiles = this.projectiles.filter(
      (projectile: Projectile) => !projectile.destroyed
    );

    this.projectiles.forEach((projectile: Projectile) => {
      projectile.update(msPerTick);
    });
  }
  getDrawableFrames(
    stance: any,
    frame: number,
    flipped: boolean,
    includeEquips = true
  ) {
    const imgdir = this.baseBody[stance][frame];
    const realStance = !imgdir.action ? stance : imgdir.action.nValue;
    const realFrame = !imgdir.action ? frame : imgdir.frame.nValue;
    const faceExpr = this.faceExpr;
    const faceFrame = this.faceFrame;
    const useBackHead = !this.body[realStance][realFrame].face.nValue;

    const isDrawable = (n: any) =>
      n.nTagName === "canvas" || n.nTagName === "uol";
    const getParts = (img: any) =>
      img.nGet(realStance).nGet(realFrame).nChildren;
    const getFParts = (img: any) =>
      img.nGet(faceExpr).nGet(faceFrame).nChildren;

    const twoChars = /.{1,2}/g;
    const [hat, faceAcc, ...equips] = this.equips;

    const hatVslot = !hat ? "" : hat.info.vslot.nValue;
    const hatParts = !hat ? [] : getParts(hat).filter(isDrawable);
    const hatSmapValues = hatParts.reduce((acc: any, p: any) => {
      try {
        const part = p.nTagName === "uol" ? p.nResolveUOL() : p;
        return `${acc}${this.smap.getValueFromName(part.z.nValue)}`;
      } catch (ex) {
        console.error(`Broken UOL ${p.nGetPath()}`);
        return acc;
      }
    }, "");
    const hatVslotPairs = new Set(hatVslot.match(twoChars));
    const hatSmapPairs = new Set(hatSmapValues.match(twoChars));
    const hatSmapIntersection = new Set(
      [...hatVslotPairs].filter((val) => hatSmapPairs.has(val))
    );

    const map: any = {};
    const drawableFrames: any = [];

    const addFrame = (p: any, vslot: any) => {
      try {
        p.nResolveUOL();
      } catch (ex) {
        console.error(`Broken UOL ${p.nGetPath()}`);
        return;
      }

      const part = p.nTagName === "uol" ? p.nResolveUOL() : p;
      const pointInMap = (vector: any) => !!map[vector.nName];
      const pointNotInMap = (vector: any) => !map[vector.nName];

      const mappedPoints = part.map.nChildren.filter(pointInMap);
      const xSum = mappedPoints.reduce((acc: any, mappedPoint: any) => {
        const adjustedPointX = !flipped ? mappedPoint.nX : -mappedPoint.nX;
        return acc + map[mappedPoint.nName].x - adjustedPointX;
      }, 0);
      const ySum = mappedPoints.reduce((acc: any, mappedPoint: any) => {
        return acc + map[mappedPoint.nName].y - mappedPoint.nY;
      }, 0);
      const numMappedPoints = Math.max(mappedPoints.length, 1);
      let x = Math.floor(xSum / numMappedPoints);
      let y = Math.floor(ySum / numMappedPoints);

      part.map.nChildren.filter(pointNotInMap).forEach((mappedPoint: any) => {
        map[mappedPoint.nName] = {
          x: x + (!flipped ? mappedPoint.nX : -mappedPoint.nX),
          y: y + mappedPoint.nY,
        };
      });

      const originX = part.origin.nX;
      const adjustX = !flipped ? originX : part.nWidth - originX;
      x -= adjustX;
      y -= part.origin.nY;

      const partVslot = vslot;
      const partSmapValue = this.smap.getValueFromName(part.z.nValue) || "";
      const partVslotPairs = new Set(vslot.match(twoChars));
      const partSmapPairs = new Set(partSmapValue.match(twoChars));
      const partSmapIntersection = new Set(
        [...partVslotPairs].filter((val) => partSmapPairs.has(val))
      );
      const intersectionWithHat = [...partSmapIntersection].filter((val) => {
        return hatSmapIntersection.has(val);
      });
      const invisibleZs: any = intersectionWithHat.reduce(
        (acc: any, val: any) => {
          (this.smap.getNamesFromValue(val) || []).forEach((z: number) => {
            acc.add(z);
          });
          return acc;
        },
        new Set()
      );
      if (invisibleZs.has(part.z.nValue)) {
        return;
      }

      const realZ = part.z.nValue === 0 ? part.nName : part.z.nValue;
      drawableFrames.push({
        img: part.nGetImage(),
        z: this.zmap.indexOf(realZ),
        x,
        y,
      });
    };

    const imgs = [
      this.body,
      this.head,
      this.Hair,
      this.Face,
      hat,
      faceAcc,
      // ...equips,
    ];

    if (includeEquips) {
      imgs.push(...equips);
    }

    imgs.forEach((img) => {
      if (!img) {
        return;
      }

      const imgVslot = img.info.vslot.nValue;
      const isHead = img === this.head;
      const isFace = img === this.Face || img === faceAcc;
      const isHair = img === this.Hair;

      if (isFace && useBackHead) {
        return;
      }

      let imgParts;
      if (isHead) {
        imgParts = useBackHead ? img.back.nChildren : img.front.nChildren;
      } else if (isFace) {
        imgParts = getFParts(img);
      } else if (isHair) {
        imgParts = getParts(img).filter((n: any) => n.nName !== "hairShade");
      } else {
        imgParts = getParts(img);
      }

      const drawableImgParts = imgParts.filter(isDrawable);

      drawableImgParts.forEach((p: any) => addFrame(p, imgVslot));
    });

    drawableFrames.sort((a: any, b: any) => a.z - b.z);

    return drawableFrames;
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    // console.log(this.frame, `${Math.round(1000 / msPerTick)}fps`);
    // set whether the character is flipped prior to drawing
    if (this.pos.right && !this.pos.left) {
      this.flipped = true;
    } else if (this.pos.left && !this.pos.right) {
      this.flipped = false;
    }

    if (this.isDead) {
      this.setStance(Stance.dead);
    } else {
      // set the stance
      if (this.isInAttack || this.isInAlert) {
        // is in alert only
        if (!this.isInAttack) {
          if (!this.pos.fh) {
            if (this.isInClimbingRope) {
              this.setStance(Stance.ladder, 0, false, this.isClimbMoving);
            } else {
              this.setStance(Stance.jump);
            }
          } else {
            if (this.isInAlert && this.pos.left !== this.pos.right) {
              this.setStance("walk1");
            } else {
              if (this.isInClimbingRope) {
                this.setStance(Stance.ladder, 0, false, this.isClimbMoving);
              } else if (this.stance) {
                this.setStance(Stance.alert, 0, false, true);
              }
            }
          }
        } else {
        }
      } else if (this.isInClimbingRope) {
        this.setStance(Stance.ladder, 0, false, this.isClimbMoving);
      } else {
        if (!this.pos.fh) {
          this.setStance(Stance.jump);
        } else if (this.pos.left !== this.pos.right) {
          this.setStance(Stance.walk1);
        } else {
          this.setStance(Stance.stand1);
          // this here usefull to test stance
          // this.setStance(Stance.proneStab);
        }
      }
    }

    const characterIsFlipped = !!this.flipped;
    const imgdir = this.baseBody[this.stance][this.frame];
    const imgdirFlip = !!imgdir.nGet("flip").nGet("nValue", 0);
    const frameIsFlipped = characterIsFlipped !== imgdirFlip;

    const drawableFrames = this.getDrawableFrames(
      this.stance,
      this.frame,
      frameIsFlipped
    );

    // this is inefficient to call everything just to get it without equips, but it's temporary
    const drawableBodyFrames = this.getDrawableFrames(
      this.stance,
      this.frame,
      frameIsFlipped,
      false
    );

    const mx = imgdir.nGet("move").nGet("nX", 0);
    const moveX = !characterIsFlipped ? mx : -mx;
    const moveY = imgdir.nGet("move").nGet("nY", 0);
    const rotate = imgdir.nGet("rotate").nGet("nValue", 0);
    const angle = !characterIsFlipped ? rotate : 360 - rotate;

    let spriteWidth = 0;
    let spriteHeight = 0;
    let minDx = 0;
    let minDy = 0;

    // draws all parts of the character: head, body, etc..
    drawableFrames.forEach((frame: any) => {
      const dx = Math.floor(this.pos.x + frame.x - camera.x + moveX);
      const dy = Math.floor(this.pos.y + frame.y - camera.y + moveY);

      canvas.drawImage({
        img: frame.img,
        dx: dx,
        dy: dy,
        flipped: frameIsFlipped,
        rx: -frame.x,
        ry: -frame.y,
        angle,
      });
    });

    this.bodyRects = [];
    let minX: number | null = null;
    let minY: number | null = null;

    drawableBodyFrames.forEach((frame: any) => {
      const dx = Math.floor(this.pos.x + frame.x - camera.x + moveX);
      const dy = Math.floor(this.pos.y + frame.y - camera.y + moveY);

      // Draw a border around the player's outline
      const outlineColor = "blue"; // Change this to the desired border color
      const borderWidth = 2; // Change this to the desired border width

      canvas.context.strokeStyle = outlineColor;
      canvas.context.lineWidth = borderWidth;
      canvas.context.strokeRect(dx, dy, frame.img.width, frame.img.height);

      this.bodyRects.push({
        x: dx + camera.x,
        y: dy + camera.y,
        width: frame.img.width,
        height: frame.img.height,
      });

      if (minX === null || dx < minX) {
        minX = dx + camera.x;
      }
      if (minY === null || dy < minY) {
        minY = dy + camera.y;
      }
    });

    this.bodyStartPoistion = {
      x: minX,
      y: minY,
    };

    this.drawName(canvas, camera, lag, msPerTick, tdelta);

    this.drawDamageIndicator(canvas, camera, lag, msPerTick, tdelta);

    this.projectiles.forEach((projectile: Projectile) => {
      projectile.draw(canvas, camera, lag, msPerTick, tdelta);
    });

    const minXYPosition = findMinXY(this.bodyRects);
    const maxXYPosition = findMaxXY(this.bodyRects);
    canvas.context.fillStyle = "red";
    canvas.context.fillRect(
      Math.floor(minXYPosition.minX + maxXYPosition.maxX) / 2 - camera.x - 2,
      (minXYPosition.minY + maxXYPosition.maxY) / 2 - camera.y - 2,
      4,
      4
    );
  }
  drawName(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    const tagHeight = 16;
    const tagPadding = 4;
    const tagColor = "#000000";
    const tagAlpha = 0.7;
    const offsetFromY = 2;
    const nameOpts = {
      text: this.name,
      x: Math.floor(this.pos.x - camera.x),
      y: Math.floor(this.pos.y - camera.y + offsetFromY + 3),
      color: "#ffffff",
      align: "center",
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
  drawDamageIndicator(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    this.DamageIndicator.drawAllDamageIndicators(
      canvas,
      camera,
      lag,
      msPerTick,
      tdelta
    );
  }
}

export default MapleCharacter;
