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
import config from '../Config';
import { getGameCanvas } from '../GameContext';

interface NpcChoice { text: string; index: number; }

// Strip MapleStory text color/style codes (#b #r #k #n #e #d etc.)
function stripCodes(s: string): string {
  return s.replace(/#[a-zA-Z]/g, '').replace(/#L\d+#/g, '').replace(/#l/g, '');
}

// Parse NPC message into main text lines and selection choices
function parseMessage(raw: string, type: NpcTalkType): { lines: string[]; choices: NpcChoice[] } {
  const choices: NpcChoice[] = [];
  let main = raw;

  // Extract #L{i}# ... #l selection items
  const selRe = /#L(\d+)#([\s\S]*?)#l/g;
  let m: RegExpExecArray | null;
  while ((m = selRe.exec(raw)) !== null) {
    choices.push({ index: parseInt(m[1]), text: stripCodes(m[2]).trim() });
  }

  if (choices.length > 0) {
    main = raw.split('#L')[0];
  } else if (type === NpcTalkType.Selection) {
    // Fallback: \r-separated lines — first non-empty is main text, rest are choices
    const parts = raw.split('\r').map(p => stripCodes(p).trim()).filter(Boolean);
    main = parts[0] ?? '';
    parts.slice(1).forEach((p, i) => choices.push({ index: i, text: p }));
  }

  const lines = stripCodes(main).replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  return { lines, choices };
}

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
  lines: string[] = [];
  choices: NpcChoice[] = [];
  hasPrev: boolean = false;
  hasNext: boolean = true;

  top: WZNode | null = null;
  fill: WZNode | null = null;
  fillCount: number = 6;
  bottom: WZNode | null = null;
  nameTag: WZNode | null = null;
  speakerNode: any = null;
  speakerImg: any = null;
  buttons: MapleButton[] = [];

  utilDlgExNode: any = null;
  textInput: MapleInput | null = null;
  numberValue: number = 0;
  numberMin: number = 0;
  numberMax: number = 999999999;

  // hover tracking for selection list
  private _hoverIdx: number = -1;

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
    this.opts = opts;
  }

  async load() {
    this.utilDlgExNode = await NXManager.get('UI.wz/UIWindow.img/UtilDlgEx');
    this.top    = this.utilDlgExNode?.t;
    this.fill   = this.utilDlgExNode?.c;
    this.bottom = this.utilDlgExNode?.s;
    this.nameTag = this.utilDlgExNode?.bar;

    const topW = (this.top?.nGetImage() as any)?.width ?? 480;
    this.width = topW;
    this._recalcHeight();
    this._centerOnScreen();

    this.originalX = this.x;
    this.originalY = this.y;

    ClickManager.addDragableMenu(this);
  }

  private _recalcHeight() {
    const topH  = (this.top?.nGetImage()  as any)?.height ?? 0;
    const fillH = (this.fill?.nGetImage() as any)?.height ?? 1;
    const botH  = (this.bottom?.nGetImage() as any)?.height ?? 0;
    this.height = topH + this.fillCount * fillH + botH;
  }

  private _centerOnScreen() {
    this.x = Math.floor((config.width  - this.width)  / 2);
    this.y = Math.floor((config.height - this.height) / 2) - 60;
  }

  private _loadButtons() {
    this.buttons.forEach(b => ClickManager.removeButton(b));
    this.buttons = [];

    const bY = this.y + this.height + 8;
    const node = this.utilDlgExNode;
    if (!node) return;

    const mkBtn = (key: string, xOff: number, onClick: () => void) => {
      const imgs = node[key]?.nChildren ?? [];
      if (!imgs.length) return;
      const btn = new MapleStanceButton(null, {
        x: this.x + xOff, y: bY,
        img: imgs,
        isRelativeToCamera: true, isPartOfUI: true,
        onClick,
      });
      this.buttons.push(btn);
      ClickManager.addButton(btn);
    };

    // Close always present
    mkBtn('BtClose', 9, () => this.close());

    switch (this.type) {
      case NpcTalkType.YesNo:
      case NpcTalkType.AcceptDecline:
        mkBtn('BtYes', 60,  () => this.respond(1));
        mkBtn('BtNo',  110, () => this.respond(0));
        break;

      case NpcTalkType.TextOnly:
      case NpcTalkType.SendNextPrev:
        if (this.hasNext) mkBtn('BtNext', this.width - 60,  () => this.respond(0));
        if (this.hasPrev) mkBtn('BtPrev', this.width - 110, () => this.respond(1));
        break;

      case NpcTalkType.TextOkOnly:
        mkBtn('BtOK', 60, () => this.respond(1));
        break;

      case NpcTalkType.GetText:
        mkBtn('BtOK', 60, () => {
          const val = this.textInput?.input.value ?? '';
          this.respondWithText(val);
        });
        mkBtn('BtNo', 110, () => this.close());
        break;

      case NpcTalkType.GetNumber:
        mkBtn('BtOK',   60,           () => this.respondWithNumber(this.numberValue));
        mkBtn('BtNext', this.width - 60,  () => { this.numberValue = Math.min(this.numberMax, this.numberValue + 1); });
        mkBtn('BtPrev', this.width - 90,  () => { this.numberValue = Math.max(this.numberMin, this.numberValue - 1); });
        break;

      case NpcTalkType.Selection:
        // Choices are clickable rows — no extra buttons needed
        break;
    }
  }

  respond(selection: number) {
    if (SessionManager.isConnected()) new NpcTalkMorePacket(this.type as number, selection).dispatch();
    if (selection === 0 &&
        this.type !== NpcTalkType.TextOnly &&
        this.type !== NpcTalkType.SendNextPrev) {
      this.close();
    }
  }

  respondWithText(text: string) {
    if (SessionManager.isConnected()) {
      import('../Net/OutPacket').then(({ OutPacket, OutPacketOpcode }) => {
        const pkt = new OutPacket(OutPacketOpcode.NPC_TALK_MORE);
        (pkt as any).writeByte(this.type as number);
        (pkt as any).writeByte(1);
        (pkt as any).writeString(text);
        pkt.dispatch();
      });
    }
    this.close();
  }

  respondWithNumber(value: number) {
    if (SessionManager.isConnected()) {
      import('../Net/OutPacket').then(({ OutPacket, OutPacketOpcode }) => {
        const pkt = new OutPacket(OutPacketOpcode.NPC_TALK_MORE);
        (pkt as any).writeByte(this.type as number);
        (pkt as any).writeByte(1);
        (pkt as any).writeInt(value);
        pkt.dispatch();
      });
    }
    this.close();
  }

  close() {
    if (SessionManager.isConnected()) new NpcTalkMorePacket(255, -1).dispatch();
    this.textInput?.remove?.();
    this.textInput = null;
    this.setIsHidden(true);
    if (MyCharacter) (MyCharacter as any)._npcLocked = false;
  }

  draw(canvas: GameCanvas, camera: CameraInterface, lag: number, msPerTick: number, tdelta: number) {
    if (this.isHidden) return;

    const topImg:  any = this.top?.nGetImage();
    const fillImg: any = this.fill?.nGetImage();
    const botImg:  any = this.bottom?.nGetImage();
    const tagImg:  any = this.nameTag?.nGetImage();
    const topH    = topImg?.height  ?? 0;
    const fillH   = fillImg?.height ?? 0;
    const botH    = botImg?.height  ?? 0;
    const tagW    = tagImg?.width   ?? 0;
    const tagH    = tagImg?.height  ?? 0;

    // Background panels
    canvas.drawImage({ img: topImg,  dx: this.x, dy: this.y });
    for (let i = 0; i < this.fillCount; i++) {
      canvas.drawImage({ img: fillImg, dx: this.x, dy: this.y + topH + i * fillH });
    }
    canvas.drawImage({ img: botImg, dx: this.x, dy: this.y + topH + this.fillCount * fillH });

    // NPC sprite + name tag on the left (always at x+16, text always at x+166)
    const SPRITE_X  = this.x + 16;
    const innerTop  = this.y + topH;
    const midH      = Math.floor((topH + this.fillCount * fillH) / 2);

    if (this.speakerImg) {
      const sw = (this.speakerImg as any).width  ?? 0;
      const sh = (this.speakerImg as any).height ?? 0;
      const finalH = sh > midH ? sh : midH;
      canvas.drawImage({
        img: this.speakerImg,
        dx: SPRITE_X + Math.floor((tagW - sw) / 2),
        dy: this.y + topH,
      });
      if (tagImg) {
        canvas.drawImage({ img: tagImg, dx: SPRITE_X, dy: this.y + topH + finalH });
        canvas.drawText({
          text: this.name, color: '#FFFFFF', fontSize: 11,
          x: SPRITE_X + Math.floor(tagW / 2),
          y: this.y + topH + finalH + 5,
          align: 'center',
        });
      }
    } else if (tagImg) {
      // No sprite — still show name tag at top of dialog
      canvas.drawImage({ img: tagImg, dx: SPRITE_X, dy: innerTop + 4 });
      canvas.drawText({
        text: this.name, color: '#FFFFFF', fontSize: 11,
        x: SPRITE_X + Math.floor(tagW / 2),
        y: innerTop + 4 + Math.floor(tagH / 2) + 3,
        align: 'center',
      });
    }

    // Text area — fixed at x+166 matching original layout
    const TEXT_X   = this.x + 166;
    const TEXT_W   = this.width - 170;
    const LINE_H   = 16;
    let ty = innerTop + 12;

    for (const line of this.lines) {
      // Simple word-wrap
      const words = line.split(' ');
      let row = '';
      for (const word of words) {
        const test = row + (row ? ' ' : '') + word;
        if (canvas.measureText({ text: test, fontSize: 12 }).width > TEXT_W && row) {
          canvas.drawText({ text: row, x: TEXT_X, y: ty, color: '#000000', fontSize: 12 });
          ty += LINE_H;
          row = word;
        } else {
          row = test;
        }
      }
      if (row) {
        canvas.drawText({ text: row, x: TEXT_X, y: ty, color: '#000000', fontSize: 12 });
        ty += LINE_H;
      }
    }

    // Selection choices
    if (this.type === NpcTalkType.Selection && this.choices.length) {
      ty += 4;
      this.choices.forEach((c, i) => {
        const hover = i === this._hoverIdx;
        const color = hover ? '#0066FF' : '#0000AA';
        canvas.drawText({ text: `#${c.index + 1} ${c.text}`, color, x: TEXT_X, y: ty + i * LINE_H, fontSize: 12 });
      });

      // Handle click on choices
      if (canvas.clicked) {
        const mx = canvas.mouseX;
        const my = canvas.mouseY;
        this.choices.forEach((c, i) => {
          const cy = ty + i * LINE_H;
          if (mx >= TEXT_X && mx <= TEXT_X + TEXT_W && my >= cy - 12 && my <= cy + 4) {
            this.respond(c.index);
          }
        });
      }
      // Update hover
      this._hoverIdx = -1;
      this.choices.forEach((c, i) => {
        const cy = ty + i * LINE_H;
        if (canvas.mouseX >= TEXT_X && canvas.mouseX <= TEXT_X + TEXT_W &&
            canvas.mouseY >= cy - 12 && canvas.mouseY <= cy + 4) {
          this._hoverIdx = i;
        }
      });
    }

    // GetNumber value box
    if (this.type === NpcTalkType.GetNumber) {
      const numY = this.y + this.height - 28;
      canvas.drawRect({ x: TEXT_X, y: numY, width: 80, height: 18, color: '#ffffff', alpha: 0.9, strokeColor: '#334466', strokeWidth: 1 });
      canvas.drawText({ text: `${this.numberValue}`, color: '#000000', x: TEXT_X + 40, y: numY + 13, fontSize: 11, align: 'center' } as any);
    }

    this.buttons.forEach(b => b.draw(canvas, camera, lag, msPerTick, tdelta));
  }

  moveTo(position: Position) {
    const dx = position.x - this.originalX;
    const dy = position.y - this.originalY;
    this.x = position.x;
    this.y = position.y;
    this.buttons.forEach(b => { b.x += dx; b.y += dy; });
    this.originalX = position.x;
    this.originalY = position.y;
  }

  getRect(_camera: CameraInterface) {
    return { x: this.x, y: this.y, width: this.width, height: this.height + 40 };
  }

  setIsHidden(hidden: boolean) {
    this.isHidden = hidden;
    this.buttons.forEach(b => (b.isHidden = hidden));
    if (!hidden && MyCharacter) (MyCharacter as any)._npcLocked = true;
  }

  async changeText(
    npcId: number,
    type: NpcTalkType,
    speaker: string,
    text: string,
    hasPrev = false,
    hasNext = true,
    _choices: NpcChoice[] = [],
  ) {
    this.type     = type;
    this.name     = speaker;
    this.hasPrev  = hasPrev;
    this.hasNext  = hasNext;

    const { lines, choices } = parseMessage(text, type);
    this.lines   = lines;
    this.choices = choices;

    // Load NPC sprite — try frame nGetImage first, then canvas child fallback
    this.speakerImg = null;
    try {
      const strId = `${npcId}`.padStart(7, '0');
      const npcNode: any = await NXManager.get(`Npc.wz/${strId}.img`);
      const frame: any = npcNode?.stand?.[0];
      if (frame) {
        // Try direct image (some parsers composite the frame)
        const direct = frame.nGetImage?.();
        if (direct) {
          this.speakerImg = direct;
        } else {
          // Fall back: first canvas child of the frame
          const canvasChild = (frame.nChildren as any[])?.find((c: any) => c.nTagName === 'canvas');
          this.speakerImg = canvasChild?.nGetImage?.() ?? null;
        }
      }
    } catch (_) {}

    // Adjust fill count so sprite fits
    const SPRITE_AREA_W = this.speakerImg ? 130 : 0;
    const spkH  = (this.speakerImg as any)?.height ?? 0;
    const tagH  = (this.nameTag?.nGetImage() as any)?.height ?? 0;
    const fillH = (this.fill?.nGetImage() as any)?.height ?? 1;
    const textLines = this.lines.length + (this.choices.length ? this.choices.length + 1 : 0);
    const neededH = Math.max(spkH + tagH + 8, textLines * 16 + 24);
    this.fillCount = Math.max(4, Math.ceil(neededH / (fillH || 1)));

    this._recalcHeight();
    this._centerOnScreen();
    this.originalX = this.x;
    this.originalY = this.y;

    // GetText input
    this.textInput?.remove?.();
    this.textInput = null;
    if (type === NpcTalkType.GetText) {
      const gc = getGameCanvas();
      if (gc) {
        this.textInput = new MapleInput(gc, {
          x: this.x + SPRITE_AREA_W + 20,
          y: this.y + this.height - 32,
          width: 200, height: 18,
          color: '#000000', background: '#ffffff',
        });
      }
    }

    this.numberValue = 0;
    this._loadButtons();
  }
}
