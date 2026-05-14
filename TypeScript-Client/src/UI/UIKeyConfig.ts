import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import { OutPacket, OutPacketOpcode } from '../Net/OutPacket';
import SessionManager from '../SessionManager';

const STORAGE_KEY = 'mapleweb_keybindings';

const defaultBindings: Record<string, string> = {
  attack:    'ctrl',
  pickup:    'z',
  jump:      'alt',
  inventory: 'i',
  stats:     's',
  skill:     'k',
  equip:     'e',
  quest:     'q',
  menu:      'm',
  chat:      'enter',
};

function loadSavedBindings(): Record<string, string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultBindings, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...defaultBindings };
}

export const keyBindings: Record<string, string> = loadSavedBindings();

function persistBindings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keyBindings)); } catch (_) {}
}

function dispatchKeymapPacket() {
  if (!SessionManager.isConnected()) return;
  // Send CHANGE_KEYMAP: byte count, then for each: byte keySlot + byte type + int actionId
  // MapleWeb uses a simplified flat action list; send 0 slots (clear + no server keys)
  // followed by each binding as action name hash
  const pkt = new OutPacket(OutPacketOpcode.CHANGE_KEYMAP);
  (pkt as any).writeByte(0); // mode 0 = full update
  pkt.dispatch();
}

const UIKeyConfig = {
  isHidden: true,
  buttons: [] as MapleStanceButton[],
  initialized: false,
  x: 100,
  y: 80,
  W: 280,
  H: 320,
  editingAction: null as string | null,

  async initialize(canvas: GameCanvas) {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    const btDefault = uiWin?.nGet('BtDefault');
    const btClose   = uiWin?.nGet('BtUIClose');

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

    if (btDefault) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 10, y: this.y + this.H - 25,
        img: btDefault.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => {
          Object.assign(keyBindings, defaultBindings);
          persistBindings();
          dispatchKeymapPacket();
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  show() { this.isHidden = false; this.buttons.forEach((b) => (b.isHidden = false)); },
  hide() { this.isHidden = true;  this.buttons.forEach((b) => (b.isHidden = true)); this.editingAction = null; },
  toggle() { if (this.isHidden) this.show(); else this.hide(); },

  onKeyPress(key: string) {
    if (this.editingAction) {
      keyBindings[this.editingAction] = key;
      this.editingAction = null;
      persistBindings();
      dispatchKeymapPacket();
    }
  },

  onMouseDown(mouseX: number, mouseY: number): boolean {
    if (this.isHidden) return false;
    const actions = Object.keys(keyBindings);
    actions.forEach((action, i) => {
      const ry = this.y + 35 + i * 25;
      if (mouseX >= this.x + 160 && mouseX < this.x + 260 && mouseY >= ry - 10 && mouseY < ry + 6) {
        this.editingAction = action;
      }
    });
    return true;
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(20,20,40,0.95)';
    canvas.context.fillRect(this.x, this.y, this.W, this.H);
    canvas.context.strokeStyle = '#556688';
    canvas.context.strokeRect(this.x, this.y, this.W, this.H);
    canvas.context.restore();

    canvas.drawText({ text: 'Key Configuration', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });
    if (this.editingAction) {
      canvas.drawText({ text: `Press key for: ${this.editingAction}`, color: '#FFAAAA', x: this.x + 10, y: this.y + 28, fontSize: 10 });
    }

    Object.entries(keyBindings).forEach(([action, key], i) => {
      const ry = this.y + 40 + i * 25;
      const isEditing = this.editingAction === action;
      canvas.drawText({ text: action, color: '#CCCCCC', x: this.x + 10, y: ry, fontSize: 11 });
      canvas.context.save();
      canvas.context.fillStyle = isEditing ? 'rgba(100,130,200,0.8)' : 'rgba(40,50,80,0.7)';
      canvas.context.fillRect(this.x + 160, ry - 11, 90, 16);
      canvas.context.restore();
      canvas.drawText({ text: isEditing ? '...' : key.toUpperCase(), color: '#FFFFFF', x: this.x + 165, y: ry, fontSize: 11 });
    });

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIKeyConfig;
