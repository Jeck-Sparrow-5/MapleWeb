import WZManager from '../wz-utils/WZManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import config from '../Config';

// Notice4 known dimensions from WZ data
const NOTICE_WIDTH = 266;
const NOTICE_TOP_H = 21;
const NOTICE_CENTER_H = 20;
const NOTICE_BOTTOM_H = 78;
const CENTER_REPEATS = 2;

// Total dialog height
const DIALOG_H = NOTICE_TOP_H + NOTICE_CENTER_H * CENTER_REPEATS + NOTICE_BOTTOM_H;

export default class UIMesoDropDialog {
  private basicImg: any = null;
  private noticeTopNode: any = null;
  private noticeCenterNode: any = null;
  private noticeBottomNode: any = null;
  isHidden: boolean = true;
  private buttons: MapleStanceButton[] = [];
  private canvas: GameCanvas;
  private onConfirm: ((amount: number) => void) | null = null;
  private maxMesos: number = 0;
  private errorMessage: string = '';
  private errorTimer: number = 0;
  private inputValue: string = '0';
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  static async fromOpts(opts: { canvas: GameCanvas }) {
    const dialog = new UIMesoDropDialog(opts);
    await dialog.load();
    return dialog;
  }

  constructor(opts: { canvas: GameCanvas }) {
    this.canvas = opts.canvas;
  }

  // Dialog is always centered on the canvas
  private get x(): number {
    return Math.floor((config.width - NOTICE_WIDTH) / 2);
  }

  private get y(): number {
    return Math.floor((config.height - DIALOG_H) / 2);
  }

  async load() {
    this.basicImg = await WZManager.get('UI.wz/Basic.img');

    this.noticeTopNode = this.basicImg.nGet('Notice4').nGet('t');
    this.noticeCenterNode = this.basicImg.nGet('Notice4').nGet('c');
    this.noticeBottomNode = this.basicImg.nGet('Notice4').nGet('s');

    // Pre-decode images so they're ready when we draw
    this.noticeTopNode.nGetImage();
    this.noticeCenterNode.nGetImage();
    this.noticeBottomNode.nGetImage();
  }

  private createButtons() {
    // Remove old buttons
    this.buttons.forEach(btn => ClickManager.removeButton(btn));
    this.buttons = [];

    // Buttons go in the bottom section of Notice4
    const btnY = this.y + NOTICE_TOP_H + NOTICE_CENTER_H * CENTER_REPEATS + 30;
    const centerX = this.x + Math.floor(NOTICE_WIDTH / 2);

    const okButton = new MapleStanceButton(null, {
      x: centerX - 52,
      y: btnY,
      isRelativeToCamera: true,
      isPartOfUI: true,
      img: this.basicImg.nGet('BtOK2').nChildren,
      onClick: () => {
        this.confirm();
      },
    });

    const cancelButton = new MapleStanceButton(null, {
      x: centerX + 5,
      y: btnY,
      isRelativeToCamera: true,
      isPartOfUI: true,
      img: this.basicImg.nGet('BtCancel2').nChildren,
      onClick: () => {
        this.hide();
      },
    });

    this.buttons = [okButton, cancelButton];
    this.buttons.forEach(btn => ClickManager.addButton(btn));
  }

  show(maxMesos: number, onConfirm: (amount: number) => void) {
    this.isHidden = false;
    this.maxMesos = maxMesos;
    this.onConfirm = onConfirm;
    this.errorMessage = '';
    this.errorTimer = 0;
    this.inputValue = '0';

    // Create buttons at current position (centered)
    this.createButtons();

    // Capture keyboard input directly — no HTML elements needed
    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.isHidden) return;

      if (e.key >= '0' && e.key <= '9') {
        if (this.inputValue === '0') {
          this.inputValue = e.key;
        } else {
          this.inputValue += e.key;
        }
        // Cap the displayed value length
        if (this.inputValue.length > 10) {
          this.inputValue = this.inputValue.slice(0, 10);
        }
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Backspace') {
        if (this.inputValue.length > 1) {
          this.inputValue = this.inputValue.slice(0, -1);
        } else {
          this.inputValue = '0';
        }
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Enter') {
        this.confirm();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Escape') {
        this.hide();
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', this.keydownHandler, true);
  }

  hide() {
    this.buttons.forEach(btn => ClickManager.removeButton(btn));
    this.buttons = [];
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    this.onConfirm = null;
    this.errorMessage = '';
    this.isHidden = true;
  }

  private confirm() {
    const amount = parseInt(this.inputValue) || 0;
    if (amount <= 0) {
      this.errorMessage = 'Please enter a valid amount.';
      this.errorTimer = 2000;
      return;
    }
    if (amount > this.maxMesos) {
      this.errorMessage = 'You don\'t have enough mesos!';
      this.errorTimer = 2000;
      return;
    }
    if (this.onConfirm) {
      this.onConfirm(amount);
    }
    this.hide();
  }

  update(msPerTick: number) {
    if (this.isHidden) return;
    if (this.errorTimer > 0) {
      this.errorTimer -= msPerTick;
      if (this.errorTimer <= 0) {
        this.errorMessage = '';
        this.errorTimer = 0;
      }
    }
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    if (this.isHidden) return;

    const x = this.x;
    let y = this.y;

    // Draw top piece
    canvas.drawImage({ img: this.noticeTopNode.nGetImage(), dx: x, dy: y });
    y += NOTICE_TOP_H;

    // Draw repeated center strips
    for (let i = 0; i < CENTER_REPEATS; i++) {
      canvas.drawImage({ img: this.noticeCenterNode.nGetImage(), dx: x, dy: y });
      y += NOTICE_CENTER_H;
    }

    // Draw bottom piece (has space for input box and buttons)
    canvas.drawImage({ img: this.noticeBottomNode.nGetImage(), dx: x, dy: y });

    // Draw dialog text in the top + center area
    const textX = x + Math.floor(NOTICE_WIDTH / 2);
    const textY = this.y + 5;
    canvas.drawText({
      text: 'How many mesos would you',
      x: textX,
      y: textY,
      color: '#000000',
      fontSize: 12,
      fontFamily: 'Arial',
      align: 'center',
    });
    canvas.drawText({
      text: 'like to drop?',
      x: textX,
      y: textY + 14,
      color: '#000000',
      fontSize: 12,
      fontFamily: 'Arial',
      align: 'center',
    });

    // Draw the input value inside the white box area of Notice4 bottom piece
    // The white box is roughly at x+18, y_bottom+14, width ~230, height ~18
    const inputBoxY = this.y + NOTICE_TOP_H + NOTICE_CENTER_H * CENTER_REPEATS;
    canvas.drawText({
      text: this.inputValue,
      x: x + NOTICE_WIDTH - 25,
      y: inputBoxY + 16,
      color: '#000000',
      fontSize: 12,
      fontFamily: 'Arial',
      align: 'right',
    });

    // Draw error message if any
    if (this.errorMessage) {
      canvas.drawText({
        text: this.errorMessage,
        x: textX,
        y: inputBoxY + 10,
        color: '#CC0000',
        fontSize: 11,
        fontFamily: 'Arial',
        align: 'center',
      });
    }

    // Draw buttons
    this.buttons.forEach(btn => {
      btn.draw(canvas, camera, lag, msPerTick, tdelta);
    });
  }

  destroy() {
    this.hide();
  }
}
