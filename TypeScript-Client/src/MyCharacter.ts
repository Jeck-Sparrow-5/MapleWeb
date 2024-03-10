import MapleCharacter from "./MapleCharacter";
import getEquipTypeById from "./Constants/EquipType";
import Stats from "./Stats/Stats";
import { JobsMainType, JobsOrder } from "./Constants/Jobs";
import { AttackType } from "./Constants/AttackType";
// import DropRandomizer from "./DropItem/DropRandomizer";
import MapleMap from "./MapleMap";
import Inventory from "./Inventory/Inventory";
import Item from "./Inventory/Item";

const MyCharacter = new MapleCharacter({
  name: "JeckSparrow",
  hp: 1900,
  maxHp: 2002,
  mp: 2000,
  maxMp: 3000,
  Hair: 30000,
  exp: 1560,
  fame: 5,
  inventory: new Inventory({
    mesos: 100001,
  }),
  stats: new Stats({
    str: 16,
    dex: 51,
    int: 4,
    luk: 4,
    abilityPoints: 25,
    maxHp: 2002,
    maxMp: 3000,
    jobType: JobsMainType.Archer,
    job: JobsOrder.Archer.firstJob,
    level: 11,
  }),
});

MyCharacter.equips = [];

declare global {
  interface Window {
    charecter: MapleCharacter;
  }
}

window.charecter = MyCharacter;
setTimeout(() => {
  MapleMap.PlayerCharacter = MyCharacter;
}, 1000);

//
window.charecter.attachEquip(5, 1060002); // blue pants
window.charecter.attachEquip(4, 1040002); // White Undershirt
// window.charecter.attachEquip(10, 1302000); // level 0 sword - swing1

window.charecter.attachEquip(10, 1452002); // level10 bow -  stance - shoot1
// window.charecter.attachEquip(6, 1072369); // green shooes from kerning pq - currently not exists in these wz files

const addInventory = async () => {
  MyCharacter.inventory.equip = [
    // currently this throws error
    await Item.fromOpts({
      // 1060002 blue pants
      itemId: 1060002,
      quantity: 1,
    }),
  ];
};

addInventory();
// setTimeout(async () => {
//   console.log(await DropRandomizer.getRandomDropItems(100101, false));
// }, 2000);

// console.log(DropData.getDropDataByMobId(100101));

// shoot2 probebly crossbow
// window.charecter.attachEquip(10, 1472030); //  maple claw -  stance - shoot1
// window.charecter.attachEquip(10, 1372005); // Wooden Wand level 8 - stance -

export default MyCharacter;
