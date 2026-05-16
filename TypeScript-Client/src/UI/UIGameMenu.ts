import NXManager from '../wz-utils/NXManager';
import UIOptionMenu from './UIOptionMenu';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import config from '../Config';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import SessionManager from '../SessionManager';

const UIGameMenu = {
  isHidden: true,
  bgImg: null as any,
  buttons: [] as MapleStanceButton[],
  initialized: false,
  x: 0,
  y: 0,
  W: 93,
  H: 140,
  onQuit: null as (() => void) | null,
  onChannel: null as (() => void) | null,
  onCashShop: null as ((canvas: GameCanvas) => void) | null,

  async initialize(canvas: GameCanvas, opts: { onQuit?: () => void; onChannel?: () => void; onCashShop?: (c: GameCanvas) => void } = {}) {
    this.onQuit = opts.onQuit ?? null;
    this.onChannel = opts.onChannel ?? null;
    this.onCashShop = opts.onCashShop ?? null;

    // Position near bottom-right above status bar
    this.x = config.originalWidth - 100;
    this.y = config.originalHeight - 150 + (config.height - config.originalHeight);

    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    const menuNode = uiWin?.nGet('GameMenu');
    this.bgImg = menuNode?.nGet('backgrnd')?.nGetImage?.() ?? null;

    // Channel button
    const btChannel = menuNode?.nGet('BtChannel');
    if (btChannel) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 10,
        img: btChannel.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); this.onChannel?.(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Game Options
    const btGameOpt = menuNode?.nGet('BtGameOpt');
    if (btGameOpt) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 40,
        img: btGameOpt.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); UIOptionMenu.show(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Sys Options
    const btSysOpt = menuNode?.nGet('BtSysOpt');
    if (btSysOpt) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 70,
        img: btSysOpt.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Cash Shop — use BtCashShop WZ button if available; else handled by onMouseDown fallback
    const btCashShopNode = menuNode?.nGet('BtCashShop');
    if (btCashShopNode?.nChildren) {
      const cashShopBtn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 78,
        img: btCashShopNode.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => this._openCashShop(canvas),
      });
      ClickManager.addButton(cashShopBtn);
      this.buttons.push(cashShopBtn);
    }

    // Quit
    const btQuit = menuNode?.nGet('BtQuit');
    if (btQuit) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 6, y: this.y + 110,
        img: btQuit.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        isHidden: true,
        onClick: () => { this.hide(); this.onQuit?.(); },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  _openCashShop(canvas: GameCanvas) {
    this.hide();
    if (SessionManager.isConnected()) {
      new OutPacket(OutPacketOpcode.ENTER_CASHSHOP).dispatch();
    }
    this.onCashShop?.(canvas);
  },

  // Fallback: handle clicks on text labels when WZ buttons missing
  onMouseDown(mx: number, my: number, canvas: GameCanvas): boolean {
    if (this.isHidden) return false;
    // Cash Shop row (y + 78 to y + 108 approx)
    if (mx >= this.x && mx < this.x + this.W && my >= this.y + 78 && my < this.y + 108) {
      this._openCashShop(canvas);
      return true;
    }
    return false;
  },

  toggle() {
    if (this.isHidden) this.show();
    else this.hide();
  },

  show() {
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
  },

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, ms: number, td: number) {
    if (this.isHidden || !this.initialized) return;

    if (this.bgImg) {
      canvas.drawImage({ img: this.bgImg, dx: this.x, dy: this.y });
    } else {
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
      canvas.context.fillRect(this.x, this.y, 93, 140);
      canvas.context.strokeStyle = '#557799';
      canvas.context.strokeRect(this.x, this.y, 93, 140);
      canvas.context.restore();

      const labels = ['Channel', 'Game Opt', 'Sys Opt', 'Cash Shop', 'Quit'];
      const colors = ['#AADDFF', '#AADDFF', '#AADDFF', '#FFDD44', '#FF8888'];
      labels.forEach((label, i) => {
        canvas.drawText({ text: label, color: colors[i], x: this.x + 12, y: this.y + 22 + i * 30, fontSize: 11 });
      });
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  },
};

export default UIGameMenu;
