import { Cryptography } from './Net/Cryptography';
import { MessageProcessor } from './Net/MessageProcessor';

class SessionManager {
  private static instance: SessionManager | null = null;
  private websocket: WebSocket | null = null;
  private isFirstMessage: boolean = true;
  private crypto: Cryptography | null = null;
  private messageProcessor: MessageProcessor | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  initialize(websocketUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(websocketUrl);
        this.websocket.binaryType = 'arraybuffer';
        this.isFirstMessage = true;

        this.websocket.addEventListener('open', () => {
          console.log('WebSocket connected');
          resolve();
        });

        this.websocket.addEventListener('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

        this.websocket.addEventListener('close', (event) => {
          this.websocket = null;
          console.log('WebSocket closed:', event.code, event);
          alert('WebSocket closed');
        });

        this.websocket.addEventListener('message', (event) => {
          if (this.isFirstMessage) {
            this.isFirstMessage = false;
            this.setupCrypto(event.data);
          } else {
            this.handleMessage(event.data);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupCrypto(data: ArrayBuffer): void {
    this.crypto = new Cryptography(new Uint8Array(data));
    this.messageProcessor = new MessageProcessor(this.crypto);
  }

  private handleMessage(data: ArrayBuffer): void {
    if (this.messageProcessor) {
      this.messageProcessor.processMessage(data);
    } else {
      console.error('MessageProcessor not initialized');
    }
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  sendMessage(bytes: Uint8Array): boolean {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      let header: Uint8Array = new Uint8Array(4);
      this.crypto!.createHeader(header, bytes.length);
      this.crypto!.encrypt(bytes, bytes.length);

      console.log('header bytes:', header);
      console.log('data after encrypt:', bytes);

      this.websocket!.send(header.buffer);
      console.log('header sent');
      this.websocket!.send(bytes.buffer);
      console.log('data sent');
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }
}

export default SessionManager.getInstance();
