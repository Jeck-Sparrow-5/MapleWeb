import GameCanvas from '../GameCanvas';
import config from '../Config';

interface ClockState {
  visible: boolean;
  isCountdown: boolean;
  endTime: number;    // for countdown: Date.now() + seconds*1000
  hours: number;
  minutes: number;
  seconds: number;
}

const state: ClockState = {
  visible: false,
  isCountdown: false,
  endTime: 0,
  hours: 0, minutes: 0, seconds: 0,
};

const UIClock = {
  setRealTime(h: number, m: number, s: number) {
    state.visible = true;
    state.isCountdown = false;
    state.hours = h; state.minutes = m; state.seconds = s;
  },

  setCountdown(totalSeconds: number) {
    state.visible = true;
    state.isCountdown = true;
    state.endTime = Date.now() + totalSeconds * 1000;
  },

  hide() { state.visible = false; },

  draw(canvas: GameCanvas) {
    if (!state.visible) return;

    let text: string;
    if (state.isCountdown) {
      const remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
      if (remaining === 0) { state.visible = false; return; }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
      text = `${String(state.hours).padStart(2,'0')}:${String(state.minutes).padStart(2,'0')}:${String(state.seconds).padStart(2,'0')}`;
    }

    const cx = Math.floor(config.originalWidth / 2);
    const cy = 8;
    const w = 70; const h = 16;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(0,0,0,0.6)';
    canvas.context.fillRect(cx - w / 2, cy, w, h);
    canvas.context.strokeStyle = '#556688';
    canvas.context.strokeRect(cx - w / 2, cy, w, h);
    canvas.context.fillStyle = state.isCountdown ? '#FF8844' : '#AADDFF';
    canvas.context.font = 'bold 11px Arial';
    canvas.context.textAlign = 'center';
    canvas.context.fillText(text, cx, cy + 11);
    canvas.context.textAlign = 'left';
    canvas.context.restore();
  },
};

export default UIClock;
