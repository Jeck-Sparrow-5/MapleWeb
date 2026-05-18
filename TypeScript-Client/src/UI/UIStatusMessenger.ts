import GameCanvas from '../GameCanvas';
import config from '../Config';

interface StatusMessage {
  text: string;
  color: string;
  opacity: number;
}

const MAX_MESSAGES = 7;
const FADE_STEP = 0.02;
const LINE_HEIGHT = 14;

const UIStatusMessenger = {
  messages: [] as StatusMessage[],

  show(text: string, color = '#FFFFFF'): void {
    this.messages.unshift({ text, color, opacity: 1 });
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.pop();
    }
  },

  update(): void {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].opacity -= FADE_STEP;
      if (this.messages[i].opacity <= 0) {
        this.messages.splice(i, 1);
      }
    }
  },

  draw(canvas: GameCanvas): void {
    const baseX = config.originalWidth - 8;
    const baseY = config.originalHeight - 145 + (config.height - config.originalHeight);

    this.messages.forEach((msg, i) => {
      const y = baseY - i * LINE_HEIGHT;
      canvas.drawText({ text: msg.text, x: baseX + 1, y: y + 1,
        color: '#000000', fontSize: 11, align: 'right', alpha: msg.opacity });
      canvas.drawText({ text: msg.text, x: baseX, y,
        color: msg.color, fontSize: 11, align: 'right', alpha: msg.opacity });
    });
  },
};

export default UIStatusMessenger;
