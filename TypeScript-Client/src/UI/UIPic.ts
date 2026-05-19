import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import ClickManager from './ClickManager';
import { MapleStanceButton } from './MapleStanceButton';
import MapleInput from './MapleInput';
import { CameraInterface } from '../Camera';

type Mode = 'enter' | 'register_first' | 'register_confirm';

// Default window position — centered, near top
let winX = 292;
let winY = 100;
let _dragActive = false;
let _dragOffX = 0;
let _dragOffY = 0;

// WZ offsets for non-button elements
const INPUT_OX = 5;
const INPUT_OY = 58;

// Button offsets relative to window origin (WZ has no position data; matched from HeavenMS layout)
const BTN_START_X = 10;
const BTN_START_Y = 95;
const BTN_COL_W   = 38;
const BTN_ROW_H   = 38;

const FALLBACK_OK_OX     = BTN_START_X + 3 * BTN_COL_W; const FALLBACK_OK_OY     = BTN_START_Y + 3 * BTN_ROW_H;
const FALLBACK_CANCEL_OX = BTN_START_X;                  const FALLBACK_CANCEL_OY = BTN_START_Y + 3 * BTN_ROW_H;
const FALLBACK_DEL_OX    = BTN_START_X + 3 * BTN_COL_W; const FALLBACK_DEL_OY    = BTN_START_Y + 2 * BTN_ROW_H;

function _digitFallbackOx(idx: number, _row: number): number {
  return BTN_START_X + idx * BTN_COL_W;
}
function _digitFallbackOy(row: number): number {
  return BTN_START_Y + row * BTN_ROW_H;
}

const DIGIT_MAP: Record<number, [number, number]> = {
  1: [0, 0], 2: [1, 0], 3: [2, 0],
  4: [0, 1], 5: [1, 1], 6: [2, 1],
  7: [0, 2], 8: [1, 2], 9: [2, 2],
  0: [1, 3],
};


interface BtnEntry { btn: MapleStanceButton; ox: number; oy: number; }

interface UIPicState {
  visible: boolean;
  mode: Mode;
  firstPic: string;
  onEnter: ((pic: string) => void) | null;
  onCancel: (() => void) | null;
  input: MapleInput | null;
  bgImg: any;
  bgW: number;
  bgH: number;
  btOk: BtnEntry | null;
  btCancel: BtnEntry | null;
  btDel: BtnEntry | null;
  btNums: BtnEntry[];
  initialized: boolean;
}

const UIPic: UIPicState = {
  visible: false,
  mode: 'enter',
  firstPic: '',
  onEnter: null,
  onCancel: null,
  input: null,
  bgImg: null,
  bgW: 215,
  bgH: 280,
  btOk: null,
  btCancel: null,
  btDel: null,
  btNums: [],
  initialized: false,
};

function _makeEntry(
  canvas: GameCanvas,
  img: any[],
  ox: number,
  oy: number,
  onClick: () => void,
): BtnEntry {
  const btn = new MapleStanceButton(canvas, {
    x: winX + ox,
    y: winY + oy,
    img,
    isPartOfUI: true,
    isHidden: true,
    onClick,
  });
  ClickManager.addButton(btn);
  return { btn, ox, oy };
}

function _reposition() {
  const entries: (BtnEntry | null)[] = [UIPic.btOk, UIPic.btCancel, UIPic.btDel, ...UIPic.btNums];
  for (const e of entries) {
    if (!e) continue;
    e.btn.x = winX + e.ox;
    e.btn.y = winY + e.oy;
  }
  if (UIPic.input) {
    UIPic.input.input.style.left = `${winX + INPUT_OX}px`;
    UIPic.input.input.style.top  = `${winY + INPUT_OY}px`;
  }
}

export async function initUIPic(canvas: GameCanvas): Promise<void> {
  if (UIPic.initialized) return;
  UIPic.initialized = true;

  const node = await NXManager.get('UI.wz/Login.img');
  const sk = node?.nGet('Common')?.nGet('SoftKey');
  if (!sk) return;

  const bg = sk.nGet('backgrnd') ?? sk.nGet('0');
  UIPic.bgImg = bg?.nGetImage?.() ?? null;
  UIPic.bgW = UIPic.bgImg?.width  > 1 ? UIPic.bgImg.width  : 215;
  UIPic.bgH = UIPic.bgImg?.height > 1 ? UIPic.bgImg.height : 280;

  // Center default window position using actual bg size
  winX = Math.floor((800 - UIPic.bgW) / 2);

  const btOkNode     = sk.nGet('BtOK');
  const btCancelNode = sk.nGet('BtCancel');
  const btDelNode    = sk.nGet('BtDel');
  const btNumNode    = sk.nGet('BtNum');

  const [okOx,     okOy]     = [FALLBACK_OK_OX,     FALLBACK_OK_OY];
  const [cancelOx, cancelOy] = [FALLBACK_CANCEL_OX, FALLBACK_CANCEL_OY];
  const [delOx,    delOy]    = [FALLBACK_DEL_OX,    FALLBACK_DEL_OY];

  UIPic.btOk     = _makeEntry(canvas, btOkNode?.nChildren ?? [],     okOx,     okOy,     () => _confirm(canvas));
  UIPic.btCancel = _makeEntry(canvas, btCancelNode?.nChildren ?? [], cancelOx, cancelOy, () => hide());
  UIPic.btDel    = _makeEntry(canvas, btDelNode?.nChildren ?? [],    delOx,    delOy,    () => {
    if (!UIPic.input) return;
    UIPic.input.input.value = UIPic.input.input.value.slice(0, -1);
  });

  for (const [digit, [idx, row]] of Object.entries(DIGIT_MAP)) {
    const d = Number(digit);
    const numNode = btNumNode?.nGet(String(d));
    const ox = _digitFallbackOx(idx, row);
    const oy = _digitFallbackOy(row);
    const entry = _makeEntry(canvas, numNode?.nChildren ?? [], ox, oy, () => {
      if (!UIPic.input) return;
      const v = UIPic.input.input.value;
      if (v.length < 6) UIPic.input.input.value = v + String(d);
    });
    UIPic.btNums.push(entry);
  }
}

