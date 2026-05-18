import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import SessionManager from '../SessionManager';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import MyCharacter from '../MyCharacter';

export interface TradeSlot { itemId: number; quantity: number; }

const UITrade = {
  isHidden: true,
  buttons:  [] as MapleStanceButton[],
  initialized: false,
  x: 140,
  y: 130,
  W: 340,
  H: 260,

  partnerName: '',
  mySlots:      [] as TradeSlot[],
  partnerSlots: [] as TradeSlot[],
  myMesos:       0,
  partnerMesos:  0,
  myConfirmed:   false,
  partnerConfirmed: false,

  async initialize(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.cancel(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Confirm/OK trade
    const btOK = uiWin?.nGet('BtOK');
    if (btOK) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W / 2 - 40, y: this.y + this.H - 28,
        img: btOK.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.confirm(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  open(partnerName: string, canvas?: GameCanvas) {
    this.partnerName = partnerName;
    this.mySlots = [];
    this.partnerSlots = [];
    this.myMesos = 0;
    this.partnerMesos = 0;
    this.myConfirmed = false;
    this.partnerConfirmed = false;
    if (!this.initialized && canvas) this.initialize(canvas);
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
  },

  cancel() {
    if (SessionManager.isConnected()) {
      const pkt = new OutPacket(OutPacketOpcode.PLAYER_OPERATION);
      (pkt as any).writeByte(0x0A); // cancel trade
      pkt.dispatch();
    }
    this.close();
  },

  confirm() {
    if (!SessionManager.isConnected()) return;
    const pkt = new OutPacket(OutPacketOpcode.PLAYER_OPERATION);
    (pkt as any).writeByte(0x0F); // confirm trade
    pkt.dispatch();
    this.myConfirmed = true;
  },

  close() {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H, color: '#14141E', alpha: 0.97, strokeColor: '#667799', strokeWidth: 1 });

    canvas.drawText({ text: 'Trade', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 13 });
    canvas.drawText({ text: `Trading with: ${this.partnerName}`, color: '#AAAACC', x: this.x + 10, y: this.y + 30, fontSize: 10 });

    // My side
    const halfW = this.W / 2 - 10;
    canvas.drawText({ text: MyCharacter.name || 'You', color: '#88FFAA', x: this.x + 8, y: this.y + 48, fontSize: 10 });
    canvas.drawRect({ x: this.x + 8, y: this.y + 52, width: halfW, height: 120, strokeColor: '#334466', strokeWidth: 1 });

    if (this.mySlots.length === 0) {
      canvas.drawText({ text: '(drag items here)', color: '#444466', x: this.x + 18, y: this.y + 115, fontSize: 9 });
    }
    canvas.drawText({ text: `Mesos: ${this.myMesos.toLocaleString()}`, color: '#FFEE66', x: this.x + 10, y: this.y + 178, fontSize: 10 });
    if (this.myConfirmed) canvas.drawText({ text: '✓ Confirmed', color: '#44FF44', x: this.x + 10, y: this.y + 192, fontSize: 10 });

    // Partner side
    const partnerX = this.x + halfW + 18;
    canvas.drawText({ text: this.partnerName, color: '#FFAAAA', x: partnerX, y: this.y + 48, fontSize: 10 });
    canvas.drawRect({ x: partnerX, y: this.y + 52, width: halfW, height: 120, strokeColor: '#334466', strokeWidth: 1 });

    if (this.partnerSlots.length === 0) {
      canvas.drawText({ text: '(waiting...)', color: '#444466', x: partnerX + 10, y: this.y + 115, fontSize: 9 });
    }
    canvas.drawText({ text: `Mesos: ${this.partnerMesos.toLocaleString()}`, color: '#FFEE66', x: partnerX, y: this.y + 178, fontSize: 10 });
    if (this.partnerConfirmed) canvas.drawText({ text: '✓ Confirmed', color: '#44FF44', x: partnerX, y: this.y + 192, fontSize: 10 });

    canvas.drawText({ text: 'Confirm', color: '#AAFFAA', x: this.x + this.W / 2 - 25, y: this.y + this.H - 14, fontSize: 10 });
    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UITrade;
