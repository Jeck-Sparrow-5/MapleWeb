import MapleCharacter from '../MapleCharacter';
import Stats from '../Stats/Stats';
import Inventory from '../Inventory/Inventory';
import { JobsMainType } from '../Constants/Jobs';
import { Character } from '../Net/Models/Character';
import GameCanvas from '../GameCanvas';
import { CameraInterface } from '../Camera';

// Cache of MapleCharacter preview instances keyed by characterId
const previewCache = new Map<number, MapleCharacter>();

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
      Hair: char.look.hair,
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
    mc.Hair = char.look.hair;
    mc.gender = char.look.gender;

    await mc.load();
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

  // Temporarily set position to the slot world coords
  const origX = mc.pos?.x ?? 0;
  const origY = mc.pos?.y ?? 0;
  if (mc.pos) { mc.pos.x = worldX; mc.pos.y = worldY; }

  mc.update(msPerTick);
  mc.draw(canvas, camera, 0, msPerTick, 0);

  if (mc.pos) { mc.pos.x = origX; mc.pos.y = origY; }
}
