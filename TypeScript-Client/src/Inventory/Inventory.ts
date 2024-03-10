import MapleInventory, {
  MapleInventoryType,
} from "../Constants/Inventory/MapleInventory";
import Item from "./Item";

// cant be more than 96 cause of the UI
const maxInventorySize = 96;

class Inventory {
  equip: Item[];
  use: Item[];
  etc: Item[];
  setup: Item[];
  cash: Item[];
  mesos: number;

  constructor(opts: any) {
    this.equip = opts.equip || [];
    this.use = opts.use || [];
    this.etc = opts.etc || [];
    this.setup = opts.setup || [];
    this.cash = opts.cash || [];
    this.mesos = opts.mesos || 0;
  }

  async addToInventory(itemId: number, quantity: number) {
    console.log("Adding to inventory", itemId, quantity);
    if (MapleInventory.isMeso(itemId.toString())) {
      this.mesos += quantity;
    } else {
      const mapleInventoryType =
        MapleInventory.getInventoryTypeFromItemId(itemId);
      let chosenType = this.cash;
      switch (mapleInventoryType) {
        case MapleInventoryType.EQUIP:
          chosenType = this.equip;
          break;
        case MapleInventoryType.USE:
          chosenType = this.use;
          break;
        case MapleInventoryType.SETUP:
          chosenType = this.setup;
          break;
        case MapleInventoryType.ETC:
          chosenType = this.etc;
          break;
        case MapleInventoryType.CASH:
          chosenType = this.cash;
          break;
        default:
          break;
      }

      const itemIndex = chosenType.findIndex((item) => item.itemId === itemId);
      if (itemIndex === -1) {
        chosenType.push(
          await Item.fromOpts({
            itemId,
            quantity,
          })
        );
      } else {
        chosenType[itemIndex].quantity += quantity;
      }
    }
    console.log(this);
  }
}

export default Inventory;
