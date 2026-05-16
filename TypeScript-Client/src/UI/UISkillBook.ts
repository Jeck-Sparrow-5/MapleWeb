import NXManager from '../wz-utils/NXManager';
import TooltipRenderer from './TooltipRenderer';
import UISkillHotbar, { assignSkillToSelectedSlot } from './UISkillHotbar';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import DragableMenu from './Menu/DragableMenu';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import MyCharacter from '../MyCharacter';
import { JobsType } from '../Constants/Jobs';
import { Position } from '../Effects/DamageIndicator';
import DistributeSpPacket from '../Net/Packets/DistributeSpPacket';
import SessionManager from '../SessionManager';

// Skill levels: skillId → level
export const skillLevels: Map<number, number> = new Map();
export const skillSPTotal: { sp: number } = { sp: 0 };

function jobTypeToSkillFiles(job: JobsType): string[] {
  const map: Record<string, string[]> = {
    [JobsType.Begginer]:               ['000'],
    [JobsType.Swordman]:               ['000', '100'],
    [JobsType.Fighter]:                ['000', '100', '110'],
    [JobsType.Crusader]:               ['000', '100', '110', '111'],
    [JobsType.Hero]:                   ['000', '100', '110', '111', '112'],
    [JobsType.Page]:                   ['000', '100', '120'],
    [JobsType.WhiteKnight]:            ['000', '100', '120', '121'],
    [JobsType.Paladin]:                ['000', '100', '120', '121', '122'],
    [JobsType.Spearman]:               ['000', '100', '130'],
    [JobsType.DragonKnight]:           ['000', '100', '130', '131'],
    [JobsType.DarkKnight]:             ['000', '100', '130', '131', '132'],
    [JobsType.Magician]:               ['000', '200'],
    [JobsType.FirePoisonWizard]:       ['000', '200', '210'],
    [JobsType.FirePoisonMage]:         ['000', '200', '210', '211'],
    [JobsType.FirePoisonArchMage]:     ['000', '200', '210', '211', '212'],
    [JobsType.IceLightningWizard]:     ['000', '200', '220'],
    [JobsType.IceLightningMage]:       ['000', '200', '220', '221'],
    [JobsType.IceLightningArchMage]:   ['000', '200', '220', '221', '222'],
    [JobsType.Cleric]:                 ['000', '200', '230'],
    [JobsType.Priest]:                 ['000', '200', '230', '231'],
    [JobsType.Bishop]:                 ['000', '200', '230', '231', '232'],
    [JobsType.Archer]:                 ['000', '300'],
    [JobsType.Hunter]:                 ['000', '300', '310'],
    [JobsType.Ranger]:                 ['000', '300', '310', '311'],
    [JobsType.Bowmaster]:              ['000', '300', '310', '311', '312'],
    [JobsType.Crossbowman]:            ['000', '300', '320'],
    [JobsType.Sniper]:                 ['000', '300', '320', '321'],
    [JobsType.Marksman]:               ['000', '300', '320', '321', '322'],
    [JobsType.Thief]:                  ['000', '400'],
    [JobsType.Assassin]:               ['000', '400', '410'],
    [JobsType.Hermit]:                 ['000', '400', '410', '411'],
    [JobsType.NightLord]:              ['000', '400', '410', '411', '412'],
    [JobsType.Bandit]:                 ['000', '400', '420'],
    [JobsType.ChiefBandit]:            ['000', '400', '420', '421'],
    [JobsType.Shadower]:               ['000', '400', '420', '421', '422'],
    [JobsType.Rogue]:                  ['000', '500'],
    [JobsType.Brawler]:                ['000', '500', '510'],
    [JobsType.Marauder]:               ['000', '500', '510', '511'],
    [JobsType.Buccaneer]:              ['000', '500', '510', '511', '512'],
    [JobsType.Gunslinger]:             ['000', '500', '520'],
    [JobsType.Outlaw]:                 ['000', '500', '520', '521'],
    [JobsType.Corsair]:                ['000', '500', '520', '521', '522'],
  };
  return map[job as string] ?? ['000'];
}

interface SkillEntry {
  id: number;
  icon: any;
  iconDisabled: any;
  name: string;
  desc: string;
  maxLevel: number;
  isPassive: boolean;
}

