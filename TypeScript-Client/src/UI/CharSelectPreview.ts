import MapleCharacter from '../MapleCharacter';
import Stats from '../Stats/Stats';
import Inventory from '../Inventory/Inventory';
import { JobsMainType } from '../Constants/Jobs';
import { Character } from '../Net/Models/Character';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';
import Randomizer from '../Tools/Randomizer';

// Cache of MapleCharacter preview instances keyed by characterId
const previewCache = new Map<number, MapleCharacter>();

// Blink state per character
const blinkState = new Map<number, { nextBlink: number; blinkEnd: number }>();

function updateBlink(id: number, mc: MapleCharacter): void {
  const now = Date.now();
  let state = blinkState.get(id);
  if (!state) {
    // Stagger initial blink per character so they don't all blink together
    state = { nextBlink: now + Randomizer.getRandomInteger(2000, 5000), blinkEnd: 0 };
    blinkState.set(id, state);
  }
  if (now < state.blinkEnd) {
    // cycle through blink frames 0→1→2 over the 150ms blink duration
    const elapsed = now - (state.blinkEnd - 150);
    const blinkFrame = Math.min(2, Math.floor(elapsed / 50));
    (mc as any).setFaceExpr?.('blink', blinkFrame);
  } else {
    (mc as any).setFaceExpr?.('default', 0);
    if (now >= state.nextBlink) {
      state.blinkEnd  = now + 150;
      state.nextBlink = now + Randomizer.getRandomInteger(3000, 6000);
    }
  }
}

export async function getPreview(char: Character): Promise<MapleCharacter | null> {
  const id = char.stat.characterId;
  if (previewCache.has(id)) return previewCache.get(id)!;

  try {
    const mc = new MapleCharacter({
      name: char.stat.characterName,
      hp: char.stat.hp,
      maxHp: char.stat.maxHp,
      mp: char.stat.mp,
      maxMp: char.stat.maxMp,
      exp: char.stat.exp,
      fame: 0,
      hair: char.look.hair,
      inventory: new Inventory({}),
      stats: new Stats({
        level: char.stat.level,
        job: JobsMainType.Begginer,
        jobType: 'Begginer',
        str: char.stat.str,
        dex: char.stat.dex,
        int: char.stat.int,
        luk: char.stat.luk,
        maxHp: char.stat.maxHp,
        maxMp: char.stat.maxMp,
      }),
    });

    mc.skinColor = char.look.skinColor;
    mc.face = char.look.face;
    mc.gender = char.look.gender;

    await mc.load();

    // Attach equipped items from character look
    for (const [slot, itemId] of char.look.eqSlots) {
      if (itemId > 0) {
        try { await mc.attachEquip(-slot, itemId); } catch (_) {}
      }
    }

    mc.setStance('stand1', 0, false, true);
    previewCache.set(id, mc);
    return mc;
  } catch (e) {
    console.warn('[CharSelectPreview] failed to load preview for', id, e);
    return null;
  }
}

export function clearCache() {
  previewCache.clear();
  blinkState.clear();
}

export async function drawPreview(
  canvas: GameCanvas,
  camera: CameraInterface,
  char: Character,
  worldX: number,
  worldY: number,
  msPerTick: number,
) {
  const mc = await getPreview(char);
  if (!mc) return;

  const origX = mc.pos?.x ?? 0;
  const origY = mc.pos?.y ?? 0;
  if (mc.pos) {
    mc.pos.x     = worldX;
    mc.pos.y     = worldY;
    mc.pos.fh    = true;   // stand1 stance
    mc.pos.left  = false;
    mc.pos.right = false;
  }
  mc.flipped = true; // face right (sprites default face left, flip = right)

  updateBlink(char.stat.characterId, mc);
  mc.draw(canvas, camera, 0, msPerTick, 0);

  if (mc.pos) { mc.pos.x = origX; mc.pos.y = origY; }
}
