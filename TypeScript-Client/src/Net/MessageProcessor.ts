import { Cryptography } from './Cryptography';
import { PacketHandlerRegistry } from './PacketHandlerRegistry';

export class MessageProcessor {
  private crypto: Cryptography;
  private handlerRegistry: PacketHandlerRegistry;

  constructor(crypto: Cryptography) {
    this.crypto = crypto;
    this.handlerRegistry = PacketHandlerRegistry.getInstance();
  }

  processMessage(data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    const payloadLength = this.crypto.checkLength(bytes);
    console.log('payloadLength:', payloadLength);

    const payload = bytes.subarray(Cryptography.HEADER_LENGTH);
    this.crypto.decrypt(payload, payloadLength);
    console.log('decrypted:', payload);

    const view = new DataView(payload.buffer);
    const opcode = view.getUint16(Cryptography.HEADER_LENGTH, true);
    console.debug('opcode:', opcode);

    const handler = this.handlerRegistry.getHandler(opcode);
    if (handler) {
      handler.handle(view);
    } else {
      console.warn('Unhandled opcode:', opcode);
    }
  }
}
