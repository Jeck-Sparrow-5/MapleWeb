export default class Channel {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly capacity: number,
    public readonly isAgeRestricted: boolean
  ) {}
}
