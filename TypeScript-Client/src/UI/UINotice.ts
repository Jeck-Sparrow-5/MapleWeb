import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';

const UINotice = {
  isHidden: true,
  message: '',
  buttons: [] as MapleStanceButton[],
  initialized: false,
  bgTop: null as any,
  bgFill: null as any,
  bgBot: null as any,
  onOk: null as (() => void) | null,

  async show(canvas: GameCanvas, message: string, onOk?: () => void) {
    this.message = message;
    this.onOk = onOk ?? null;
    this.isHidden = false;

    if (!this.initialized) {
      await this.init(canvas);
    }
    this.buttons.forEach((b) => (b.isHidden = false));
  },

  async init(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    const dlg = uiWin?.nGet('UtilDlgEx');
    this.bgTop  = dlg?.nGet('t')?.nGetImage?.() ?? null;
    this.bgFill = dlg?.nGet('c')?.nGetImage?.() ?? null;
    this.bgBot  = dlg?.nGet('s')?.nGetImage?.() ?? null;

    const btOk = uiWin?.nGet('BtOK');
    if (btOk) {
      const okBtn = new MapleStanceButton(canvas, {
        x: 350, y: 310,
        img: btOk.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => { this.hide(); this.onOk?.(); },
      });
      ClickManager.addButton(okBtn);
      this.buttons.push(okBtn);
    }

    this.initialized = true;
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    const x = 200; const y = 200; const w = 400; const h = 130;

    canvas.drawRect({ x, y, width: w, height: h, color: '#000000', alpha: 0.8, strokeColor: '#557799', strokeWidth: 1 });

    // Word-wrap message
    const words = this.message.split(' ');
    let line = ''; let ly = y + 30;
    for (const word of words) {
      const test = line + word + ' ';
      if (canvas.measureText({ text: test, fontSize: 12 }).width > w - 20) {
        canvas.drawText({ text: line, x: x + 10, y: ly, color: '#FFFFFF', fontSize: 12 });
        line = word + ' '; ly += 18;
      } else line = test;
    }
    canvas.drawText({ text: line, x: x + 10, y: ly, color: '#FFFFFF', fontSize: 12 });

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UINotice;
