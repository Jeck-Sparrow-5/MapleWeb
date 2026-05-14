// MyCharacterSetup.ts
import MapleCharacter from "./MapleCharacter";
import Stats from "./Stats/Stats";
import { JobsMainType } from "./Constants/Jobs";
import MapleMap from "./MapleMap";
import Inventory from "./Inventory/Inventory";
import Item from "./Inventory/Item";

const MyCharacter = new MapleCharacter({
  name: "Player",
  hp: 50,
  maxHp: 50,
  mp: 5,
  maxMp: 5,
  Hair: 30030,
  exp: 0,
  fame: 0,
  inventory: new Inventory({
    mesos: 0,
  }),
  stats: new Stats({
    str: 4,
    dex: 4,
    int: 4,
    luk: 4,
    abilityPoints: 0,
    maxHp: 50,
    maxMp: 5,
    jobType: JobsMainType.Beginner,
    job: "Beginner",
    level: 1,
  }),
});

// Initialize equipment array.
MyCharacter.equips = [];

declare global {
  interface Window {
    charecter: MapleCharacter;
  }
}

window.charecter = MyCharacter;

// Attach beginner equipment.
window.charecter.attachEquip(5, 1060002); // blue pants
window.charecter.attachEquip(4, 1040002); // white undershirt

// Attach the beginner sword (slot 10, item ID 1302000)
window.charecter.attachEquip(10, 1302000);

// Example of adding an item to the equipment inventory.
const addInventory = async () => {
  MyCharacter.inventory.equip = [
    await Item.fromOpts({
      itemId: 1060002, // blue pants
      quantity: 1,
    }),
  ];
};

addInventory();

export default MyCharacter;
