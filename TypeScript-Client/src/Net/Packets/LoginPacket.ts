import { OutPacket, OutPacketOpcode } from '../OutPacket';

export default class LoginPacket extends OutPacket {
  constructor(
    public username: string,
    public password: string,
  ) {
    super(OutPacketOpcode.LOGIN);

    const volumeSerialNumber = this.getVolumeSerialNumber();

    const part1 = volumeSerialNumber.substr(0, 2);
    const part2 = volumeSerialNumber.substr(2, 2);
    const part3 = volumeSerialNumber.substr(4, 2);
    const part4 = volumeSerialNumber.substr(6, 2);

    const h = this.hexToDec(part4);
    const w = this.hexToDec(part3);
    const i = this.hexToDec(part2);
    const d = this.hexToDec(part1);

    this.writeString(username);
    this.writeString(password);

    this.skip(6);

    this.writeByte(h);
    this.writeByte(w);
    this.writeByte(i);
    this.writeByte(d);
  }

  private getVolumeSerialNumber(): string {
    // Generate a stable browser fingerprint using canvas + navigator
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('MapleWeb', 2, 2);
      const dataUrl = canvas.toDataURL();
      // Hash the data URL to 8 hex chars
      let hash = 0;
      for (let i = 0; i < dataUrl.length; i++) {
        hash = (Math.imul(31, hash) + dataUrl.charCodeAt(i)) | 0;
      }
      const nav = navigator.userAgent + navigator.language + screen.width + screen.height;
      let navHash = 0;
      for (let i = 0; i < nav.length; i++) {
        navHash = (Math.imul(31, navHash) + nav.charCodeAt(i)) | 0;
      }
      const combined = ((hash ^ navHash) >>> 0).toString(16).padStart(8, '0').toUpperCase();
      return combined;
    } catch (_) {
      return '12345678';
    }
  }
}