class UISkillBook extends DragableMenu {
  bgImg: any = null;
  btSpUp: any[] = [];
  skills: SkillEntry[] = [];
  buttons: MapleStanceButton[] = [];
  loaded = false;
  scroll = 0;
  _dirty = false;
  readonly W = 175;
  readonly H = 289;

  markDirty() { this._dirty = true; }

  static async fromOpts(opts: any) {
    const o = new UISkillBook(opts);
    await o.load(opts.canvas);
    return o;
  }

  async load(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    this.bgImg = uiWin?.nGet('Skill')?.nGet('backgrnd')?.nGetImage?.() ?? null;

    const btSpUpNode = uiWin?.nGet('BtSpUp');

    const jobType = MyCharacter.stats.jobType as JobsType;
    const files = jobTypeToSkillFiles(jobType);

    // Load String.wz/Skill.img for names and descriptions
    let skillNames: Record<string, string> = {};
    let skillDescs: Record<string, string> = {};
    try {
      const strNode = await NXManager.get('String.wz/Skill.img');
      if (strNode) {
        strNode.nChildren?.forEach((job: any) => {
          job.nChildren?.forEach((sk: any) => {
            skillNames[sk.nName] = sk.name?.nValue ?? sk.nGet?.('name')?.nValue ?? '';
            skillDescs[sk.nName] = sk.desc?.nValue ?? sk.nGet?.('desc')?.nValue ?? '';
          });
        });
      }
    } catch (_) {}

    // Load skills from Skill.wz
    for (const fileCode of files) {
      try {
        const node = await NXManager.get(`Skill.wz/${fileCode}.img`);
        const skillNode = node?.nGet?.('skill');
        if (!skillNode) continue;
        skillNode.nChildren?.forEach((sk: any) => {
          const id = parseInt(sk.nName);
          if (isNaN(id)) return;
          const icon         = sk.nGet?.('icon')?.nGetImage?.() ?? null;
          const iconDisabled = sk.nGet?.('iconDisabled')?.nGetImage?.() ?? null;
          const name         = skillNames[sk.nName] ?? `Skill ${id}`;
          const desc         = skillDescs[sk.nName] ?? '';
          const masterLevel  = parseInt(sk.nGet?.('masterLevel')?.nValue ?? sk.nGet?.('info')?.nGet?.('masterLevel')?.nValue ?? '0');
          // Skills with maxLevel = 0 or tagged passive in info are passive
          const isPassive    = masterLevel === 0 || !!(sk.nGet?.('info')?.nGet?.('passive'));
          this.skills.push({ id, icon, iconDisabled, name, desc, maxLevel: masterLevel, isPassive });
        });
      } catch (_) {}
    }

    // Close button
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

    // SP Up buttons (one per visible skill row, reused by scroll)
    if (btSpUpNode) {
      for (let i = 0; i < 8; i++) {
        const rowIndex = i;
        const btn = new MapleStanceButton(canvas, {
          x: this.x + this.W - 25,
          y: this.y + 50 + rowIndex * 30,
          img: btSpUpNode.nChildren,
          isRelativeToCamera: true,
          isPartOfUI: true,
          onClick: () => {
            const sk = this.skills[this.scroll + rowIndex];
            if (!sk || sk.isPassive || skillSPTotal.sp <= 0) return;
            const cur = skillLevels.get(sk.id) ?? 0;
            if (sk.maxLevel > 0 && cur >= sk.maxLevel) return;
            skillLevels.set(sk.id, cur + 1);
            skillSPTotal.sp--;
            if (SessionManager.isConnected()) {
              new DistributeSpPacket(sk.id).dispatch();
            }
          },
        });
        ClickManager.addButton(btn);
        this.buttons.push(btn);
        this.btSpUp.push(btn);
      }
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

  update(_ms: number) {
    if (this._dirty) {
      this._dirty = false;
      this.reloadSkillLevels();
    }
  }

  reloadSkillLevels() {
    // Refresh skill entries to pick up any new skills from skillLevels
    // (handles class advancement — new skillIds appear in the map)
    const knownIds = new Set(this.skills.map(s => s.id));
    for (const [id] of skillLevels) {
      if (!knownIds.has(id)) {
        // New skill not in current list — do a full reload next time load() is called
        this.loaded = false;
        this.load((document.getElementById('game') as any)).then(() => {
          this.loaded = true;
        }).catch(() => { this.loaded = true; });
        return;
      }
    }
  }

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

    canvas.drawText({ text: 'Skill Book', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 12 });
    canvas.drawText({ text: `SP: ${skillSPTotal.sp}`, color: '#AAFFAA', x: this.x + this.W - 55, y: this.y + 14, fontSize: 11 });

    const visibleSkills = this.skills.slice(this.scroll, this.scroll + 8);
    visibleSkills.forEach((sk, i) => {
      const sy = this.y + 30 + i * 30;
      const sx = this.x + 8;
      const lvl = skillLevels.get(sk.id) ?? 0;
      const iconToDraw = (sk.isPassive && lvl === 0) ? (sk.iconDisabled ?? sk.icon) : sk.icon;

      if (iconToDraw) {
        canvas.context.save();
        if (sk.isPassive) canvas.context.globalAlpha = 0.7;
        canvas.context.drawImage(iconToDraw, sx, sy - 14, 26, 26);
        canvas.context.restore();
      } else {
        canvas.context.save();
        canvas.context.fillStyle = sk.isPassive ? '#223344' : '#334455';
        canvas.context.fillRect(sx, sy - 14, 26, 26);
        canvas.context.restore();
      }

      const maxStr = sk.maxLevel > 0 ? ` (${lvl}/${sk.maxLevel})` : '';
      const nameColor = sk.isPassive ? '#AAAACC' : '#FFFFFF';
      canvas.drawText({ text: (sk.name + maxStr).substring(0, 22), color: nameColor, x: sx + 30, y: sy - 2, fontSize: 10 });
      if (sk.isPassive) {
        canvas.drawText({ text: 'Passive', color: '#777788', x: sx + 30, y: sy + 10, fontSize: 8 });
      } else {
        canvas.drawText({ text: `Lv.${lvl}`, color: '#AAAAFF', x: sx + 30, y: sy + 10, fontSize: 9 });
      }
    });

    // Scroll arrows
    if (this.scroll > 0) {
      canvas.drawText({ text: '▲', color: '#FFFFFF', x: this.x + this.W / 2 - 5, y: this.y + 28, fontSize: 10 });
    }
    if (this.scroll + 8 < this.skills.length) {
      canvas.drawText({ text: '▼', color: '#FFFFFF', x: this.x + this.W / 2 - 5, y: this.y + this.H - 6, fontSize: 10 });
    }

    this.buttons.forEach((b) => b.draw(canvas, camera, lag, ms, td));

    // Right-click skill → assign to selected hotbar slot
    const mx = (canvas as any).mouseX;
    const my = (canvas as any).mouseY;
    if ((canvas as any).rightClicked && mx !== undefined) {
      const visibleSkillsR = this.skills.slice(this.scroll, this.scroll + 8);
      visibleSkillsR.forEach((sk, i) => {
        const sy = this.y + 30 + i * 30;
        if (mx >= this.x + 8 && mx < this.x + this.W - 30 && my >= sy - 14 && my < sy + 16) {
          assignSkillToSelectedSlot(sk.id);
          // Preload icon into hotbar cache
          if (sk.icon) UISkillHotbar.slotIcons.set(sk.id, sk.icon);
        }
      });
    }

    // Skill tooltip on hover
    if (mx !== undefined) {
      const visibleSkills = this.skills.slice(this.scroll, this.scroll + 8);
      visibleSkills.forEach((sk, i) => {
        const sy = this.y + 30 + i * 30;
        if (mx >= this.x + 8 && mx < this.x + this.W - 30 && my >= sy - 14 && my < sy + 16) {
          const lvl = skillLevels.get(sk.id) ?? 0;
          const descLine = sk.desc ? sk.desc.substring(0, 60) : '';
          TooltipRenderer.show([
            { text: sk.name, color: '#FFDD88' },
            { text: sk.isPassive ? 'Passive Skill' : `Lv.${lvl} / Max ${sk.maxLevel}`, color: sk.isPassive ? '#AAAACC' : '#AADDFF' },
            ...(descLine ? [{ text: descLine, color: '#CCCCCC' }] : []),
          ], mx, my);
        }
      });
    }
  }
}

export default UISkillBook;
