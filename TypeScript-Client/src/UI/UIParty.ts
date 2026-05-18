import NXManager from '../wz-utils/NXManager';
import { MapleStanceButton } from './MapleStanceButton';
import ClickManager from './ClickManager';
import GameCanvas from '../GameCanvas';
import SessionManager from '../SessionManager';
import { partyMembers } from './UIPartyHP';
import { PartyOperationPacket, DenyPartyRequestPacket, PartyOp } from '../Net/Packets/PartyPackets';
import MyCharacter from '../MyCharacter';

const UIParty = {
  isHidden: true,
  buttons:  [] as MapleStanceButton[],
  initialized: false,
  x: 430,
  y: 100,
  W: 200,
  H: 240,
  pendingInviteFrom: null as string | null,  // leader name when invited

  async initialize(canvas: GameCanvas) {
    const uiWin = await NXManager.get('UI.wz/UIWindow.img');
    const btClose = uiWin?.nGet('BtUIClose');
    if (btClose) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + this.W - 15, y: this.y + 2,
        img: btClose.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => this.hide(),
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Create party
    const btCreate = uiWin?.nGet('BtOK');
    if (btCreate) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 8, y: this.y + this.H - 50,
        img: btCreate.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => {
          if (!SessionManager.isConnected()) return;
          if (partyMembers.length > 0) {
            // Already in party — leave
            new PartyOperationPacket(PartyOp.LEAVE).dispatch();
          } else {
            new PartyOperationPacket(PartyOp.CREATE).dispatch();
          }
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    // Invite player
    const btInvite = uiWin?.nGet('BtNo');
    if (btInvite) {
      const btn = new MapleStanceButton(canvas, {
        x: this.x + 100, y: this.y + this.H - 50,
        img: btInvite.nChildren,
        isRelativeToCamera: true, isPartOfUI: true, isHidden: true,
        onClick: () => {
          if (!SessionManager.isConnected()) return;
          const name = prompt('Enter player name to invite:');
          if (!name) return;
          // Server finds charId by name — use name-based invite
          const pkt = new PartyOperationPacket(PartyOp.INVITE);
          // write name manually since PartyOperationPacket only writes charId
          // For name-based invite, server expects: writeByte(INVITE) + writeString(name)
          import('../Net/OutPacket').then(({ OutPacket, OutPacketOpcode }) => {
            const p = new OutPacket(OutPacketOpcode.PARTY_OPERATION);
            (p as any).writeByte(PartyOp.INVITE);
            (p as any).writeString(name);
            p.dispatch();
          });
        },
      });
      ClickManager.addButton(btn);
      this.buttons.push(btn);
    }

    this.initialized = true;
  },

  show(canvas?: GameCanvas) {
    if (!this.initialized && canvas) this.initialize(canvas);
    this.isHidden = false;
    this.buttons.forEach((b) => (b.isHidden = false));
  },
  hide() { this.isHidden = true; this.buttons.forEach((b) => (b.isHidden = true)); },
  toggle(canvas?: GameCanvas) { if (this.isHidden) this.show(canvas); else this.hide(); },

  // Call when server sends party invite
  showInvite(leaderName: string) {
    this.pendingInviteFrom = leaderName;
  },

  draw(canvas: GameCanvas) {
    if (this.isHidden) return;

    canvas.drawRect({ x: this.x, y: this.y, width: this.W, height: this.H,
      color: '#14142B', alpha: 0.95, strokeColor: '#556688', strokeWidth: 1 });

    canvas.drawText({ text: 'Party', color: '#FFDD88', x: this.x + 10, y: this.y + 14, fontSize: 13 });

    // Pending invite
    if (this.pendingInviteFrom) {
      canvas.drawText({ text: `${this.pendingInviteFrom} invites you!`, color: '#FFAAAA', x: this.x + 8, y: this.y + 35, fontSize: 10 });
      canvas.drawText({ text: '[Y] Accept  [N] Decline', color: '#AAAACC', x: this.x + 8, y: this.y + 48, fontSize: 9 });
    }

    // Party members
    if (partyMembers.length === 0) {
      canvas.drawText({ text: 'Not in a party', color: '#888888', x: this.x + 40, y: this.y + 80, fontSize: 11 });
    } else {
      partyMembers.forEach((m, i) => {
        const my = this.y + 35 + i * 26;
        const isMe = m.charId === MyCharacter.id;
        const online = m.channel >= 0;
        if (isMe) canvas.drawRect({ x: this.x + 4, y: my - 2, width: this.W - 8, height: 22,
          color: '#5064A0', alpha: 0.5 });
        canvas.drawCircle({ x: this.x + 12, y: my + 8, radius: 4,
          color: online ? '#88FF88' : '#888888' });
        canvas.drawText({ text: m.name, color: online ? '#FFFFFF' : '#888888', x: this.x + 20, y: my + 11, fontSize: 11 });
        canvas.drawText({ text: `Lv.${m.level}`, color: '#AAAACC', x: this.x + 140, y: my + 11, fontSize: 9 });
      });
    }

    // Button labels
    const inParty = partyMembers.length > 0;
    canvas.drawText({ text: inParty ? 'Leave' : 'Create', color: '#CCCCFF', x: this.x + 12, y: this.y + this.H - 35, fontSize: 9 });
    if (inParty) {
      canvas.drawText({ text: 'Invite', color: '#CCCCFF', x: this.x + 110, y: this.y + this.H - 35, fontSize: 9 });
    }

    this.buttons.forEach((b) => b.draw(canvas, { x: 0, y: 0 } as any, 0, 0, 0));
  },
};

export default UIParty;
