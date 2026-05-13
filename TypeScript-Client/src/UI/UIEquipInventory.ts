import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import MyCharacter from '../MyCharacter';
import { Position } from '../Effects/DamageIndicator';

// Equip slot positions relative to window origin (on the 175x304 background)
const SLOT_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  hat:      { x: 73, y: 28,  label: 'Hat'     },
  face:     { x: 40, y: 60,  label: 'Face'    },
  eye:      { x: 107,y: 60,  label: 'Eye'     },
  top:      { x: 73, y: 95,  label: 'Top'     },
  bottom:   { x: 73, y: 130, label: 'Bottom'  },
  shoes:    { x: 73, y: 165, label: 'Shoes'   },
  gloves:   { x: 107,y: 130, label: 'Gloves'  },
  cape:     { x: 40, y: 95,  label: 'Cape'    },
  weapon:   { x: 107,y: 95,  label: 'Weapon'  },
  shield:   { x: 40, y: 130, label: 'Shield'  },
  earring:  { x: 40, y: 28,  label: 'Earring' },
  ring1:    { x: 40, y: 195, label: 'Ring'    },
  ring2:    { x: 73, y: 195, label: 'Ring'    },
  pendant:  { x: 107,y: 165, label: 'Pendant' },
  belt:     { x: 73, y: 228, label: 'Belt'    },
  medal:    { x: 40, y: 228, label: 'Medal'   },
};

// Map slot slot index (equip slot constant) → slot name
const SLOT_INDEX_MAP: Record<number, string> = {
  1: 'hat', 2: 'face', 3: 'eye', 4: 'top', 5: 'bottom',
  6: 'shoes', 7: 'gloves', 8: 'cape', 10: 'weapon', 11: 'shield',
  12: 'earring', 13: 'ring1', 14: 'ring2', 17: 'pendant', 49: 'belt', 50: 'medal',
};

class UIEquipInventory extends DragableMenu {
  bgImg: any = null;
  slotBgImg: any = null;
  buttons: MapleStanceButton[] = [];
  loaded = false;
  readonly W = 175;
  readonly H = 304;

  static async fromOpts(opts: any) {
    const o = new UIEquipInventory(opts);
    await o.load(opts.canvas);
    return o;
  }

  async load(canvas: GameCanvas) {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('Equip')?.nGet('backgrnd')?.nGetImage?.() ?? null;

    // Reuse Item section's slot background
    try {
      this.slotBgImg = uiWin?.nGet('Item')?.nGet('New')?.nGet('inventory')?.nGetImage?.() ?? null;
    } catch (_) {}

    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const closeBtn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15,
        y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true,
        isPartOfUI: true,
        onClick: () => this.setIsHidden(true),
      });
      ClickManager.addButton(closeBtn);
      this.buttons.push(closeBtn);
    }

    this.loaded = true;
  }

  setIsHidden(v: boolean) {
    this.isHidden = v;
    this.buttons.forEach((b) => (b.isHidden = v));
  }

  moveTo(pos: Position) {
    const dx = pos.x - this.x;
    const dy = pos.y - this.y;
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
      canvas.context.fillStyle = 'rgba(30,30,50,0.92)';
      canvas.context.fillRect(this.x, this.y, this.W, this.H);
      canvas.context.strokeStyle = '#556688';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H);
      canvas.context.restore();
    }

    canvas.drawText({ text: 'Equipment', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });

    // Build slot → equipped item map from MyCharacter.equips
    const slotItems: Record<string, number> = {};
    if (Array.isArray(MyCharacter.equips)) {
      MyCharacter.equips.forEach((equip: any) => {
        const slotName = SLOT_INDEX_MAP[equip.slot];
        if (slotName) slotItems[slotName] = equip.itemId ?? equip;
      });
    }

    // Draw each slot
    for (const [slotName, pos] of Object.entries(SLOT_POSITIONS)) {
      const sx = this.x + pos.x;
      const sy = this.y + pos.y;
      const itemId = slotItems[slotName];

      canvas.context.save();
      canvas.context.strokeStyle = '#556699';
      canvas.context.fillStyle = itemId ? 'rgba(60,80,100,0.8)' : 'rgba(30,30,50,0.6)';
      canvas.context.fillRect(sx, sy, 28, 28);
      canvas.context.strokeRect(sx, sy, 28, 28);
      canvas.context.restore();

      if (itemId) {
        canvas.drawText({
          text: `${itemId}`.substring(0, 7),
          color: '#FFFFFF',
          x: sx + 2,
          y: sy + 10,
          fontSize: 7,
        });
      } else {
        canvas.drawText({ text: pos.label.substring(0, 6), color: '#666688', x: sx + 2, y: sy + 10, fontSize: 7 });
      }
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }
}

export default UIEquipInventory;
