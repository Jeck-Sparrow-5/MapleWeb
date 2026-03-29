export class Stat {
  constructor(
    public readonly characterId: number,
    public readonly characterName: string,
    public readonly gender: number,
    public readonly skinColor: number,
    public readonly face: number,
    public readonly hair: number,
    public readonly petIds: bigint[],
    public readonly level: number,
    public readonly job: number,
    public readonly str: number,
    public readonly dex: number,
    public readonly int: number,
    public readonly luk: number,
    public readonly hp: number,
    public readonly maxHp: number,
    public readonly mp: number,
    public readonly maxMp: number,
    public readonly remainingAp: number,
    public readonly remainingSp: number,
    public readonly exp: number,
    public readonly frame: number,
    public readonly gachaExp: number,
    public readonly mapId: number,
    public readonly spawnPoint: number,
  ) {}
}

export class Look {
  constructor(
    public readonly gender: number,
    public readonly skinColor: number,
    public readonly face: number,
    public readonly mega: number,
    public readonly hair: number,
    public readonly eqSlots: Map<number, number>,
    public readonly maskedEqSlots: Map<number, number>,
    public readonly petIds: number[],
  ) {}
}

export class Rank {
  constructor(
    public readonly rank: number,
    public readonly rankMovement: number,
    public readonly jobRank: number,
    public readonly jobRankMovement: number,
  ) {}
}

export class Character {
  constructor(
    public readonly stat: Stat,
    public readonly look: Look,
    public readonly rank?: Rank | null,
  ) {}
}
