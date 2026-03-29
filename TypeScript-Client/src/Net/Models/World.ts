import Channel from './Channel';

export default class World {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly flag: number,
    public readonly eventMessage: string,
    public channels: Channel[] = []
  ) {}
}
