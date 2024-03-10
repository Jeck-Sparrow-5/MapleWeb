import MapleInventory from "../Constants/Inventory/MapleInventory";
import WZFiles from "../Constants/enums/WZFiles";
import WZManager from "../wz-utils/WZManager";

interface ItemOpts {
  itemId: number;
  quantity: number;
}

class Item {
  opts: {
    itemId: number;
    quantity: number;
  };
  itemId: number;
  // name: string;
  // description: string;
  // price: number;
  quantity: number;
  node: any;

  static async fromOpts(opts: ItemOpts) {
    const object = new Item(opts);
    await object.load();
    return object;
  }
  constructor(opts: ItemOpts) {
    this.opts = opts;
    this.itemId = opts.itemId;
    // this.name = name;
    // this.description = description;
    // this.price = price;
    this.quantity = opts.quantity || 1;
    this.node = null;
  }

  async load() {
    if (this.itemId === 0) {
      const mesoAmount = this.quantity;
      const itemId = MapleInventory.getMesosItemId(mesoAmount);
      let strId = `${itemId}`.padStart(8, "0");
      const idFirst4digits = strId.slice(0, 4);
      let itemFile = await WZManager.get(
        `${WZFiles.Item}/${MapleInventory.WzInventoryType.Special}/${idFirst4digits}.img/${itemId}`
      );
      this.node = itemFile;
    } else {
      const wzInventoryType = MapleInventory.getWzNameFromInventoryId(
        this.itemId.toString().padStart(8, "0")
      );
      if (wzInventoryType === MapleInventory.WzInventoryType.Pet) {
        this.node = await WZManager.get(
          `${WZFiles.Item}/${wzInventoryType}/${this.itemId}.img`
        );
      } else if (wzInventoryType === MapleInventory.WzInventoryType.Special) {
        let strId = `${this.itemId}`.padStart(8, "0");
        const idFirst4digits = strId.slice(0, 4);
        let itemFile = await WZManager.get(
          `${WZFiles.Item}/${wzInventoryType}/${idFirst4digits}.img/${strId}`
        );
        this.node = itemFile;
      } else {
        let strId = `${this.itemId}`.padStart(8, "0");
        const idFirst4digits = strId.slice(0, 4);
        let itemFile = await WZManager.get(
          `${WZFiles.Item}/${wzInventoryType}/${idFirst4digits}.img/${strId}`
        );
        this.node = itemFile;
      }
    }
  }
}

export default Item;
