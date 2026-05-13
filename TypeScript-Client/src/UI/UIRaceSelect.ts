import WZManager from '../wz-utils/WZManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import MapleInput from './MapleInput';
import GameCanvas from '../GameCanvas';
import CreateCharPacket from '../Net/Packets/CreateCharPacket';
import UILogin from './UILogin';
import LoginState, { LoginSubState } from '../LoginState';

// Preset appearance options
const FACES   = [20000, 20001, 20002, 20100, 20401];
const HAIRS   = [30000, 30010, 30020, 30030, 33110];
const COLORS  = [0, 1, 2, 3, 4]; // hair color offsets
const SKINS   = [0, 1, 2, 3, 4];
const TOPS    = [1040002, 1040006, 1040010, 1041011];
const BOTTOMS = [1060002, 1060006, 1060010, 1061008];
const SHOES   = [1072001, 1072005, 1072037, 1072038];
const WEAPONS = [1302000, 1312004, 1322005, 1332007];

interface CharCreationState {
  name: string;
  gender: number;
  faceIdx: number;
  hairIdx: number;
  colorIdx: number;
  skinIdx: number;
  topIdx: number;
  botIdx: number;
  shoeIdx: number;
  weaponIdx: number;
}

const state: CharCreationState = {
  name: '',
  gender: 0,
  faceIdx: 0, hairIdx: 0, colorIdx: 0, skinIdx: 0,
  topIdx: 0, botIdx: 0, shoeIdx: 0, weaponIdx: 0,
};