function _setVisible(v: boolean) {
  UIPic.visible = v;
  const entries: (BtnEntry | null)[] = [UIPic.btOk, UIPic.btCancel, UIPic.btDel, ...UIPic.btNums];
  for (const e of entries) {
    if (e) e.btn.isHidden = !v;
  }
}

function _confirm(canvas: GameCanvas) {
  const val = UIPic.input?.input.value ?? '';
  if (val.length < 6) return;

  if (UIPic.mode === 'enter') {
    hide();
    UIPic.onEnter?.(val);
  } else if (UIPic.mode === 'register_first') {
    UIPic.firstPic = val;
    UIPic.mode = 'register_confirm';
    UIPic.input!.input.value = '';
    UIPic.input!.input.placeholder = 'Confirm PIC';
  } else {
    if (val !== UIPic.firstPic) {
      UIPic.input!.input.value = '';
      UIPic.input!.input.placeholder = 'Mismatch — try again';
      return;
    }
    const confirmed = UIPic.firstPic;
    hide();
    UIPic.onEnter?.(confirmed);
  }
}

export function showPic(
  canvas: GameCanvas,
  mode: 'enter' | 'register',
  onConfirm: (pic: string) => void,
  onCancel?: () => void,
) {
  UIPic.mode = mode === 'register' ? 'register_first' : 'enter';
  UIPic.firstPic = '';
  UIPic.onEnter = onConfirm;
  UIPic.onCancel = onCancel ?? null;

  if (UIPic.input) { UIPic.input.remove(); UIPic.input = null; }

  UIPic.input = new MapleInput(canvas, {
    x: winX + INPUT_OX,
    y: winY + INPUT_OY,
    width: UIPic.bgW - INPUT_OX * 2,
    height: 20,
    color: '#222222',
    type: 'password',
    submitListeners: [() => _confirm(canvas)],
  });
  UIPic.input.input.maxLength = 6;
  UIPic.input.input.style.opacity = '0';

  _setVisible(true);
  setTimeout(() => UIPic.input?.input.focus(), 50);
}

export function hide() {
  _setVisible(false);
  _dragActive = false;
  if (UIPic.input) { UIPic.input.remove(); UIPic.input = null; }
  UIPic.onCancel?.();
}

export function drawUIPic(canvas: GameCanvas, _camera: CameraInterface) {
  if (!UIPic.visible) return;

  // Drag logic — title bar = top 24px of window
  const mx = canvas.mouseX;
  const my = canvas.mouseY;
  const titleBarHit = mx >= winX && mx <= winX + UIPic.bgW && my >= winY && my <= winY + 24;

  if (canvas.clicked) {
    if (!_dragActive && titleBarHit) {
      _dragActive = true;
      _dragOffX = mx - winX;
      _dragOffY = my - winY;
    }
    if (_dragActive) {
      winX = mx - _dragOffX;
      winY = my - _dragOffY;
      _reposition();
    }
  } else {
    _dragActive = false;
  }

  // Background
  if (UIPic.bgImg?.width > 1) {
    canvas.drawImage({ img: UIPic.bgImg, dx: winX, dy: winY });
  } else {
    canvas.drawRoundedRect({
      x: winX, y: winY, width: UIPic.bgW, height: UIPic.bgH, radius: 6,
      color: '#1e1e30', alpha: 0.97, strokeColor: '#556688', strokeWidth: 1,
    });
  }

  // Label
  const label = UIPic.mode === 'register_first' ? 'Set new PIC (6 digits)'
    : UIPic.mode === 'register_confirm' ? 'Confirm PIC'
    : 'Enter PIC';
  canvas.drawText({ text: label, x: winX + UIPic.bgW / 2, y: winY + 20, color: '#ffffff', fontSize: 11, align: 'center' });

  // Dot indicator
  const entered = UIPic.input?.input.value?.length ?? 0;
  const dotStartX = winX + UIPic.bgW / 2 - (6 * 14) / 2 + 7;
  const dotY = winY + 65;
  for (let i = 0; i < 6; i++) {
    const dx = dotStartX + i * 14;
    if (i < entered) {
      canvas.drawCircle({ x: dx, y: dotY, radius: 5, color: '#ffffff' });
    } else {
      canvas.drawCircle({ x: dx, y: dotY, radius: 5, strokeColor: '#ffffff', strokeWidth: 2 });
    }
  }

  // Toggle Cancel / Del based on input length
  if (UIPic.btCancel) UIPic.btCancel.btn.isHidden = entered > 0;
  if (UIPic.btDel)    UIPic.btDel.btn.isHidden    = entered === 0;

  // Buttons
  const cam = { x: 0, y: 0 } as CameraInterface;
  UIPic.btOk?.btn.draw(canvas, cam, 0, 0, 0);
  UIPic.btCancel?.btn.draw(canvas, cam, 0, 0, 0);
  UIPic.btDel?.btn.draw(canvas, cam, 0, 0, 0);
  UIPic.btNums.forEach(e => e.btn.draw(canvas, cam, 0, 0, 0));
}
