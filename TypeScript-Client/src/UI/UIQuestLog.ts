import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { Position } from '../Effects/DamageIndicator';
import QuestActionPacket, { QuestAction } from '../Net/Packets/QuestActionPacket';
import SessionManager from '../SessionManager';

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
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    const questNode = uiWin?.nGet('Quest');
    this.bgImg = questNode?.nGet('backgrnd')?.nGetImage?.() ?? null;
    this.bgImg2 = questNode?.nGet('backgrnd2')?.nGetImage?.() ?? null;

    // Load quest names from Quest.wz/QuestInfo.img
    try {
      const qi = await NXManager.get('Quest.wz/QuestInfo.img');
      qi?.nChildren?.forEach((q: any) => {
        const id = parseInt(q.nName);
        if (isNaN(id)) return;
        const name = q.nGet?.('name')?.nValue ?? q.name?.nValue ?? `Quest ${id}`;
        // Quest.wz/QuestInfo.img stores description in '0' (talk text) or 'desc' or nested sub-node
        const desc =
          q.nGet?.('0')?.nValue ??
          q.nGet?.('desc')?.nValue ??
          q.nGet?.('1')?.nValue ??
          q.nGet?.('summary')?.nValue ??
          '';
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

    // Giveup / Forfeit button
    const btGiveup = uiWin?.nGet('BtGiveup');
    if (btGiveup) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 170, y: this.y + this.H - 25,
        img: btGiveup.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (this.selectedIndex < 0) return;
          const list = activeQuests.filter((q) => q.state === 'started');
          const q = list[this.scroll + this.selectedIndex];
          if (!q) return;
          if (SessionManager.isConnected()) {
            new QuestActionPacket(QuestAction.FORFEIT, q.id).dispatch();
          }
          const idx = activeQuests.indexOf(q);
          if (idx >= 0) activeQuests.splice(idx, 1);
          this.selectedIndex = -1;
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Complete quest button (for completed-state quests ready to turn in)
    const btOK = uiWin?.nGet('BtOK');
    if (btOK) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 10, y: this.y + this.H - 25,
        img: btOK.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => {
          if (this.selectedIndex < 0) return;
          const list = this.tab === 'completed'
            ? activeQuests.filter((q) => q.state === 'completed')
            : activeQuests.filter((q) => q.state === 'started');
          const q = list[this.scroll + this.selectedIndex];
          if (!q) return;
          if (SessionManager.isConnected()) {
            const action = q.state === 'completed' ? QuestAction.COMPLETE : QuestAction.START;
            new QuestActionPacket(action, q.id).dispatch();
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
      canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H, color: '#14142a', alpha: 0.95, strokeColor: '#557799', strokeWidth: 1 });
    }

    canvas.drawText({ text: 'Quest Log', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });

    // Tabs
    (['active', 'completed'] as const).forEach((t, i) => {
      const tx = this.x + 8 + i * 115;
      canvas.drawRect({ x: tx, y: this.y + 22, width: 108, height: 16, color: this.tab === t ? '#5064a0' : '#282846', alpha: this.tab === t ? 0.9 : 0.8 });
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

      if (isSelected) canvas.drawRect({ x: this.x + 6, y: qy - 2, width: this.W - 12, height: 20, color: '#6482c8', alpha: 0.8 });

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
      canvas.drawRect({ x: this.x + 6, y: detailY, width: this.W - 12, height: this.H - topH - 60, color: '#0f0f23', alpha: 0.85, strokeColor: '#446688', strokeWidth: 1 });

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
