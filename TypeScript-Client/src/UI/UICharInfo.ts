import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import FamePacket from '../Net/Packets/FamePacket';
import SessionManager from '../SessionManager';
import UIStatusMessenger from './UIStatusMessenger';

export interface CharInfoData {
  charId?: number;
  name: string;
  level: number;
  job: string;
  guild?: string;
  fame: number;
  str: number;
  dex: number;
  int: number;
  luk: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
}

const UICharInfo = {
  isHidden: true,
  data: null as CharInfoData | null,
  buttons: [] as MapleStanceButton[],
  bgImg: null as any,
  initialized: false,
  x: 50,
  y: 100,
  W: 175,
  H: 260,

  async show(canvas: GameCanvas, data: CharInfoData) {
    this.data = data;
    this.isHidden = false;
    if (!this.initialized) await this.init(canvas);
    this.buttons.forEach((b) => (b.isHidden = false));
  },

  async init(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('Stat')?.nGetImage?.() ?? null;

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

    const fameBtn = new MapleStanceButton(canvas, {
      x: this.x + 8, y: this.y + this.H - 28,
      img: uiWin?.nGet('BtOK')?.nChildren,
      isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
      onClick: () => {
        if (!SessionManager.isConnected() || !this.data?.charId) return;
        new FamePacket(this.data.charId, 1).dispatch();
        UIStatusMessenger.show(`Famed ${this.data.name}!`, '#FFD700');
      },
    });
    ClickManager.addButton(fameBtn);
    this.buttons.push(fameBtn);

    const defameBtn = new MapleStanceButton(canvas, {
      x: this.x + 80, y: this.y + this.H - 28,
      img: uiWin?.nGet('BtNo')?.nChildren,
      isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
      onClick: () => {
        if (!SessionManager.isConnected() || !this.data?.charId) return;
        new FamePacket(this.data.charId, 0).dispatch();
        UIStatusMessenger.show(`Defamed ${this.data.name}.`, '#888888');
      },
    });
    ClickManager.addButton(defameBtn);
    this.buttons.push(defameBtn);

    this.initialized = true;
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden || !this.data) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H, color: '#141428', alpha: 0.95, strokeColor: '#556688', strokeWidth: 1 });
    }

    const d = this.data;
    const rows: [string, string][] = [
      ['Name', d.name],
      ['Level', `${d.level}`],
      ['Job', d.job],
      ['Guild', d.guild ?? '-'],
      ['Fame', `${d.fame}`],
      ['', ''],
      ['STR', `${d.str}`],
      ['DEX', `${d.dex}`],
      ['INT', `${d.int}`],
      ['LUK', `${d.luk}`],
      ['', ''],
      ['HP', `${d.hp} / ${d.maxHp}`],
      ['MP', `${d.mp} / ${d.maxMp}`],
    ];

    rows.forEach(([label, value], i) => {
      if (!label) return;
      const ry = this.y + 22 + i * 17;
      canvas.drawText({ text: label, color: '#AAAACC', x: this.x + 8, y: ry, fontSize: 10 });
      canvas.drawText({ text: value, color: '#FFFFFF', x: this.x + 80, y: ry, fontSize: 10 });
    });

    canvas.drawText({ text: 'Character Info', color: '#FFDD88', x: this.x + 8, y: this.y + 12, fontSize: 11 });
    if (this.data.charId) {
      canvas.drawText({ text: 'Fame', color: '#FFD700', x: this.x + 22, y: this.y + this.H - 14, fontSize: 9 });
      canvas.drawText({ text: 'Defame', color: '#888888', x: this.x + 90, y: this.y + this.H - 14, fontSize: 9 });
    }
    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UICharInfo;
