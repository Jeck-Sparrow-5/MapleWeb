import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';

interface SkillEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: string;
  skillId: number;
}

const activeEffects: SkillEffect[] = [];

// Color by skill job category (first digit of skill ID)
function colorForSkill(skillId: number): string {
  const cat = Math.floor(skillId / 10000000);
  switch (cat) {
    case 1: return '#FFAAAA'; // Warrior — red
    case 2: return '#AAAAFF'; // Magician — blue
    case 3: return '#AAFFAA'; // Bowman — green
    case 4: return '#FFAAFF'; // Thief — purple
    case 5: return '#FFDDAA'; // Pirate — orange
    default: return '#FFFFAA'; // Beginner — yellow
  }
}

export function showSkillEffect(worldX: number, worldY: number, skillId: number) {
  activeEffects.push({
    x: worldX, y: worldY,
    startTime: Date.now(),
    duration: 500,
    color: colorForSkill(skillId),
    skillId,
  });
}

export function drawSkillEffects(canvas: GameCanvas, camera: CameraInterface) {
  const now = Date.now();
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const e = activeEffects[i];
    const elapsed = now - e.startTime;
    if (elapsed >= e.duration) { activeEffects.splice(i, 1); continue; }

    const t = elapsed / e.duration; // 0→1
    const alpha = 1 - t;
    const cx = e.x - camera.x;
    const cy = e.y - camera.y;

    const r1 = 20 + t * 50;
    const r2 = 8 + t * 20;

    // Expanding ring
    canvas.drawCircle({ x: cx, y: cy, radius: r1,
      strokeColor: e.color, strokeWidth: 4 * (1 - t) + 1, strokeAlpha: alpha * 0.9 });

    // Inner burst
    canvas.drawCircle({ x: cx, y: cy, radius: r2,
      color: e.color, alpha: alpha * 0.4 });

    // Radial lines
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + t * Math.PI;
      canvas.drawLine({
        x1: cx + Math.cos(angle) * r2,  y1: cy + Math.sin(angle) * r2,
        x2: cx + Math.cos(angle) * r1 * 0.8, y2: cy + Math.sin(angle) * r1 * 0.8,
        color: e.color, width: 1.5, alpha: alpha * 0.7,
      });
    }
  }
}
