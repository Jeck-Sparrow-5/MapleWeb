export enum MapleInventoryType {
  UNDEFINED = 0,
  EQUIP = 1,
  USE = 2,
  SETUP = 3,
  ETC = 4,
  CASH = 5,
  CANHOLD = 6,
  EQUIPPED = -1,
}

export enum WzInventoryType {
  Pet = "Pet",
  Eqp = "Eqp",
  Install = "Install",
  Consume = "Consume",
  Etc = "Etc",
  Cash = "Cash",
  Special = "Special",
}

// todo: fix this (multiple type variables)
// export const getInventoryByType = (type: number) => {
//   for (let type of Object.keys(MapleInventoryType)) {
//     if (MapleInventoryType[type] === type) {
//       return type;
//     }
//   }
//   return MapleInventoryType.UNDEFINED;
// };

const getMesosItemId = (mesoAmount: number) => {
  if (mesoAmount < 50) {
    return "09000000";
  } else if (mesoAmount < 100) {
    return "09000001";
  } else if (mesoAmount < 500) {
    return "09000002";
  } else {
    return "09000003";
  }
};

const isMeso = (itemId: string) => {
  console.log(itemId, "isMeso");
  return (
    itemId === "09000000" ||
    itemId === "09000001" ||
    itemId === "09000002" ||
    itemId === "09000003"
  );
};

const getWzNameFromInventoryId = (id: string): WzInventoryType => {
  const idAsString = id.toString();
  if (idAsString[0] === "5") {
    return WzInventoryType.Pet;
  } else {
    const secondDigit = idAsString[1];
    console.log("secondDigit", secondDigit);

    const secondDigitToWzInventoryType: Record<string, WzInventoryType> = {
      1: WzInventoryType.Eqp,
      5: WzInventoryType.Cash,
      2: WzInventoryType.Consume,
      3: WzInventoryType.Install,
      4: WzInventoryType.Etc,
      9: WzInventoryType.Special,
    };
    return secondDigitToWzInventoryType[secondDigit] ?? WzInventoryType.Etc;
  }
};

const getInventoryTypeFromItemId = (id: number): MapleInventoryType => {
  const s = id.toString();
  const first = s[0];
  const second = s[1];
  if (first === '1') return MapleInventoryType.EQUIP;   // 1xxxxxxx = equip
  if (first === '5') return MapleInventoryType.CASH;    // 5xxxxxxx = cash/pet
  const map: Record<string, MapleInventoryType> = {
    '2': MapleInventoryType.USE,
    '3': MapleInventoryType.SETUP,
    '4': MapleInventoryType.ETC,
  };
  return map[second] ?? map[first] ?? MapleInventoryType.ETC;
};

export const getByWZName = (name: string): MapleInventoryType => {
  if (name === "Install") {
    return MapleInventoryType.SETUP;
  } else if (name === "Consume") {
    return MapleInventoryType.USE;
  } else if (name === "Etc") {
    return MapleInventoryType.ETC;
  } else if (name === "Cash" || name === "Pet") {
    return MapleInventoryType.CASH;
  }
  return MapleInventoryType.UNDEFINED;
};

const getInventoryByType = (type: MapleInventoryType): string => {
  switch (type) {
    case MapleInventoryType.EQUIP:    return 'equip';
    case MapleInventoryType.USE:      return 'use';
    case MapleInventoryType.SETUP:    return 'setup';
    case MapleInventoryType.ETC:      return 'etc';
    case MapleInventoryType.CASH:     return 'cash';
    case MapleInventoryType.EQUIPPED: return 'equip';
    default:                          return 'etc';
  }
};

const MapleInventory = {
  getInventoryByType,
  getByWZName,
  getWzNameFromInventoryId,
  WzInventoryType,
  getMesosItemId,
  getInventoryTypeFromItemId,
  isMeso,
};

export default MapleInventory;
