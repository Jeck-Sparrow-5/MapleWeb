class MonsterDropEntry {
  itemId;
  chance;
  questid;
  minimum;
  maximum;
  chosenAmount;

  constructor(
    itemId: number,
    chance: number,
    minimum: number,
    maximum: number,
    questid: number
  ) {
    this.itemId = itemId;
    this.chance = chance;
    this.questid = questid;
    this.minimum = minimum;
    this.maximum = maximum;
    this.chosenAmount = 0;
  }
}

export default MonsterDropEntry;
