import NXManager from '../wz-utils/NXManager';
import GameCanvas from '../GameCanvas';
import ClickManager from './ClickManager';
import { MapleStanceButton, BUTTON_STANCE } from './MapleStanceButton';
import MapleInput from './MapleInput';
import { CameraInterface } from '../Camera';

type Mode = 'enter' | 'register_first' | 'register_confirm';

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

// SoftKey sits at fixed screen position
const SK_X = 201;  // screen x of SoftKey background
const SK_Y = 166;  // screen y of SoftKey background
const INPUT_X = 280;
const INPUT_Y = 215;
const INPUT_W = 140;

export async function initUIPic(canvas: GameCanvas): Promise<void> {
  if (UIPic.initialized) return;
  UIPic.initialized = true;

  const node = await NXManager.get('UI.wz/Login.img');
  const sk = node?.nGet('Common')?.nGet('SoftKey');
  if (!sk) return;

  UIPic.bgImg = sk.nGet('backgrnd')?.nGetImage?.() ?? sk.nGet('0')?.nGetImage?.();

  // BtOK
  UIPic.btOk = new MapleStanceButton(canvas, {
    x: SK_X + 201,
    y: SK_Y + 144,
    img: sk.nGet('BtOK')?.nChildren ?? [],
    isPartOfUI: true,
    isHidden: true,
    onClick: () => _confirm(canvas),
  });
  ClickManager.addButton(UIPic.btOk);

  // BtCancel
  UIPic.btCancel = new MapleStanceButton(canvas, {
    x: SK_X + 159,
    y: SK_Y + 144,
    img: sk.nGet('BtCancel')?.nChildren ?? [],
    isPartOfUI: true,
    isHidden: true,
    onClick: () => hide(),
  });
  ClickManager.addButton(UIPic.btCancel);

  // BtDel
  UIPic.btDel = new MapleStanceButton(canvas, {
    x: SK_X + 203,
    y: SK_Y + 116,
    img: sk.nGet('BtDel')?.nChildren ?? [],
    isPartOfUI: true,
    isHidden: true,
    onClick: () => {
      if (!UIPic.input) return;
      const v = UIPic.input.input.value;
      UIPic.input.input.value = v.slice(0, -1);
    },
  });
  ClickManager.addButton(UIPic.btDel);

  // BtNum 0-9
  const numPositions = [
    [SK_X + 22,  SK_Y + 116], // 0
    [SK_X + 22,  SK_Y + 55],  // 1
    [SK_X + 68,  SK_Y + 55],  // 2
    [SK_X + 113, SK_Y + 55],  // 3
    [SK_X + 22,  SK_Y + 85],  // 4
    [SK_X + 68,  SK_Y + 85],  // 5
    [SK_X + 113, SK_Y + 85],  // 6
    [SK_X + 68,  SK_Y + 116], // 7
    [SK_X + 113, SK_Y + 116], // 8
    [SK_X + 159, SK_Y + 55],  // 9
  ];

  const btNumNode = sk.nGet('BtNum');
  for (let i = 0; i <= 9; i++) {
    const [bx, by] = numPositions[i];
    const digit = String(i);
    const btn = new MapleStanceButton(canvas, {
      x: bx, y: by,
      img: btNumNode?.nGet(String(i))?.nChildren ?? [],
      isPartOfUI: true,
      isHidden: true,
      onClick: () => {
        if (!UIPic.input) return;
        const v = UIPic.input.input.value;
        if (v.length < 6) UIPic.input.input.value = v + digit;
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
      UIPic.input!.input.placeholder = 'PICs did not match';
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
    x: INPUT_X,
    y: INPUT_Y,
    width: INPUT_W,
    height: 20,
    color: '#222222',
    type: 'password',
    focusListeners: [],
    focusoutListeners: [],
    submitListeners: [() => _confirm(canvas)],
  });
  UIPic.input.input.maxLength = 6;
  UIPic.input.input.placeholder = mode === 'register' ? 'Enter new PIC (6 digits)' : 'Enter PIC';

  _setVisible(true);
  UIPic.input.input.focus();
}

export function hide() {
  _setVisible(false);
  if (UIPic.input) { UIPic.input.remove(); UIPic.input = null; }
  UIPic.onCancel?.();
}

export function drawUIPic(canvas: GameCanvas, _camera: CameraInterface) {
  if (!UIPic.visible) return;

  // Dim overlay
  canvas.drawRect({ x: 0, y: 0, width: 800, height: 600, color: '#000000', alpha: 0.5 });

  // SoftKey background
  if (UIPic.bgImg?.width) {
    canvas.drawImage({ img: UIPic.bgImg, dx: SK_X, dy: SK_Y });
  } else {
    canvas.drawRoundedRect({ x: SK_X, y: SK_Y, width: 265, height: 185, radius: 6,
      color: '#1a1a2e', alpha: 0.97, strokeColor: '#556688', strokeWidth: 1 });
  }

  // Label
  const label = UIPic.mode === 'register_first'
    ? 'Set new PIC (6 digits)'
    : UIPic.mode === 'register_confirm'
    ? 'Confirm PIC'
    : 'Enter PIC';
  canvas.drawText({ text: label, x: SK_X + 132, y: SK_Y + 22, color: '#ffffff', fontSize: 11, align: 'center' });

  // Dot display (show filled circles per digit entered)
  const entered = UIPic.input?.input.value?.length ?? 0;
  for (let i = 0; i < 6; i++) {
    const dotX = SK_X + 75 + i * 20;
    const dotY = SK_Y + 42;
    if (i < entered) {
      canvas.drawCircle({ x: dotX, y: dotY, radius: 5, color: '#4488ff' });
    } else {
      canvas.drawCircle({ x: dotX, y: dotY, radius: 5, strokeColor: '#888888', strokeWidth: 1 });
    }
  }

  // Draw buttons
  UIPic.btOk?.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0);
  UIPic.btCancel?.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0);
  UIPic.btDel?.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0);
  UIPic.btNums.forEach(b => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
}
