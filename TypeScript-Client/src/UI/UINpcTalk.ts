import WZManager from '../wz-utils/WZManager';
import WZNode from '../wz-utils/WZNode';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import NpcTalkType from '../Constants/NpcTalkType';
import { Position } from '../Effects/DamageIndicator';
import MapleButton from './MapleButton';
import SessionManager from '../SessionManager';
import { NpcTalkMorePacket } from '../Net/Packets/NpcInteractPacket';
import MyCharacter from '../MyCharacter';

// Selection choices for type=Selection
interface NpcChoice { text: string; index: number; }

export default class UINpcTalk {
  opts: any;
  x: number = 0;
  y: number = 0;
  z: number = 0;
  originalX: number = 0;
  originalY: number = 0;
  width: number = 0;
  height: number = 0;
  isHidden: boolean = true;
  type: NpcTalkType = NpcTalkType.TextOnly;

  name: string = '';
  text: string = '';
  choices: NpcChoice[] = [];
  hasPrev: boolean = false;
  hasNext: boolean = true;

  top: WZNode | null = null;
  fill: WZNode | null = null;
  fillCount: number = 6;
  bottom: WZNode | null = null;
  nameTag: WZNode | null = null;
  speaker: WZNode | undefined;
  buttons: MapleButton[] = [];

  utilDlgExNode: any = null;

  static async fromOpts(opts: any) {
    const o = new UINpcTalk(opts);
    await o.load();
    return o;
  }

