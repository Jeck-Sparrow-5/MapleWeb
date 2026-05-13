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

    canvas.context.save();
    canvas.context.globalAlpha = alpha * 0.9;

    // Expanding ring
    const r1 = 20 + t * 50;
    canvas.context.strokeStyle = e.color;
    canvas.context.lineWidth = 4 * (1 - t) + 1;
    canvas.context.beginPath();
    canvas.context.arc(cx, cy, r1, 0, Math.PI * 2);
    canvas.context.stroke();

    // Inner burst
    const r2 = 8 + t * 20;
    canvas.context.fillStyle = e.color;
    canvas.context.globalAlpha = alpha * 0.4;
    canvas.context.beginPath();
    canvas.context.arc(cx, cy, r2, 0, Math.PI * 2);
    canvas.context.fill();

    // Radial lines
    canvas.context.globalAlpha = alpha * 0.7;
    canvas.context.strokeStyle = e.color;
    canvas.context.lineWidth = 1.5;
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + t * Math.PI;
      const inner = r2;
      const outer = r1 * 0.8;
      canvas.context.beginPath();
      canvas.context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      canvas.context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      canvas.context.stroke();
    }

    canvas.context.restore();
  }
}
