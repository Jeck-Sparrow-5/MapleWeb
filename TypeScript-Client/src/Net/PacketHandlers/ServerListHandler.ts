import { PacketHandler } from '../PacketHandler';
import { Cryptography } from '../Cryptography';
import World from '../Models/World';
import Channel from '../Models/Channel';
import UILogin from '../../UI/UILogin';
import LoginState, {LoginSubState} from '../../LoginState';

export class ServerListHandler extends PacketHandler {
  async handle(data: DataView): Promise<void> {
    let offset = Cryptography.HEADER_LENGTH + 2;

    const worldId = data.getInt8(offset);
    offset += 1;

    console.log('World ID:', worldId);
    if (worldId === -1) { // end of world list
      await LoginState.switchToSubState(LoginSubState.WORLD_SELECT);
      return;
    }

    const worldNameLength = data.getInt16(offset, true);
    offset += 2;

    const worldName = this.readString(data, offset, worldNameLength);
    offset += worldNameLength;

    const worldFlag = data.getInt8(offset);
    offset += 1;

    console.log('World Name Length:', worldNameLength);
    console.log('World Name:', worldName);
    console.log('World Flag:', worldFlag);

    const worldEventMessageLength = data.getInt16(offset, true);
    offset += 2;

    console.log('worldEventMessageLength', worldEventMessageLength);
    const worldEventMessage = this.readString(data, offset, worldEventMessageLength);
    offset += worldEventMessageLength;

    const rateModifier1 = data.getInt8(offset);
    offset += 1;
    const eventExpModifier = data.getInt8(offset);
    offset += 1;
    const rateModifier2 = data.getInt8(offset);
    offset += 1;
    const dropRateModifier = data.getInt8(offset);
    offset += 1;
    offset += 1; // skip 1 byte

    const world = new World(worldId, worldName, worldFlag, worldEventMessage);
    const channelCount = data.getInt8(offset);
    offset += 1;
    if (channelCount > 0) {
      for (let i = 0; i < channelCount; i++) {
        const channelNameLength = data.getInt16(offset, true);
        offset += 2;
        const channelName = this.readString(data, offset, channelNameLength);
        offset += channelNameLength;
        const channelCapacity = data.getInt32(offset, true);
        offset += 4;
        const channelWorldId = data.getInt8(offset);
        offset += 1;
        const channelId = data.getInt8(offset);
        offset += 1;
        const channelIsAgeRestricted = data.getInt8(offset);
        offset += 1;

        console.log('channelNameLength', channelNameLength);
        console.log('channelName', channelName);
        console.log('channelCapacity', channelCapacity);
        console.log('channelWorldId', channelWorldId);
        console.log('channelId', channelId);
        console.log('channelIsAgeRestricted', channelIsAgeRestricted);
        world.channels.push(new Channel(channelId, channelName, channelCapacity, channelIsAgeRestricted === 1));
      }
    }

    UILogin.worlds.push(world);
  }

  private readString(data: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const charCode = data.getUint8(offset + i);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
}
