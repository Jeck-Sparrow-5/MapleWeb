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

    const textW = Math.min(canvas.measureText({ text: bubble.text, fontSize: 11 }).width, 160);
    const pad = 6;
    const bw = textW + pad * 2;
    const bh = 20;
    const bx = cx - bw / 2;
    const by = cy - bh - 10;

    // Bubble background
    canvas.drawRoundedRect({ x: bx, y: by, width: bw, height: bh, radius: 4,
      color: '#ffffff', alpha: 0.92, strokeColor: '#444444', strokeWidth: 1 });

    // Tail triangle
    canvas.drawPolygon({ points: [cx - 4, by + bh, cx + 4, by + bh, cx, by + bh + 6],
      color: '#ffffff', alpha: 0.92, strokeColor: '#444444', strokeWidth: 1 });

    canvas.drawText({ text: bubble.text.substring(0, 22), x: cx, y: by + bh - 5,
      color: '#111111', fontSize: 11, align: 'center' });
  },
};

export default ChatBubbleRenderer;
