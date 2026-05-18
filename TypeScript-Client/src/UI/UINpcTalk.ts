import NXManager from '../wz-utils/NXManager';
import WZNode from '../wz-utils/WZNode';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import NpcTalkType from '../Constants/NpcTalkType';
import { Position } from '../Effects/DamageIndicator';
import MapleButton from './MapleButton';
import MapleInput from './MapleInput';
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
  textInput: MapleInput | null = null;
  numberValue: number = 0;
  numberMin: number = 0;
  numberMax: number = 999999999;

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

    this.utilDlgExNode = await NXManager.get('UI.wz/UIWindow.img/UtilDlgEx');
    this.top    = this.utilDlgExNode.t;
    this.fill   = this.utilDlgExNode.c;
    this.bottom = this.utilDlgExNode.s;
    this.nameTag = this.utilDlgExNode.bar;
    this.width = (this.top?.nGetImage() as any)?.width ?? 0;
    this.height = ((this.top?.nGetImage() as any)?.height ?? 0) + this.fillCount * ((this.fill?.nGetImage() as any)?.height ?? 0) + ((this.bottom?.nGetImage() as any)?.height ?? 0);

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
        img: this.utilDlgExNode?.BtClose?.nChildren ?? [],
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => { this.close(0); },
      });
      this.buttons.push(closeBtn);
    }

    if (this.type === NpcTalkType.YesNo || this.type === NpcTalkType.AcceptDecline) {
      if (this.utilDlgExNode?.BtYes) {
        const yes = new MapleStanceButton(null, {
          x: this.x + 60, y: bY,
          img: this.utilDlgExNode?.BtYes?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(1); },
        });
        this.buttons.push(yes);
      }
      if (this.utilDlgExNode?.BtNo) {
        const no = new MapleStanceButton(null, {
          x: this.x + 110, y: bY,
          img: this.utilDlgExNode?.BtNo?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(0); },
        });
        this.buttons.push(no);
      }
    } else if (this.type === NpcTalkType.TextOnly || this.type === NpcTalkType.SendNextPrev) {
      if (this.hasNext && this.utilDlgExNode?.BtNext) {
        const next = new MapleStanceButton(null, {
          x: this.x + this.width - 60, y: bY,
          img: this.utilDlgExNode?.BtNext?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(0); },
        });
        this.buttons.push(next);
      }
      if (this.hasPrev && this.utilDlgExNode?.BtPrev) {
        const prev = new MapleStanceButton(null, {
          x: this.x + this.width - 110, y: bY,
          img: this.utilDlgExNode?.BtPrev?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(1); },
        });
        this.buttons.push(prev);
      }
    } else if (this.type === NpcTalkType.TextOkOnly) {
      if (this.utilDlgExNode?.BtOK) {
        const ok = new MapleStanceButton(null, {
          x: this.x + 60, y: bY,
          img: this.utilDlgExNode?.BtOK?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respond(1); },
        });
        this.buttons.push(ok);
      }
    } else if (this.type === NpcTalkType.GetText) {
      if (this.utilDlgExNode?.BtOK) {
        const ok = new MapleStanceButton(null, {
          x: this.x + 60, y: bY,
          img: this.utilDlgExNode?.BtOK?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => {
            const entered = this.textInput?.input.value ?? '';
            this.respondWithText(entered);
          },
        });
        this.buttons.push(ok);
      }
      if (this.utilDlgExNode?.BtNo) {
        const cancel = new MapleStanceButton(null, {
          x: this.x + 110, y: bY,
          img: this.utilDlgExNode?.BtNo?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.close(0); },
        });
        this.buttons.push(cancel);
      }
    } else if (this.type === NpcTalkType.GetNumber) {
      if (this.utilDlgExNode?.BtOK) {
        const ok = new MapleStanceButton(null, {
          x: this.x + 60, y: bY,
          img: this.utilDlgExNode?.BtOK?.nChildren ?? [],
          isRelativeToCamera: true, isPartOfUI: true,
          onClick: () => { this.respondWithNumber(this.numberValue); },
        });
        this.buttons.push(ok);
      }
      // +/- buttons for number adjustment
      const incBtn = new MapleStanceButton(null, {
        x: this.x + this.width - 60, y: bY,
        img: this.utilDlgExNode?.BtNext?.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => { this.numberValue = Math.min(this.numberMax, this.numberValue + 1); },
      });
      const decBtn = new MapleStanceButton(null, {
        x: this.x + this.width - 90, y: bY,
        img: this.utilDlgExNode?.BtPrev?.nChildren,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick: () => { this.numberValue = Math.max(this.numberMin, this.numberValue - 1); },
      });
      this.buttons.push(incBtn, decBtn);
    }

    this.buttons.forEach((b) => ClickManager.addButton(b));
  }

  respond(selection: number) {
    if (SessionManager.isConnected()) {
      new NpcTalkMorePacket(this.type as number, selection).dispatch();
    }
    if (selection === 0 && this.type !== NpcTalkType.TextOnly && this.type !== NpcTalkType.SendNextPrev) {
      this.close(0);
    }
  }

  respondWithText(text: string) {
    if (SessionManager.isConnected()) {
      import('../Net/OutPacket').then(({ OutPacket, OutPacketOpcode }) => {
        const pkt = new OutPacket(OutPacketOpcode.NPC_TALK_MORE);
        (pkt as any).writeByte(this.type as number);
        (pkt as any).writeByte(1); // confirmed
        (pkt as any).writeString(text);
        pkt.dispatch();
      });
    }
    this.close(0);
  }

  respondWithNumber(value: number) {
    if (SessionManager.isConnected()) {
      import('../Net/OutPacket').then(({ OutPacket, OutPacketOpcode }) => {
        const pkt = new OutPacket(OutPacketOpcode.NPC_TALK_MORE);
        (pkt as any).writeByte(this.type as number);
        (pkt as any).writeByte(1); // confirmed
        (pkt as any).writeInt(value);
        pkt.dispatch();
      });
    }
    this.close(0);
  }

  close(selection: number) {
    if (SessionManager.isConnected()) {
      new NpcTalkMorePacket(255, -1).dispatch(); // close signal
    }
    this.textInput?.remove?.();
    this.textInput = null;
    this.setIsHidden(true);
    if (MyCharacter) (MyCharacter as any)._npcLocked = false;
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    if (this.isHidden) return;

    const leftPadding = 20;
    const topImg:    any = this.top?.nGetImage();
    const fillImg:   any = this.fill?.nGetImage();
    const botImg:    any = this.bottom?.nGetImage();
    const tagImg:    any = this.nameTag?.nGetImage();
    const topH  = topImg?.height  ?? 0;
    const fillH = fillImg?.height ?? 0;
    const botH  = botImg?.height  ?? 0;

    canvas.drawImage({ img: topImg, dx: this.x, dy: this.y });
    for (let i = 0; i < this.fillCount; i++) {
      canvas.drawImage({ img: fillImg, dx: this.x, dy: this.y + topH + i * fillH });
    }
    canvas.drawImage({ img: botImg, dx: this.x, dy: this.y + topH + this.fillCount * fillH });

    const spk: any = (this.speaker as any)?.stand?.[0];
    if (spk) {
      const speakerImg: any = spk.nGetImage();
      const midH  = Math.floor((topH + this.fillCount * fillH) / 2);
      const finalH = speakerImg?.height > midH ? speakerImg.height : midH;
      canvas.drawImage({
        img: speakerImg,
        dx: this.x + leftPadding + Math.floor((tagImg?.width ?? 0) / 2) - Math.floor((speakerImg?.width ?? 0) / 2),
        dy: this.y + topH,
      });
      canvas.drawImage({ img: tagImg, dx: this.x + leftPadding, dy: this.y + topH + finalH });
      canvas.drawText({ text: this.name, color: '#FFFFFF', x: this.x + leftPadding + Math.floor((tagImg?.width ?? 0) / 2), y: this.y + topH + 5 + finalH, align: 'center' });
    }

    // Wrap text
    const maxW = this.width - 170;
    const words = this.text.split(' ');
    let line = ''; let ty = this.y + 48;
    words.forEach((w) => {
      const test = line + w + ' ';
      if (canvas.measureText({ text: test, fontSize: 12 }).width > maxW && line) {
        canvas.drawText({ text: line, x: this.x + 166, y: ty, color: '#000000', fontSize: 12 });
        line = w + ' '; ty += 16;
      } else line = test;
    });
    canvas.drawText({ text: line, x: this.x + 166, y: ty, color: '#000000', fontSize: 12 });

    // Selection choices
    if (this.type === NpcTalkType.Selection && this.choices.length) {
      this.choices.forEach((c, i) => {
        canvas.drawText({ text: `▸ ${c.text}`, color: '#0000CC', x: this.x + 166, y: this.y + 48 + (i + 1) * 18 });
      });
    }

    // GetNumber — show current value
    if (this.type === NpcTalkType.GetNumber) {
      const numY = this.y + this.height - 30;
      canvas.drawRect({ x: this.x + 130, y: numY, width: 80, height: 18, color: '#ffffff', alpha: 0.9, strokeColor: '#334466', strokeWidth: 1 });
      canvas.drawText({ text: `${this.numberValue}`, color: '#000000', x: this.x + 165, y: numY + 13, fontSize: 11, align: 'center' } as any);
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
      this.speaker = await NXManager.get(`Npc.wz/${strId}.img`);
    } catch (_) {}

    const spkH  = ((this.speaker as any)?.stand?.[0]?.nGetImage() as any)?.height ?? 0;
    const tagH  = (this.nameTag?.nGetImage() as any)?.height ?? 0;
    const fillH = (this.fill?.nGetImage() as any)?.height ?? 1;
    while (spkH + tagH + 5 > this.fillCount * fillH) {
      this.fillCount++;
    }

    const topH = (this.top?.nGetImage() as any)?.height ?? 0;
    const botH = (this.bottom?.nGetImage() as any)?.height ?? 0;
    this.height = topH + this.fillCount * fillH + botH;

    // Initialize text input for GetText type
    if (type === NpcTalkType.GetText) {
      this.numberValue = 0;
      const canvas = document.getElementById('game') as any;
      if (canvas && !this.textInput) {
        this.textInput = new MapleInput(canvas, {
          x: this.x + 130, y: this.y + this.height - 35,
          width: 140, height: 18, color: '#000000',
        });
      }
    } else {
      this.textInput?.remove?.();
      this.textInput = null;
      this.numberValue = 0;
    }

    this.loadButtons();
  }
}
