// MyCharacterSetup.ts
import MapleCharacter from "./MapleCharacter";
import Stats from "./Stats/Stats";
import { JobsMainType } from "./Constants/Jobs";
import MapleMap from "./MapleMap";
import Inventory from "./Inventory/Inventory";
import Item from "./Inventory/Item";

const MyCharacter = new MapleCharacter({
  name: "Player",
  hp: 10000,          // starting health points
  maxHp: 50,       // maximum health at level 1
  mp: 5,           // starting magic points
  maxMp: 5,        // maximum magic points at level 1
  Hair: 30030,     // initial hair id (example value)
  exp: 0,          // starting experience
  fame: 0,         // starting fame
  inventory: new Inventory({
    mesos: 100,    // starting mesos
  }),
  stats: new Stats({
    str: 500,
    dex: 500,
    int: 4,
    luk: 4,
    abilityPoints: 0,
    maxHp: 50,
    maxMp: 5,
    jobType: JobsMainType.Beginner, // beginner job type
    job: "Beginner",                // beginner job order (using a literal here)
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
setTimeout(() => {
  MapleMap.PlayerCharacter = MyCharacter;
}, 1000);

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
