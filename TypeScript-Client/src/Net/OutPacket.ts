import SessionManager from '../SessionManager';

export enum OutPacketOpcode {
  LOGIN = 1,
  CHARACTER_LIST_REQUEST = 5,
  ACCEPT_TOS = 7,
  SERVER_LIST_REQUEST = 11,
  PONG = 24,
}

export class OutPacket {
  private buffer: number[] = [];
  private readonly opcode: OutPacketOpcode;

  constructor(opcode: OutPacketOpcode) {
    this.opcode = opcode;
    this.writeShort(this.opcode);
  }

  dispatch(): any {
    SessionManager.sendMessage(this.getBytes());
  }

  protected writeShort(value: number): void {
    this.buffer.push(value & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
  }

  protected writeByte(value: number): void {
    this.buffer.push(value & 0xFF);
  }

  protected writeString(str: string): void {
    this.writeShort(str.length);
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
  }

  protected skip(bytes: number): void {
    for (let i = 0; i < bytes; i++) {
      this.buffer.push(0);
    }
  }

  protected hexToDec(hex: string): number {
    return parseInt(hex, 16);
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  public getBuffer(): ArrayBuffer {
    return this.getBytes().buffer;
  }
}
