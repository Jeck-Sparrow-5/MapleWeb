import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import SessionManager from '../SessionManager';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';

const UIChannel = {
  isHidden: true,
  buttons: [] as MapleStanceButton[],
  bgImg: null as any,
  initialized: false,
  x: 180,
  y: 150,
  W: 440,
  H: 90,
  selectedChannel: 0,
  channelCount: 20,

  async initialize(canvas: GameCanvas, channelCount = 20) {
    this.channelCount = channelCount;
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('Channel')?.nGetImage?.() ?? null;

    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.hide(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    const btChange = uiWin?.nGet('BtChange');
    if (btChange) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 60, y: this.y + this.H - 25,
        img: btChange.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => {
          if (!SessionManager.isConnected()) return;
          // Send CHANGE_CHANNEL packet
          const pkt = new OutPacket(OutPacketOpcode.CHANGE_MAP);
          pkt.dispatch();
          this.hide();
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  show() { this.isHidden = false; this.buttons.forEach((b) => (b.isHidden = false)); },
  hide() { this.isHidden = true;  this.buttons.forEach((b) => (b.isHidden = true)); },

  onMouseDown(mouseX: number, mouseY: number): boolean {
    if (this.isHidden) return false;
    // Channel selection grid
    const cols = 5;
    for (let i = 0; i < Math.min(this.channelCount, 20); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = this.x + 8 + col * 84;
      const by = this.y + 22 + row * 16;
      if (mouseX >= bx && mouseX < bx + 80 && mouseY >= by && mouseY < by + 14) {
        this.selectedChannel = i;
        return true;
      }
    }
    return false;
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.97)';
      canvas.context.fillRect(this.x, this.y, this.W, this.H + 30);
      canvas.context.strokeStyle = '#556688';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H + 30);
      canvas.context.restore();
    }

    canvas.drawText({ text: 'Change Channel', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });

    const cols = 5;
    for (let i = 0; i < Math.min(this.channelCount, 20); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = this.x + 8 + col * 84;
      const by = this.y + 22 + row * 16;
      const isSelected = i === this.selectedChannel;
      canvas.context.save();
      canvas.context.fillStyle = isSelected ? 'rgba(100,130,200,0.9)' : 'rgba(40,50,80,0.7)';
      canvas.context.fillRect(bx, by, 80, 13);
      canvas.context.restore();
      canvas.drawText({ text: `Ch.${i + 1}`, color: '#FFFFFF', x: bx + 25, y: by + 10, fontSize: 9 });
    }

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIChannel;