const UIRaceSelect = {
  isHidden: true,
  buttons: [] as MapleStanceButton[],
  nameInput: null as MapleInput | null,
  initialized: false,
  bgImg: null as any,
  x: 100,
  y: 50,
  W: 600,
  H: 500,

  async initialize(canvas: GameCanvas) {
    this.x = Math.floor((800 - this.W) / 2);
    this.y = Math.floor((600 - this.H) / 2);

    const uiWin = await WZManager.get('UI.wz/UIWindow.img');
    const loginImg = await WZManager.get('UI.wz/Login.img');

    this.nameInput = new MapleInput(canvas, {
      x: this.x + 180, y: this.y + 380,
      width: 160, height: 20,
      color: '#ffffff',
    });

    const makeArrow = (label: string, px: number, py: number, onClick: () => void) => {
      const btn = new MapleStanceButton(canvas, {
        x: px, y: py,
        img: uiWin.nGet(label === '<' ? 'BtLeft' : 'BtRight')?.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick,
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    };

    const bx = (col: number) => this.x + 20 + col * 90;
    const by = this.y + 200;

    makeArrow('<', bx(0),     by, () => { state.faceIdx   = (state.faceIdx   - 1 + FACES.length)   % FACES.length; });
    makeArrow('>', bx(0)+30,  by, () => { state.faceIdx   = (state.faceIdx   + 1) % FACES.length; });
    makeArrow('<', bx(1),     by, () => { state.hairIdx   = (state.hairIdx   - 1 + HAIRS.length)   % HAIRS.length; });
    makeArrow('>', bx(1)+30,  by, () => { state.hairIdx   = (state.hairIdx   + 1) % HAIRS.length; });
    makeArrow('<', bx(2),     by, () => { state.colorIdx  = (state.colorIdx  - 1 + COLORS.length)  % COLORS.length; });
    makeArrow('>', bx(2)+30,  by, () => { state.colorIdx  = (state.colorIdx  + 1) % COLORS.length; });
    makeArrow('<', bx(3),     by, () => { state.skinIdx   = (state.skinIdx   - 1 + SKINS.length)   % SKINS.length; });
    makeArrow('>', bx(3)+30,  by, () => { state.skinIdx   = (state.skinIdx   + 1) % SKINS.length; });
    makeArrow('<', bx(0),     by+60, () => { state.topIdx = (state.topIdx - 1 + TOPS.length) % TOPS.length; });
    makeArrow('>', bx(0)+30,  by+60, () => { state.topIdx = (state.topIdx + 1) % TOPS.length; });
    makeArrow('<', bx(1),     by+60, () => { state.botIdx = (state.botIdx - 1 + BOTTOMS.length) % BOTTOMS.length; });
    makeArrow('>', bx(1)+30,  by+60, () => { state.botIdx = (state.botIdx + 1) % BOTTOMS.length; });
    makeArrow('<', bx(2),     by+60, () => { state.shoeIdx = (state.shoeIdx - 1 + SHOES.length) % SHOES.length; });
    makeArrow('>', bx(2)+30,  by+60, () => { state.shoeIdx = (state.shoeIdx + 1) % SHOES.length; });
    makeArrow('<', bx(3),     by+60, () => { state.weaponIdx = (state.weaponIdx - 1 + WEAPONS.length) % WEAPONS.length; });
    makeArrow('>', bx(3)+30,  by+60, () => { state.weaponIdx = (state.weaponIdx + 1) % WEAPONS.length; });

    // Gender toggle
    const genderBtn = new MapleStanceButton(canvas, {
      x: this.x + 20, y: this.y + 160,
      img: uiWin.nGet('BtOK')?.nChildren,
      isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
      onClick: () => { state.gender = state.gender === 0 ? 1 : 0; },
    });
    ClickManager.addButton(genderBtn);
    this.buttons.push(genderBtn);

    // OK — create character
    const okBtn = new MapleStanceButton(canvas, {
      x: this.x + this.W - 80, y: this.y + this.H - 35,
      img: uiWin.nGet('BtOK')?.nChildren,
      isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
      onClick: () => {
        const name = this.nameInput?.input.value ?? '';
        if (name.length < 4) return;
        new CreateCharPacket(
          name,
          FACES[state.faceIdx],
          HAIRS[state.hairIdx],
          COLORS[state.colorIdx],
          SKINS[state.skinIdx],
          TOPS[state.topIdx],
          BOTTOMS[state.botIdx],
          SHOES[state.shoeIdx],
          WEAPONS[state.weaponIdx],
          state.gender,
        ).dispatch();
        this.hide();
      },
    });
    ClickManager.addButton(okBtn);
    this.buttons.push(okBtn);

    // Cancel
    const cancelBtn = new MapleStanceButton(canvas, {
      x: this.x + this.W - 160, y: this.y + this.H - 35,
      img: uiWin.nGet('BtNo')?.nChildren,
      isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
      onClick: () => this.hide(),
    });
    ClickManager.addButton(cancelBtn);
    this.buttons.push(cancelBtn);

    this.initialized = true;
  },

  show(canvas: GameCanvas) {
    if (!this.initialized) {
      this.initialize(canvas);
    }
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
    this.nameInput?.input.focus();
  },

  hide() {
    this.isHidden = true;
    this.buttons.forEach((b) => (b.isHidden = true));
    this.nameInput?.remove();
    this.nameInput = null;
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.context.save();
    canvas.context.fillStyle = 'rgba(10,10,25,0.97)';
    canvas.context.fillRect(this.x, this.y, this.W, this.H);
    canvas.context.strokeStyle = '#334466';
    canvas.context.strokeRect(this.x, this.y, this.W, this.H);
    canvas.context.restore();

    canvas.drawText({ text: 'Create Character', color: '#FFDD88', x: this.x + 10, y: this.y + 20, fontSize: 14 });
    canvas.drawText({ text: `Gender: ${state.gender === 0 ? 'Male' : 'Female'}`, color: '#AADDFF', x: this.x + 80, y: this.y + 165, fontSize: 11 });

    const labels = ['Face', 'Hair', 'Hair Color', 'Skin', 'Top', 'Bottom', 'Shoes', 'Weapon'];
    const values = [
      FACES[state.faceIdx], HAIRS[state.hairIdx], COLORS[state.colorIdx], SKINS[state.skinIdx],
      TOPS[state.topIdx], BOTTOMS[state.botIdx], SHOES[state.shoeIdx], WEAPONS[state.weaponIdx],
    ];
    const by = this.y + 200;
    labels.forEach((label, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const lx = this.x + 20 + col * 90;
      const ly = by + row * 60;
      canvas.drawText({ text: label, color: '#AAAACC', x: lx, y: ly - 10, fontSize: 9 });
      canvas.drawText({ text: `${values[i]}`, color: '#FFFFFF', x: lx + 5, y: ly + 10, fontSize: 9 });
    });

    canvas.drawText({ text: 'Character Name:', color: '#AAAACC', x: this.x + 20, y: this.y + 375, fontSize: 11 });
    canvas.drawText({ text: '(min 4 chars)', color: '#888888', x: this.x + 20, y: this.y + 390, fontSize: 9 });

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIRaceSelect;
