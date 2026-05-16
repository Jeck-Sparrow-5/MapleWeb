import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';

interface Bubble {
  text: string;
  expiry: number;
}

// entityId (charId or npcOId) → active bubble
const activeBubbles = new Map<number, Bubble>();

const ChatBubbleRenderer = {
  parts: null as any,
  initialized: false,

  async initialize() {
    const node = await NXManager.get('UI.wz/ChatBalloon.img');
    const sec = node?.nGet('0');
    if (!sec) { this.initialized = true; return; }
    this.parts = {
      tl: sec.nGet('t')?.nGetImage?.(),
      tm: sec.nGet('c0')?.nGetImage?.(),  // top-center repeat
      tr: sec.nGet('tr')?.nGetImage?.(),
      ml: sec.nGet('m0')?.nGetImage?.(),
      mm: sec.nGet('m1')?.nGetImage?.(),
      mr: sec.nGet('m2')?.nGetImage?.(),
      bl: sec.nGet('b0')?.nGetImage?.(),
      bm: sec.nGet('b1')?.nGetImage?.(),
      br: sec.nGet('b2')?.nGetImage?.(),
      tail: sec.nGet('arrow')?.nGetImage?.(),
    };
    this.initialized = true;
  },

  show(entityId: number, text: string, durationMs = 4000) {
    activeBubbles.set(entityId, { text, expiry: Date.now() + durationMs });
  },

  clear(entityId: number) {
    activeBubbles.delete(entityId);
  },

  update() {
    const now = Date.now();
    for (const [id, b] of activeBubbles) {
      if (now > b.expiry) activeBubbles.delete(id);
    }
  },

  draw(canvas: GameCanvas, camera: CameraInterface, entityId: number, worldX: number, worldY: number) {
    const bubble = activeBubbles.get(entityId);
    if (!bubble) return;

    const cx = worldX - camera.x;
    const cy = worldY - camera.y;

    canvas.context.save();
    canvas.context.font = '11px Arial';
    const textW = Math.min(canvas.context.measureText(bubble.text).width, 160);
    const pad = 6;
    const bw = textW + pad * 2;
    const bh = 20;
    const bx = cx - bw / 2;
    const by = cy - bh - 10;

    // Draw bubble background (fallback rect if no WZ parts)
    canvas.context.fillStyle = 'rgba(255,255,255,0.92)';
    canvas.context.strokeStyle = '#444444';
    canvas.context.lineWidth = 1;
    canvas.context.beginPath();
    canvas.context.roundRect(bx, by, bw, bh, 4);
    canvas.context.fill();
    canvas.context.stroke();

    // Tail
    canvas.context.beginPath();
    canvas.context.moveTo(cx - 4, by + bh);
    canvas.context.lineTo(cx + 4, by + bh);
    canvas.context.lineTo(cx, by + bh + 6);
    canvas.context.closePath();
    canvas.context.fill();
    canvas.context.stroke();

    canvas.context.fillStyle = '#111111';
    canvas.context.textAlign = 'center';
    canvas.context.fillText(bubble.text.substring(0, 22), cx, by + bh - 5);
    canvas.context.textAlign = 'left';
    canvas.context.restore();
  },
};

export default ChatBubbleRenderer;
