import NXManager from '../wz-utils/NXManager';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import SessionManager from '../SessionManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { Position } from '../Effects/DamageIndicator';

export interface BuddyEntry {
  charId: number;
  name: string;
  channel: number; // -1 = offline
  mapId?: number;
}

export const buddyList: BuddyEntry[] = [];

class UIUserList extends DragableMenu {
  bgImg: any = null;
  buttons: MapleStanceButton[] = [];
  loaded = false;
  tab: 'buddy' | 'party' = 'buddy';
  selectedIndex = -1;
  readonly W = 312;
  readonly H = 389;

  static async fromOpts(opts: any) {
    const o = new UIUserList(opts);
    await o.load(opts.canvas);
    return o;
  }

  async load(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('UserList')?.nGetImage?.() ?? null;

    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => this.setIsHidden(true),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    const btAddFriend = uiWin?.nGet('BtAddFriend');
    if (btAddFriend) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 10, y: this.y + this.H - 28,
        img: btAddFriend.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          const name = prompt('Enter character name to add as buddy:');
          if (!name || !SessionManager.isConnected()) return;
          const pkt = new OutPacket(OutPacketOpcode.ADD_BUDDY);
          (pkt as any).writeByte(1); // add
          (pkt as any).writeString(name);
          (pkt as any).writeString(''); // group
          pkt.dispatch();
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.loaded = true;
  }

  setIsHidden(v: boolean) {
    this.isHidden = v;
    this.buttons.forEach((b) => (b.isHidden = v));
  }

  moveTo(pos: Position) {
    const dx = pos.x - this.x; const dy = pos.y - this.y;
    this.x = pos.x; this.y = pos.y;
    this.buttons.forEach((b) => { b.x += dx; b.y += dy; });
  }

  getRect(_cam: CameraInterface) {
    return { x: this.x, y: this.y, width: this.W, height: this.H };
  }

  update(_ms: number) {}

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.loaded) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
      canvas.context.fillRect(this.x, this.y, this.W, this.H);
      canvas.context.strokeStyle = '#556688';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H);
      canvas.context.restore();
    }

    canvas.drawText({ text: 'Buddy List', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });
    canvas.drawText({ text: `${buddyList.filter(b => b.channel >= 0).length}/${buddyList.length} online`, color: '#AAAACC', x: this.x + this.W - 90, y: this.y + 14, fontSize: 10 });

    if (buddyList.length === 0) {
      canvas.drawText({ text: 'No buddies yet', color: '#666688', x: this.x + 100, y: this.y + 100, fontSize: 11 });
    }

    buddyList.slice(0, 14).forEach((entry, i) => {
      const ey = this.y + 28 + i * 25;
      const online = entry.channel >= 0;
      canvas.context.save();
      canvas.context.fillStyle = i === this.selectedIndex ? 'rgba(100,130,200,0.7)' : 'transparent';
      if (i === this.selectedIndex) canvas.context.fillRect(this.x + 4, ey - 2, this.W - 8, 22);
      canvas.context.fillStyle = online ? '#88FF88' : '#888888';
      canvas.context.beginPath();
      canvas.context.arc(this.x + 12, ey + 7, 5, 0, Math.PI * 2);
      canvas.context.fill();
      canvas.context.restore();
      canvas.drawText({ text: entry.name, color: online ? '#FFFFFF' : '#888888', x: this.x + 22, y: ey + 10, fontSize: 11 });
      if (online) {
        canvas.drawText({ text: `Ch.${entry.channel + 1}`, color: '#AACCAA', x: this.x + 200, y: ey + 10, fontSize: 9 });
      }
    });

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }
}

export default UIUserList;
