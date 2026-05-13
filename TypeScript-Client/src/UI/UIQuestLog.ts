import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { Position } from '../Effects/DamageIndicator';

export interface QuestEntry {
  id: number;
  name: string;
  state: 'started' | 'completed' | 'available';
  description?: string;
}

// Global quest tracking
export const activeQuests: QuestEntry[] = [];

class UIQuestLog extends DragableMenu {
  bgImg: any = null;
  bgImg2: any = null;
  buttons: MapleStanceButton[] = [];
  tab: 'active' | 'completed' = 'active';
  selectedIndex = -1;
  scroll = 0;
  loaded = false;
  questInfoCache: Map<number, { name: string; desc: string }> = new Map();
  readonly W = 245;
  readonly H = 396;

  static async fromOpts(opts: any) {
    const o = new UIQuestLog(opts);
    await o.load(opts.canvas);
    return o;
  }

  async load(canvas: GameCanvas) {
    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    const questNode = uiWin?.nGet('Quest');
    this.bgImg = questNode?.nGet('backgrnd')?.nGetImage?.() ?? null;
    this.bgImg2 = questNode?.nGet('backgrnd2')?.nGetImage?.() ?? null;

    // Load quest names from Quest.wz/QuestInfo.img
    try {
      const qi = await WZManager.get('Quest.wz/QuestInfo.img');
      qi?.nChildren?.forEach((q: any) => {
        const id = parseInt(q.nName);
        if (isNaN(id)) return;
        const name = q.nGet?.('name')?.nValue ?? q.name?.nValue ?? `Quest ${id}`;
        const desc = q.nGet?.('0')?.nValue ?? '';
        this.questInfoCache.set(id, { name, desc });
      });
    } catch (_) {}

    // Close button
    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const closeBtn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => this.setIsHidden(true),
      });
      ClickManager.addButton(closeBtn);
      this.buttons.push(closeBtn);
    }

    // Giveup button
    const btGiveup = uiWin?.nGet('BtGiveup');
    if (btGiveup) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 170, y: this.y + this.H - 25,
        img: btGiveup.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (this.selectedIndex < 0) return;
          const list = this.tab === 'active'
            ? activeQuests.filter((q) => q.state === 'started')
            : activeQuests.filter((q) => q.state === 'completed');
          const q = list[this.scroll + this.selectedIndex];
          if (q) {
            const idx = activeQuests.indexOf(q);
            if (idx >= 0) activeQuests.splice(idx, 1);
            this.selectedIndex = -1;
          }
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
      canvas.context.strokeStyle = '#557799';
      canvas.context.strokeRect(this.x, this.y, this.W, this.H);
      canvas.context.restore();
    }

    canvas.drawText({ text: 'Quest Log', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });

    // Tabs
    (['active', 'completed'] as const).forEach((t, i) => {
      const tx = this.x + 8 + i * 115;
      canvas.context.save();
      canvas.context.fillStyle = this.tab === t ? 'rgba(80,100,160,0.9)' : 'rgba(40,40,70,0.8)';
      canvas.context.fillRect(tx, this.y + 22, 108, 16);
      canvas.context.restore();
      canvas.drawText({ text: t === 'active' ? 'In Progress' : 'Completed', color: '#FFFFFF', x: tx + 18, y: this.y + 32, fontSize: 10 });
    });

    const list = this.tab === 'active'
      ? activeQuests.filter((q) => q.state === 'started')
      : activeQuests.filter((q) => q.state === 'completed');

    const topH = Math.floor(this.H * 0.55);
    const visibleCount = Math.floor(topH / 22);
    const visible = list.slice(this.scroll, this.scroll + visibleCount);

    visible.forEach((q, i) => {
      const qy = this.y + 42 + i * 22;
      const isSelected = i === this.selectedIndex;
      const info = this.questInfoCache.get(q.id);
      const name = info?.name ?? q.name ?? `Quest ${q.id}`;

      canvas.context.save();
      canvas.context.fillStyle = isSelected ? 'rgba(100,130,200,0.8)' : 'transparent';
      if (isSelected) canvas.context.fillRect(this.x + 6, qy - 2, this.W - 12, 20);
      canvas.context.restore();

      const dot = q.state === 'completed' ? '✓' : '●';
      const dotColor = q.state === 'completed' ? '#88FF88' : '#FFAA44';
      canvas.drawText({ text: dot, color: dotColor, x: this.x + 8, y: qy + 10, fontSize: 10 });
      canvas.drawText({ text: name.substring(0, 28), color: '#FFFFFF', x: this.x + 22, y: qy + 10, fontSize: 10 });
    });

    // Detail panel for selected quest
    if (this.selectedIndex >= 0 && this.selectedIndex < visible.length) {
      const q = visible[this.selectedIndex];
      const info = this.questInfoCache.get(q.id);
      const detailY = this.y + 42 + topH + 8;
      canvas.context.save();
      canvas.context.fillStyle = 'rgba(15,15,35,0.85)';
      canvas.context.fillRect(this.x + 6, detailY, this.W - 12, this.H - topH - 60);
      canvas.context.strokeStyle = '#446688';
      canvas.context.strokeRect(this.x + 6, detailY, this.W - 12, this.H - topH - 60);
      canvas.context.restore();

      if (info) {
        canvas.drawText({ text: info.name, color: '#FFEE88', x: this.x + 10, y: detailY + 14, fontSize: 11 });
        // Wrap description
        const words = info.desc.split(' ');
        let line = ''; let lineY = detailY + 30;
        words.forEach((w) => {
          if ((line + w).length > 30) {
            canvas.drawText({ text: line, color: '#CCCCCC', x: this.x + 10, y: lineY, fontSize: 9 });
            line = w + ' '; lineY += 13;
          } else line += w + ' ';
        });
        if (line) canvas.drawText({ text: line, color: '#CCCCCC', x: this.x + 10, y: lineY, fontSize: 9 });
      }
    }

    if (list.length === 0) {
      canvas.drawText({ text: 'No quests', color: '#888888', x: this.x + this.W / 2 - 30, y: this.y + 100, fontSize: 11 });
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));
  }

  onMouseDown(mouseX: number, mouseY: number): boolean {
    if (this.isHidden) return false;
    if (mouseY >= this.y + 22 && mouseY < this.y + 38) {
      if (mouseX >= this.x + 8 && mouseX < this.x + 116) { this.tab = 'active'; this.scroll = 0; this.selectedIndex = -1; return true; }
      if (mouseX >= this.x + 123 && mouseX < this.x + 231) { this.tab = 'completed'; this.scroll = 0; this.selectedIndex = -1; return true; }
    }
    const topH = Math.floor(this.H * 0.55);
    if (mouseY >= this.y + 42 && mouseY < this.y + 42 + topH) {
      this.selectedIndex = Math.floor((mouseY - (this.y + 42)) / 22);
      return true;
    }
    return false;
  }
}

export default UIQuestLog;
