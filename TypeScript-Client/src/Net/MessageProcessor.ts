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
    let offset = 0;
    const bytes = new Uint8Array(data);

    while (offset < bytes.length) {
      if (offset + Cryptography.HEADER_LENGTH > bytes.length) break;

      const payloadLength = this.crypto.checkLength(bytes.subarray(offset, offset + 4));
      if (payloadLength <= 0 || offset + Cryptography.HEADER_LENGTH + payloadLength > bytes.length) break;

      // Decrypt payload in-place (slice = copy so original buffer untouched)
      const payload = bytes.slice(offset + Cryptography.HEADER_LENGTH, offset + Cryptography.HEADER_LENGTH + payloadLength);
      this.crypto.decrypt(payload, payloadLength);

      // Build padded buffer so handlers still use HEADER_LENGTH+2 as data start
      const padded = new Uint8Array(Cryptography.HEADER_LENGTH + payloadLength);
      padded.set(payload, Cryptography.HEADER_LENGTH);
      const view = new DataView(padded.buffer);

      const opcode = view.getUint16(Cryptography.HEADER_LENGTH, true);
      console.debug('opcode:', opcode);

      const handler = this.handlerRegistry.getHandler(opcode);
      if (handler) {
        handler.handle(view);
      } else {
        console.warn('Unhandled opcode:', opcode);
      }

      offset += Cryptography.HEADER_LENGTH + payloadLength;
    }
  }
}
