import Stance from "./enums/Stance";
import WZFiles from "./enums/WZFiles";
import PLAY_AUDIO from "../Audio/PlayAudio";
import WZManager from "../wz-utils/WZManager";

export enum WeaponType {
  SWORD = 1302,
  AXE = 1312,
  MACE = 1322,
  DAGGER = 1332,
  WAND = 1372,
  STAFF = 1382,
  SWORD_2H = 1402,
  AXE_2H = 1412,
  MACE_2H = 1422,
  SPEAR = 1432,
  POLEARM = 1442,
  BOW = 1452,
  CROSSBOW = 1462,
  CLAW = 1472,
  KNUCKLER = 1482,
  PISTOL = 1492,
}

export enum EquipType {
  UNDEFINED = -1,
  ACCESSORY = 0,
  CAP = 100,
  CAPE = 110,
  COAT = 104,
  FACE = 2,
  GLOVES = 108,
  HAIR = 3,
  LONGCOAT = 105,
  PANTS = 106,
  PET_EQUIP = 180,
  PET_EQUIP_FIELD = 181,
  PET_EQUIP_LABEL = 182,
  PET_EQUIP_QUOTE = 183,
  RING = 111,
  SHIELD = 109,
  SHOES = 107,
  TAMING = 190,
  TAMING_SADDLE = 191,
  SWORD = 1302,
  AXE = 1312,
  MACE = 1322,
  DAGGER = 1332,
  WAND = 1372,
  STAFF = 1382,
  SWORD_2H = 1402,
  AXE_2H = 1412,
  MACE_2H = 1422,
  SPEAR = 1432,
  POLEARM = 1442,
  BOW = 1452,
  CROSSBOW = 1462,
  CLAW = 1472,
  KNUCKLER = 1482,
  PISTOL = 1492,
}

const EquipTypeToSoundName: Record<WeaponType, string> = {
  [WeaponType.SWORD]: "swordL",
  [WeaponType.AXE]: "mace",
  [WeaponType.MACE]: "mace",
  [WeaponType.DAGGER]: "swordS",
  [WeaponType.WAND]: "swordS",
  [WeaponType.STAFF]: "poleArm",
  [WeaponType.SWORD_2H]: "swordL",
  [WeaponType.AXE_2H]: "mac",
  [WeaponType.MACE_2H]: "mac",
  [WeaponType.SPEAR]: "spear",
  [WeaponType.POLEARM]: "poleArm",
  [WeaponType.BOW]: "bow",
  [WeaponType.CROSSBOW]: "cBow",
  [WeaponType.CLAW]: "tGlove",
  [WeaponType.KNUCKLER]: "knuckle",
  [WeaponType.PISTOL]: "gun",
};

export const WeaponTypeToStance: any = {
  [EquipType.SWORD]: {
    melee: [
      Stance.stabO1,
      Stance.stabO2,
      Stance.stabOF,
      Stance.swingO1,
      Stance.swingO2,
      Stance.swingO3,
      Stance.swingOF,
    ],
    range: [
      Stance.stabO1,
      Stance.stabO2,
      Stance.stabOF,
      Stance.swingO1,
      Stance.swingO2,
      Stance.swingO3,
      Stance.swingOF,
    ],
  },
  [EquipType.BOW]: {
    melee: [Stance.swingT1, Stance.swingT3],
    range: [Stance.shoot1, Stance.shootF],
  },
  [EquipType.CLAW]: {
    melee: [Stance.stabO1, Stance.stabO2, Stance.stabOF],
    range: [Stance.swingO1, Stance.swingO2, Stance.swingO3, Stance.swingOF],
  },
  // need to complete for every weapon type
};

export const WeaponTypeToSoundEffect = {
  [EquipType.SWORD]: {
    melee: ["swordSwing1", "swordSwing2", "swordSwing3"],
  },
};

const map = new Map();
console.log(Object.keys(EquipType));
for (const key in EquipType) {
  if (Object.prototype.hasOwnProperty.call(EquipType, key)) {
    map.set(EquipType[key], key);
  }
}

export const playAudioForAttackByWeaponType = async function (
  equipType: WeaponType
) {
  // there is sometimes /Attack and /Attack2
  // probebly the second one is for close range attack
  const jumpNode: any = await WZManager.get(
    `${WZFiles.Sound}/Weapon.img/${EquipTypeToSoundName[equipType]}/Attack`
  );
  const jumpAudio = jumpNode.nGetAudio();
  PLAY_AUDIO(jumpAudio);
};

const getEquipTypeById = function (itemid: number) {
  let ret;
  const val = Math.floor(itemid / 100000);
  if (val === 13 || val === 14) {
    // ret = map.get(Math.floor(itemid / 1000));
    ret = Math.floor(itemid / 1000);
  } else {
    // ret = map.get(Math.floor(itemid / 10000));
    ret = Math.floor(itemid / 10000);
  }

  return ret || EquipType.UNDEFINED;
};

export default getEquipTypeById;
