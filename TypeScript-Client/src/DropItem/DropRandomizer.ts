import DropData from "../Constants/Drops/DropData";
import ItemConstants from "../Constants/Inventory/ItemConstants";
import Randomizer from "../Tools/Randomizer";
import MonsterDropEntry from "./MonsterDropEntry";

// itemid = 0 -> meso

// Enables multiple drops by mobs of the same equipment, number of possible drops based on the quantities provided at the drop data.
const USE_MULTIPLE_SAME_EQUIP_DROP = false;

// todo: commnet this becasue of ItemConstants.getInventoryType(itemId);
// function calculateChance(itemId: number, isBoss: boolean) {
//   const mit = ItemConstants.getInventoryType(itemId);

//   let mindrop = 0;
//   let maxdrop = 0;
//   const number = Math.floor((itemId / 1000) % 1000);

//   switch (mit) {
//     case ItemConstants.EQUIP:
//       return isBoss ? 40000 : 700;
//     case ItemConstants.USE:
//       if (isBoss) {
//         mindrop = 1;
//         maxdrop = 4;
//       }
//       switch (number) {
//         case 0:
//           mindrop = 1;

//           return 40000;
//         case 1:
//         case 2:
//           return 10000;
//         case 3:
//         case 4:
//         case 11:
//         case 28:
//         case 30:
//         case 46:
//           return 0;
//         case 10:
//         case 12:
//         case 20:
//         case 22:
//         case 50:
//           return 3000;
//         case 290:
//           return isBoss ? 40000 : 1000;
//         case 40:
//         case 41:
//         case 43:
//         case 44:
//         case 48:
//           return isBoss ? 10000 : 750;
//         case 100:
//         case 101:
//         case 102:
//         case 109:
//         case 120:
//         case 211:
//         case 240:
//         case 270:
//         case 310:
//         case 320:
//         case 390:
//         case 430:
//         case 440:
//         case 460:
//         case 470:
//         case 490:
//         case 500:
//           return 0;
//         case 47:
//           return 220000;
//         case 49:
//         case 70:
//         case 210:
//         case 330:
//           return isBoss ? 2500 : 400;
//         case 60:
//         case 61:
//           mindrop = 10;
//           maxdrop = 50;
//           return 10000;
//         case 213:
//           return 100000;
//         case 280:
//           return isBoss ? 20000 : 1000;
//         case 381:
//         case 382:
//         case 383:
//         case 384:
//         case 385:
//         case 386:
//         case 387:
//         case 388:
//           return 20000;
//         case 510:
//         case 511:
//         case 512:
//           return 10000;
//         default:
//           return 0;
//       }
//     case ItemConstants.SETUP:
//       switch (number) {
//         case 0:
//           return 200000;
//         case 4:
//         case 130:
//         case 131:
//           return 3000;
//         case 30:
//           return 10000;
//         case 32:
//           return 10000;
//         default:
//           return 7000;
//       }
//     default:
//       return 7000;
//   }
// }

// Maple chance:
// every item has a chance to drop from 0 to 999999, higher the number, bigger the chance
// if the chance is bigger then a random number from 0 to 999999, the item will drop
function isDroped(chance: number): boolean {
  return Randomizer.getRandomInteger(1, 999999) <= chance;
}

async function retrieveEffectiveDrop(monsterId: number, isBoss: boolean) {
  // This reads the drop entries searching for multi-equip, properly processing them

  const list = DropData.getDropDataByMobId(monsterId);
  if (!USE_MULTIPLE_SAME_EQUIP_DROP) {
    return list;
  }

  const extraMultiEquipDrops = new Map();

  let multiDrops = extraMultiEquipDrops.get(monsterId);
  const extra = [];

  if (!multiDrops) {
    multiDrops = [];

    for (const mde of list) {
      if (ItemConstants.isEquipment(mde.itemId) && mde.Maximum > 1) {
        multiDrops.push(mde);

        const randomNumber = Randomizer.getRandomInteger(
          mde.Minimum,
          mde.Maximum
        );
        for (let i = 0; i < randomNumber - 1; i++) {
          extra.push(randomNumber); // This passes copies of the equips' MDE with min/max quantity > 1, but I don't care about equips; they are unused anyway
        }
      }
    }

    if (multiDrops.length > 0) {
      extraMultiEquipDrops.set(monsterId, multiDrops);
    }
  } else {
    for (const mde of multiDrops) {
      const rnd = Randomizer.getRandomInteger(mde.Minimum, mde.Maximum);
      for (let i = 0; i < rnd - 1; i++) {
        extra.push(mde);
      }
    }
  }

  const ret = [...list, ...extra];
  return ret;
}

const chooseRandomAmounts = (monsterDropEntry: MonsterDropEntry) => {
  const min = monsterDropEntry.minimum;
  const max = monsterDropEntry.maximum;
  const amount = Randomizer.getRandomInteger(min, max);
  monsterDropEntry.chosenAmount = amount;
};

const getRandomDropItems = async (
  monsterId: number,
  isBoss: boolean
): Promise<MonsterDropEntry[]> => {
  const mobDropItems = await retrieveEffectiveDrop(monsterId, isBoss);
  mobDropItems.forEach((monsterDropEntry: MonsterDropEntry) =>
    chooseRandomAmounts(monsterDropEntry)
  );
  return mobDropItems.filter((monsterDropEntry: MonsterDropEntry) =>
    isDroped(monsterDropEntry.chance)
  );
};

// const getRandomMesoAmount = (monsterExp) => {
//   const mesoRate = 1; // Set meso rate to 1

//   const randomValue = Math.random();
//   let mesoDecrease = Math.pow(0.93, monsterExp / 300.0);
//   if (mesoDecrease > 1.0) {
//     mesoDecrease = 1.0;
//   }
//   let tempmeso = Math.min(
//     30000,
//     Math.floor(
//       (mesoDecrease * monsterExp * (1.0 + Math.floor(randomValue * 20))) / 10.0
//     )
//   );

//   return tempmeso;
// };

const DropRandomizer = {
  getRandomDropItems,
  // getRandomMesoAmount,
};

export default DropRandomizer;
