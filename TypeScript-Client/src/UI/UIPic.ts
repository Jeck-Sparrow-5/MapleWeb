import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import ClickManager from './ClickManager';
import { MapleStanceButton } from './MapleStanceButton';
import MapleInput from './MapleInput';
import { CameraInterface } from '../Camera';

type Mode = 'enter' | 'register_first' | 'register_confirm';

// SoftKey dialog dimensions
// Bottom digit row y = 95 + 3*43 = 224; need ~50px below for OK/Cancel
const SK_W = 215;
const SK_H = 280;

// Positioned in upper-center — keeps row 4 above character-name bars (y~440)
const SK_X = Math.floor((800 - SK_W) / 2);  // 292
const SK_Y = 100;  // top of dialog at y=100, bottom at 380, row4 at y=324

// keypos(index, row): position of digit button relative to SoftKey top-left
// Row 0 starts at y=95, rows spaced 43px. Columns start at x=27, spaced 45px.
// Row 3 (digit 0) has extra +90 offset.
function keypos(index: number, row: number): { x: number; y: number } {
  let x = index * 45;
  const y = row * 43;
  if (row === 3) x += 45 * 2;
  return { x: SK_X + 27 + x, y: SK_Y + 95 + y };
}

// Digit → (index, row) mapping — 3×3 grid for 1-9, row 3 for 0
const DIGIT_MAP: Record<number, [number, number]> = {
  1: [0, 0], 2: [1, 0], 3: [2, 0],
  4: [0, 1], 5: [1, 1], 6: [2, 1],
  7: [0, 2], 8: [1, 2], 9: [2, 2],
  0: [0, 3],
};

interface UIPicState {
  visible: boolean;
  mode: Mode;
  firstPic: string;
  onEnter: ((pic: string) => void) | null;
  onCancel: (() => void) | null;
  input: MapleInput | null;
  bgImg: any;
  btOk: MapleStanceButton | null;
  btCancel: MapleStanceButton | null;
  btDel: MapleStanceButton | null;
  btNums: MapleStanceButton[];
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
  btOk: null,
  btCancel: null,
  btDel: null,
  btNums: [],
  initialized: false,
};

export async function initUIPic(canvas: GameCanvas): Promise<void> {
  if (UIPic.initialized) return;
  UIPic.initialized = true;

  const node = await NXManager.get('UI.wz/Login.img');
  const sk = node?.nGet('Common')?.nGet('SoftKey');
  if (!sk) return;

  UIPic.bgImg = sk.nGet('backgrnd')?.nGetImage?.() ?? sk.nGet('0')?.nGetImage?.();

  // Control buttons — placed at bottom-right of SoftKey using HeavenMS layout
  // BtOK: right-bottom, BtCancel: left of OK, BtDel: above those
  const btOkNode   = sk.nGet('BtOK');
  const btCancelNode = sk.nGet('BtCancel');
  const btDelNode  = sk.nGet('BtDel');

  // Row 3: y = 95 + 3*43 = 224 within SoftKey → absolute SK_Y+224
  // Layout: [Cancel][0][Del-arrow][OK]  — cancel leftmost, ok rightmost
  const ctrlY   = SK_Y + 224;
  const cancelX = SK_X + 27;   // leftmost column
  // digit 0 stays at keypos(0,3) = SK_X+117 (middle)
  const delX    = SK_X + 162;  // Del (backspace ←) at row 2 rightmost, reused for row 3
  const okX     = SK_X + 162;  // OK rightmost column, row 3

  UIPic.btOk = new MapleStanceButton(canvas, {
    x: okX, y: ctrlY,
    img: btOkNode?.nChildren ?? [],
    isPartOfUI: true, isHidden: true,
    onClick: () => _confirm(canvas),
  });
  ClickManager.addButton(UIPic.btOk);

  UIPic.btCancel = new MapleStanceButton(canvas, {
    x: cancelX, y: ctrlY,
    img: btCancelNode?.nChildren ?? [],
    isPartOfUI: true, isHidden: true,
    onClick: () => hide(),
  });
  ClickManager.addButton(UIPic.btCancel);

  UIPic.btDel = new MapleStanceButton(canvas, {
    x: delX, y: ctrlY - 43,  // row 2 right side (43px above row 3)
    img: btDelNode?.nChildren ?? [],
    isPartOfUI: true, isHidden: true,
    onClick: () => {
      if (!UIPic.input) return;
      const v = UIPic.input.input.value;
      UIPic.input.input.value = v.slice(0, -1);
    },
  });
  ClickManager.addButton(UIPic.btDel);

  // Digit buttons 0-9 using keypos formula
  const btNumNode = sk.nGet('BtNum');
  for (const [digit, [idx, row]] of Object.entries(DIGIT_MAP)) {
    const d = Number(digit);
    const pos = keypos(idx, row);
    const btn = new MapleStanceButton(canvas, {
      x: pos.x, y: pos.y,
      img: btNumNode?.nGet(String(d))?.nChildren ?? [],
      isPartOfUI: true, isHidden: true,
      onClick: () => {
        if (!UIPic.input) return;
        const v = UIPic.input.input.value;
        if (v.length < 6) UIPic.input.input.value = v + String(d);
      },
    });
    ClickManager.addButton(btn);
    UIPic.btNums.push(btn);
  }
}

