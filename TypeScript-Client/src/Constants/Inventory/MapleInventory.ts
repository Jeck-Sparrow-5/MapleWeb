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
      5: WzInventoryType.Cash,
      2: WzInventoryType.Consume,
      3: WzInventoryType.Install,
      4: WzInventoryType.Etc,
      9: WzInventoryType.Special,
    };
    console.log(
      "secondDigitToWzInventoryType[secondDigit]",
      secondDigitToWzInventoryType[secondDigit]
    );
    return secondDigitToWzInventoryType[secondDigit];
  }
};

const getInventoryTypeFromItemId = (id: number): MapleInventoryType => {
  const idAsString = id.toString();

  /// maybe ????????????????????????
  if (idAsString[0] === "5") {
    return MapleInventoryType.SETUP;
  } else {
    const secondDigit = idAsString[1];
    const secondDigitToWzInventoryType: Record<string, MapleInventoryType> = {
      5: MapleInventoryType.CASH,
      2: MapleInventoryType.USE,
      3: MapleInventoryType.EQUIPPED,
      4: MapleInventoryType.ETC,
    };

    return secondDigitToWzInventoryType[secondDigit];
  }
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

const MapleInventory = {
  // todo
  // getInventoryByType,
  getByWZName,
  getWzNameFromInventoryId,
  WzInventoryType,
  getMesosItemId,
  getInventoryTypeFromItemId,
  isMeso,
};

export default MapleInventory;
