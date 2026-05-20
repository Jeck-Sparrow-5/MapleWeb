import GameCanvas from '../GameCanvas';
import MyCharacter from '../MyCharacter';
import config from '../Config';
import { getQuickSlots, getQuickSlotIcons } from './UIKeyConfig';

const QS_SIZE  = 32;
const QS_COUNT = 8;
const QS_GAP   = 2;
const QS_TOTAL = QS_COUNT * (QS_SIZE + QS_GAP) - QS_GAP;
const QS_Y     = config.height - 52 - QS_SIZE - 6;
const QS_X0    = Math.floor((config.width - QS_TOTAL) / 2);

const BAR_H    = 52;
const BAR_Y    = config.height - BAR_H;
const W        = config.width;
const GAUGE_H  = 12;
const EXP_H    = 6;
const PAD      = 8;
const GAUGE_W  = 200;
const HP_Y     = BAR_Y + 10;
const MP_Y     = BAR_Y + 28;
const EXP_Y    = config.height - EXP_H;

const UIStatusBar = {
  draw(canvas: GameCanvas) {
    const c = MyCharacter;
    if (!c?.stats) return;

    // Background
    canvas.drawRect({ x: 0, y: BAR_Y, width: W, height: BAR_H, color: '#0a0a14', alpha: 0.85 });
    // top divider
    canvas.drawRect({ x: 0, y: BAR_Y, width: W, height: 1, color: '#334466', alpha: 1 });

    // --- HP bar ---
    const hpPct = Math.max(0, Math.min(1, c.hp / c.maxHp));
    canvas.drawRect({ x: PAD, y: HP_Y, width: GAUGE_W, height: GAUGE_H, color: '#1a0000', alpha: 1 });
    if (hpPct > 0)
      canvas.drawRect({ x: PAD, y: HP_Y, width: Math.floor(GAUGE_W * hpPct), height: GAUGE_H, color: '#cc2222', alpha: 1 });
    canvas.drawText({ text: `HP  ${c.hp}/${c.maxHp}`, x: PAD + GAUGE_W + 6, y: HP_Y + 10, color: '#ffaaaa', fontSize: 10 });

    // --- MP bar ---
    const mpPct = Math.max(0, Math.min(1, c.mp / c.maxMp));
    canvas.drawRect({ x: PAD, y: MP_Y, width: GAUGE_W, height: GAUGE_H, color: '#00001a', alpha: 1 });
    if (mpPct > 0)
      canvas.drawRect({ x: PAD, y: MP_Y, width: Math.floor(GAUGE_W * mpPct), height: GAUGE_H, color: '#2255cc', alpha: 1 });
    canvas.drawText({ text: `MP  ${c.mp}/${c.maxMp}`, x: PAD + GAUGE_W + 6, y: MP_Y + 10, color: '#aaaaff', fontSize: 10 });

    // --- Level + name (center) ---
    const lv = c.stats?.level ?? 1;
    canvas.drawText({ text: `Lv.${lv}`, x: W / 2 - 30, y: BAR_Y + 18, color: '#f5a623', fontSize: 11, fontWeight: 'bold', align: 'right' });
    canvas.drawText({ text: c.name ?? '', x: W / 2 - 24, y: BAR_Y + 18, color: '#ffffff', fontSize: 11, align: 'left' });

    // --- Mesos (right) ---
    const mesos = (c as any).mesos ?? c.inventory?.mesos ?? 0;
    canvas.drawText({ text: `${mesos.toLocaleString()} mesos`, x: W - PAD, y: BAR_Y + 18, color: '#ffe066', fontSize: 10, align: 'right' });

    // --- Quick slot bar (above status bar) ---
    const slots = getQuickSlots();
    const icons = getQuickSlotIcons();
    for (let qi = 0; qi < QS_COUNT; qi++) {
      const qx = QS_X0 + qi * (QS_SIZE + QS_GAP);
      canvas.drawRect({ x: qx, y: QS_Y, width: QS_SIZE, height: QS_SIZE, color: '#000000', alpha: 0.65 });
      canvas.drawRect({ x: qx, y: QS_Y, width: QS_SIZE, height: QS_SIZE, strokeColor: '#334466', strokeWidth: 1 });
      const action = slots[qi];
      if (action) {
        const icon = icons[action];
        if (icon?.width > 1) {
          const scale = (QS_SIZE - 4) / Math.max(icon.width, icon.height);
          canvas.drawImage({ img: icon, dx: qx + 2, dy: QS_Y + 2, scaleX: scale, scaleY: scale });
        }
      }
      canvas.drawText({ text: `${qi + 1}`, x: qx + 2, y: QS_Y + 9, color: '#445566', fontSize: 7 });
    }

    // --- EXP bar (very bottom, full width) ---
    const expPct = c.maxExp > 0 ? Math.max(0, Math.min(1, c.exp / c.maxExp)) : 0;
    canvas.drawRect({ x: 0, y: EXP_Y, width: W, height: EXP_H, color: '#1a1400', alpha: 1 });
    if (expPct > 0)
      canvas.drawRect({ x: 0, y: EXP_Y, width: Math.floor(W * expPct), height: EXP_H, color: '#e8a020', alpha: 1 });
    const expPctText = c.maxExp > 0 ? `${(expPct * 100).toFixed(2)}%` : '0%';
    canvas.drawText({ text: expPctText, x: W / 2, y: EXP_Y + 5, color: '#ffe09a', fontSize: 9, align: 'center' });
  },
};

export default UIStatusBar;