  constructor(opts: any) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.z = opts.z || 0;
    this.isHidden = opts.isHidden ?? true;
    this.name = opts.name || '';
    this.text = opts.text || '';
    this.opts = opts;
  }

  async load() {
    this.x = this.opts.x;
    this.y = this.opts.y;
    this.z = this.opts.z;
    this.originalX = this.opts.x;
    this.originalY = this.opts.y;

    this.utilDlgExNode = await WZManager.get('UI.wz/UIWindow.img/UtilDlgEx');
    this.top    = this.utilDlgExNode.t;
    this.fill   = this.utilDlgExNode.c;
    this.bottom = this.utilDlgExNode.s;
    this.nameTag = this.utilDlgExNode.bar;
    this.width = this.top?.nGetImage().width;
    this.height = this.top?.nGetImage().height + this.fillCount * this.fill?.nGetImage().height + this.bottom?.nGetImage().height;

    this.loadButtons();
    ClickManager.addDragableMenu(this);
  }

  loadButtons() {
    this.buttons.forEach((b) => ClickManager.removeButton(b));
    this.buttons = [];

    const bY = this.y + this.height + 8;

    // Close / ESC
    if (this.utilDlgExNode?.BtClose) {
      const closeBtn = new MapleStanceButton(null, {
        x: this.x + 9, y: bY,
        img: this.utilDlgExNode.BtClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => { this.close(0); },
      });
      this.buttons.push(closeBtn);
    }

    if (this.type === NpcTalkType.YesNo || this.type === NpcTalkType.AcceptDecline) {
      // Yes/Ok
      if (this.utilDlgExNode?.BtYes) {
        const yes = new MapleStanceButton(null, {
          x: this.x + 60, y: bY,
          img: this.utilDlgExNode.BtYes.nChildren,
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(1); },
        });
        this.buttons.push(yes);
      }
      // No/Decline
      if (this.utilDlgExNode?.BtNo) {
        const no = new MapleStanceButton(null, {
          x: this.x + 110, y: bY,
          img: this.utilDlgExNode.BtNo.nChildren,
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(0); },
        });
        this.buttons.push(no);
      }
    } else if (this.type === NpcTalkType.TextOnly) {
      // Next / Prev
      if (this.hasNext && this.utilDlgExNode?.BtNext) {
        const next = new MapleStanceButton(null, {
          x: this.x + this.width - 60, y: bY,
          img: this.utilDlgExNode.BtNext.nChildren,
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(0); }, // 0 = next in v83
        });
        this.buttons.push(next);
      }
      if (this.hasPrev && this.utilDlgExNode?.BtPrev) {
        const prev = new MapleStanceButton(null, {
          x: this.x + this.width - 110, y: bY,
          img: this.utilDlgExNode.BtPrev.nChildren,
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(1); }, // 1 = back
        });
        this.buttons.push(prev);
      }
    }

    this.buttons.forEach((b) => ClickManager.addButton(b));
  }

  respond(selection: number) {
    if (SessionManager.isConnected()) {
      new NpcTalkMorePacket(this.type as number, selection).dispatch();
    }
    if (selection === 0 && this.type !== NpcTalkType.TextOnly) {
      this.close(0);
    }
  }

  close(selection: number) {
    if (SessionManager.isConnected()) {
      new NpcTalkMorePacket(255, -1).dispatch(); // close signal
    }
    this.setIsHidden(true);
    // Release movement lock
    if (MyCharacter) (MyCharacter as any)._npcLocked = false;
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    if (this.isHidden) return;

    const leftPadding = 20;

    canvas.drawImage({ img: this.top?.nGetImage(), dx: this.x, dy: this.y });
    for (let i = 0; i < this.fillCount; i++) {
      canvas.drawImage({
        img: this.fill?.nGetImage(),
        dx: this.x,
        dy: this.y + this.top?.nGetImage().height + i * this.fill?.nGetImage().height,
      });
    }
    canvas.drawImage({
      img: this.bottom?.nGetImage(),
      dx: this.x,
      dy: this.y + this.top?.nGetImage().height + this.fillCount * this.fill?.nGetImage().height,
    });

    if (this.speaker?.stand?.[0]) {
      const speakerImg = this.speaker.stand[0].nGetImage();
      const midH = Math.floor((this.top?.nGetImage().height + this.fillCount * this.fill?.nGetImage().height) / 2);
      const finalH = speakerImg.height > midH ? speakerImg.height : midH;
      canvas.drawImage({
        img: speakerImg,
        dx: this.x + leftPadding + Math.floor(this.nameTag?.nGetImage().width / 2) - Math.floor(speakerImg.width / 2),
        dy: this.y + this.top?.nGetImage().height,
      });
      canvas.drawImage({
        img: this.nameTag?.nGetImage(),
        dx: this.x + leftPadding,
        dy: this.y + this.top?.nGetImage().height + finalH,
      });
      canvas.drawText({ text: this.name, color: '#FFFFFF', x: this.x + leftPadding + Math.floor(this.nameTag?.nGetImage().width / 2), y: this.y + this.top?.nGetImage().height + 5 + finalH, align: 'center' });
    }

    // Wrap text
    canvas.context.save();
    canvas.context.font = '12px Arial';
    canvas.context.fillStyle = '#000000';
    const maxW = this.width - 170;
    const words = this.text.split(' ');
    let line = ''; let ty = this.y + 48;
    words.forEach((w) => {
      const test = line + w + ' ';
      if (canvas.context.measureText(test).width > maxW && line) {
        canvas.context.fillText(line, this.x + 166, ty);
        line = w + ' '; ty += 16;
      } else line = test;
    });
    canvas.context.fillText(line, this.x + 166, ty);
    canvas.context.restore();

    // Selection choices
    if (this.type === NpcTalkType.Selection && this.choices.length) {
      this.choices.forEach((c, i) => {
        canvas.drawText({ text: `▸ ${c.text}`, color: '#0000CC', x: this.x + 166, y: this.y + 48 + (i + 1) * 18 });
      });
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, msPerTick, tdelta));
  }

  moveTo(position: Position) {
    this.x = position.x;
    this.y = position.y;
    this.buttons.forEach((b) => {
      b.x += -this.originalX + position.x;
      b.y += -this.originalY + position.y;
    });
    this.originalX = position.x;
    this.originalY = position.y;
  }

  getRect(_camera: CameraInterface) {
    return { x: this.x, y: this.y, width: this.width, height: this.height + 40 };
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach((b) => (b.isHidden = isHidden));
    if (!isHidden && MyCharacter) (MyCharacter as any)._npcLocked = true;
  }

  async changeText(npcId: number, type: NpcTalkType, speaker: string, text: string, hasPrev = false, hasNext = true, choices: NpcChoice[] = []) {
    this.type = type;
    this.name = speaker;
    this.text = text;
    this.hasPrev = hasPrev;
    this.hasNext = hasNext;
    this.choices = choices;
    this.fillCount = 6;

    try {
      const strId = `${npcId}`.padStart(7, '0');
      this.speaker = await WZManager.get(`Npc.wz/${strId}.img`);
    } catch (_) {}

    while (
      (this.speaker?.stand?.[0].nGetImage().height ?? 0) + (this.nameTag?.nGetImage().height ?? 0) + 5 >
      this.fillCount * (this.fill?.nGetImage().height ?? 1)
    ) {
      this.fillCount++;
    }

    this.height = (this.top?.nGetImage().height ?? 0) + this.fillCount * (this.fill?.nGetImage().height ?? 1) + (this.bottom?.nGetImage().height ?? 0);
    this.loadButtons();
  }
}