function _setVisible(v: boolean) {
  UIPic.visible = v;
  if (UIPic.btOk)     UIPic.btOk.isHidden     = !v;
  if (UIPic.btCancel) UIPic.btCancel.isHidden  = !v;
  if (UIPic.btDel)    UIPic.btDel.isHidden     = !v;
  UIPic.btNums.forEach(b => b.isHidden = !v);
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

  // Input overlaid in the text-display area of SoftKey (top of dialog)
  UIPic.input = new MapleInput(canvas, {
    x: SK_X + 5,
    y: SK_Y + 58,
    width: SK_W - 10,
    height: 20,
    color: '#222222',
    type: 'password',
    submitListeners: [() => _confirm(canvas)],
  });
  UIPic.input.input.maxLength = 6;
  UIPic.input.input.style.opacity = '0'; // hide raw input — we draw dots instead

  _setVisible(true);
  setTimeout(() => UIPic.input?.input.focus(), 50);
}

export function hide() {
  _setVisible(false);
  if (UIPic.input) { UIPic.input.remove(); UIPic.input = null; }
  UIPic.onCancel?.();
}

export function drawUIPic(canvas: GameCanvas, _camera: CameraInterface) {
  if (!UIPic.visible) return;

  // Dim overlay
  canvas.drawRect({ x: 0, y: 0, width: 800, height: 600, color: '#000000', alpha: 0.55 });

  // SoftKey background from WZ
  if (UIPic.bgImg?.width > 1) {
    canvas.drawImage({ img: UIPic.bgImg, dx: SK_X, dy: SK_Y });
  } else {
    // Fallback panel
    canvas.drawRoundedRect({ x: SK_X, y: SK_Y, width: SK_W, height: SK_H, radius: 6,
      color: '#1e1e30', alpha: 0.97, strokeColor: '#556688', strokeWidth: 1 });
  }

  // Label at top of SoftKey
  const label = UIPic.mode === 'register_first' ? 'Set new PIC (6 digits)'
    : UIPic.mode === 'register_confirm' ? 'Confirm PIC'
    : 'Enter PIC';
  canvas.drawText({ text: label, x: SK_X + SK_W / 2, y: SK_Y + 20,
    color: '#ffffff', fontSize: 11, align: 'center' });

  // Dot indicator (filled = entered, empty = not yet)
  const entered = UIPic.input?.input.value?.length ?? 0;
  const dotStartX = SK_X + SK_W / 2 - (6 * 14) / 2 + 7;
  const dotY = SK_Y + 65;
  for (let i = 0; i < 6; i++) {
    const dx = dotStartX + i * 14;
    if (i < entered) {
      canvas.drawCircle({ x: dx, y: dotY, radius: 5, color: '#5599ff' });
    } else {
      canvas.drawCircle({ x: dx, y: dotY, radius: 5, strokeColor: '#888888', strokeWidth: 1 });
    }
  }

  // Draw buttons
  const cam = { x: 0, y: 0 } as CameraInterface;
  UIPic.btOk?.draw(canvas, cam, 0, 0, 0);
  UIPic.btCancel?.draw(canvas, cam, 0, 0, 0);
  UIPic.btDel?.draw(canvas, cam, 0, 0, 0);
  UIPic.btNums.forEach(b => b.draw(canvas, cam, 0, 0, 0));
}
