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
      // shadow
      canvas.context.save();
      canvas.context.globalAlpha = msg.opacity;
      canvas.context.fillStyle = '#000000';
      canvas.context.font = '11px Arial';
      canvas.context.textAlign = 'right';
      canvas.context.fillText(msg.text, baseX + 1, y + 1);
      // text
      canvas.context.fillStyle = msg.color;
      canvas.context.fillText(msg.text, baseX, y);
      canvas.context.restore();
    });
    canvas.context.textAlign = 'left';
  },
};

export default UIStatusMessenger;
