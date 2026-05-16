import NXManager from './NXManager';

// itemId → HTMLImageElement (or null if not found)
const iconCache = new Map<number, any>();
const pending = new Map<number, Promise<any>>();

function categoryFor(itemId: number): string {
  const prefix = Math.floor(itemId / 1000000);
  switch (prefix) {
    case 2: return 'Consume';
    case 3: return 'Install';
    case 4: return 'Etc';
    case 5: return 'Cash';
    default: return 'Etc';
  }
}

export async function loadItemIcon(itemId: number): Promise<any> {
  if (iconCache.has(itemId)) return iconCache.get(itemId);
  if (pending.has(itemId)) return pending.get(itemId);

  const p = (async () => {
    try {
      const category = categoryFor(itemId);
      const fileCode = Math.floor(itemId / 10000).toString().padStart(4, '0');
      const itemStr = itemId.toString().padStart(8, '0');
      const node = await NXManager.get(`Item.wz/${category}/${fileCode}.img`);
      const itemNode = node?.nGet(itemStr);
      const info = itemNode?.nGet('info');
      const icon = info?.nGet('iconRaw')?.nGetImage?.() ?? info?.nGet('icon')?.nGetImage?.() ?? null;
      iconCache.set(itemId, icon);
      return icon;
    } catch (_) {
      iconCache.set(itemId, null);
      return null;
    } finally {
      pending.delete(itemId);
    }
  })();

  pending.set(itemId, p);
  return p;
}

// Sync get — returns cached value or null (triggers async load as side-effect)
export function getItemIconSync(itemId: number): any {
  if (iconCache.has(itemId)) return iconCache.get(itemId);
  loadItemIcon(itemId); // fire-and-forget
  return null;
}

// ─── Skill icons ──────────────────────────────────────────────────────────────
const skillIconCache = new Map<number, any>();
const skillIconPending = new Map<number, Promise<any>>();

async function loadSkillIcon(skillId: number): Promise<any> {
  if (skillIconCache.has(skillId)) return skillIconCache.get(skillId);
  if (skillIconPending.has(skillId)) return skillIconPending.get(skillId);

  const p = (async () => {
    try {
      const fileCode = Math.floor(skillId / 10000).toString().padStart(3, '0');
      const node = await NXManager.get(`Skill.wz/${fileCode}.img/skill/${skillId}/icon`);
      const img = node?.nGetImage?.() ?? null;
      skillIconCache.set(skillId, img);
      return img;
    } catch (_) {
      skillIconCache.set(skillId, null);
      return null;
    } finally {
      skillIconPending.delete(skillId);
    }
  })();

  skillIconPending.set(skillId, p);
  return p;
}

export function getSkillIconSync(skillId: number): any {
  if (skillIconCache.has(skillId)) return skillIconCache.get(skillId);
  loadSkillIcon(skillId); // fire-and-forget
  return null;
}
