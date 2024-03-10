import MonsterDropEntry from "../../DropItem/MonsterDropEntry";
import DbDropData from "./db-drop-data.json";

const dropDataMap = new Map();

const initializeDropDataObject = () => {
  DbDropData.drop_data.forEach((drop) => {
    const dropperId = drop.dropperid;
    if (!dropDataMap.has(dropperId)) {
      dropDataMap.set(dropperId, []);
    }
    dropDataMap.get(dropperId).push(drop);
  });
};

const getDropDataByMobId = (mobId: number) => {
  if (dropDataMap.size === 0) {
    initializeDropDataObject();
  }
  const dropsData = dropDataMap.get(mobId) || [];

  return dropsData.map((drop: any) => {
    return new MonsterDropEntry(
      drop.itemid,
      drop.chance,
      drop.minimum_quantity,
      drop.maximum_quantity,
      drop.questid
    );
  });
};

const DropData = {
  getDropDataByMobId,
};

export default DropData;
