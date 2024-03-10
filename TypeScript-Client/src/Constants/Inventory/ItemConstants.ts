import MapleInventory, { MapleInventoryType } from "./MapleInventory";
// converted from

// /src/constants/inventory/ItemConstants.java
class ItemConstants {
  static LOCK = 0x01;
  static SPIKES = 0x02;
  static KARMA_USE = 0x02;
  static COLD = 0x04;
  static UNTRADEABLE = 0x08;
  static KARMA_EQP = 0x10;
  static SANDBOX = 0x40; // Let 0x40 until it's proven something uses this
  static PET_COME = 0x80;
  static ACCOUNT_SHARING = 0x100;
  static MERGE_UNTRADEABLE = 0x200;

  static EXPIRING_ITEMS = true;
  static permanentItemids = new Set();

  static initializePermanentItemids() {
    const pi = [5000060, 5000100, 5000101, 5000102];
    for (const i of pi) {
      ItemConstants.permanentItemids.add(i);
    }
  }

  static getFlagByInt(type: number) {
    if (type === 128) {
      return ItemConstants.PET_COME;
    } else if (type === 256) {
      return ItemConstants.ACCOUNT_SHARING;
    }
    return 0;
  }

  static isThrowingStar(itemId: number) {
    return Math.floor(itemId / 10000) === 207;
  }

  static isBullet(itemId: number) {
    return Math.floor(itemId / 10000) === 233;
  }

  static isPotion(itemId: number) {
    return Math.floor(itemId / 1000) === 2000;
  }

  static isFood(itemId: number) {
    const useType = Math.floor(itemId / 1000);
    return useType === 2022 || useType === 2010 || useType === 2020;
  }

  static isConsumable(itemId: number) {
    return ItemConstants.isPotion(itemId) || ItemConstants.isFood(itemId);
  }

  static isRechargeable(itemId: number) {
    return (
      ItemConstants.isThrowingStar(itemId) || ItemConstants.isBullet(itemId)
    );
  }

  static isArrowForCrossBow(itemId: number) {
    return Math.floor(itemId / 1000) === 2061;
  }

  static isArrowForBow(itemId: number) {
    return Math.floor(itemId / 1000) === 2060;
  }

  static isArrow(itemId: number) {
    return (
      ItemConstants.isArrowForBow(itemId) ||
      ItemConstants.isArrowForCrossBow(itemId)
    );
  }

  static isPet(itemId: number) {
    return Math.floor(itemId / 1000) === 5000;
  }

  // static isExpirablePet(itemId: number) {
  //   return (
  //     YamlConfig.config.server.USE_ERASE_PET_ON_EXPIRATION || itemId === 5000054
  //   );
  // }

  static isPermanentItem(itemId: number) {
    return ItemConstants.permanentItemids.has(itemId);
  }

  static isNewYearCardEtc(itemId: number) {
    return Math.floor(itemId / 10000) === 430;
  }

  static isNewYearCardUse(itemId: number) {
    return Math.floor(itemId / 10000) === 216;
  }

  static isAccessory(itemId: number) {
    return itemId >= 1110000 && itemId < 1140000;
  }

  static isTaming(itemId: number) {
    const itemType = Math.floor(itemId / 1000);
    return itemType === 1902 || itemType === 1912;
  }

  static isTownScroll(itemId: number) {
    return itemId >= 2030000 && itemId < 2030100;
  }

  static isAntibanishScroll(itemId: number) {
    return itemId === 2030100;
  }

  static isCleanSlate(scrollId: number) {
    return scrollId > 2048999 && scrollId < 2049004;
  }

  static isModifierScroll(scrollId: number) {
    return scrollId === 2040727 || scrollId === 2041058;
  }

  static isFlagModifier(scrollId: number, flag: number) {
    if (
      scrollId === 2041058 &&
      (flag & ItemConstants.COLD) === ItemConstants.COLD
    )
      return true;
    if (
      scrollId === 2040727 &&
      (flag & ItemConstants.SPIKES) === ItemConstants.SPIKES
    )
      return true;
    return false;
  }

  static isChaosScroll(scrollId: number) {
    return scrollId >= 2049100 && scrollId <= 2049103;
  }

  static isRateCoupon(itemId: number) {
    const itemType = Math.floor(itemId / 1000);
    return itemType === 5211 || itemType === 5360;
  }

  static isExpCoupon(couponId: number) {
    return Math.floor(couponId / 1000) === 5211;
  }

  static isPartyItem(itemId: number) {
    return (
      (itemId >= 2022430 && itemId <= 2022433) ||
      (itemId >= 2022160 && itemId <= 2022163)
    );
  }

  static isPartyAllcure(itemId: number) {
    return itemId === 2022433 || itemId === 2022163;
  }

  static isHiredMerchant(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 503;
  }

  static isPlayerShop(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 514;
  }

  // todo : still need to fix MapleInventory.getInventoryByType(type);
  // static getInventoryType(itemId: number): MapleInventoryType {
  //   let inventoryType = MapleInventoryType.UNDEFINED;

  //   const type = Math.floor(itemId / 1000000);
  //   if (type >= 1 && type <= 5) {
  //     inventoryType = MapleInventory.getInventoryByType(type);
  //   }

  //   return inventoryType;
  // }

  static isMakerReagent(itemId: number) {
    return Math.floor(itemId / 10000) === 425;
  }

  static isOverall(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 105;
  }

  static isCashStore(itemId: number): boolean {
    const itemType = Math.floor(itemId / 10000);
    return itemType === 503 || itemType === 514;
  }

  static isMapleLife(itemId: number): boolean {
    const itemType = Math.floor(itemId / 10000);
    return itemType === 543 && itemId !== 5430000;
  }

  static isWeapon(itemId: number): boolean {
    return itemId >= 1302000 && itemId < 1493000;
  }

  static isEquipment(itemId: number): boolean {
    return itemId < 2000000 && itemId !== 0;
  }

  static isFishingChair(itemId: number): boolean {
    return itemId === 3011000;
  }

  static isMedal(itemId: number): boolean {
    return itemId >= 1140000 && itemId < 1143000;
  }

  static isWeddingRing(itemId: number): boolean {
    return itemId >= 1112803 && itemId <= 1112809;
  }

  static isWeddingToken(itemId: number): boolean {
    return itemId >= 4031357 && itemId <= 4031364;
  }

  static isFace(itemId: number): boolean {
    return itemId >= 20000 && itemId < 22000;
  }

  static isHair(itemId: number): boolean {
    return itemId >= 30000 && itemId < 35000;
  }

  static isFaceExpression(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 516;
  }

  static isChair(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 301;
  }
}

export default ItemConstants;
