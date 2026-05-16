import NXManager from './NXManager';

const nameCache = new Map<number, string>();
const loadedCategories = new Set<string>();

function categoryFile(itemId: number): { wz: string; cat: string } {
  const s = String(itemId);
  const first = s[0];
  if (first === '1') return { wz: 'String.wz/Eqp.img',     cat: 'eqp' };
  if (first === '2') return { wz: 'String.wz/Consume.img',  cat: 'consume' };
  if (first === '3') return { wz: 'String.wz/Ins.img',      cat: 'ins' };
  if (first === '4') return { wz: 'String.wz/Etc.img',      cat: 'etc' };
  if (first === '5') return { wz: 'String.wz/Cash.img',     cat: 'cash' };
  return { wz: 'String.wz/Etc.img', cat: 'etc' };
}

async function loadCategory(wzPath: string, cat: string): Promise<void> {
  if (loadedCategories.has(cat)) return;
  loadedCategories.add(cat);
  try {
    const node = await NXManager.get(wzPath);
    if (!node) return;
    // Eqp.img has sub-categories (Eqp/Cap/xxx), others are flat
    const walkNode = (n: any) => {
      if (!n?.nChildren) return;
      n.nChildren.forEach((child: any) => {
        const id = parseInt(child.nName);
        if (!isNaN(id)) {
          const name = child.name?.nValue ?? child.nGet?.('name')?.nValue ?? '';
          if (name) nameCache.set(id, name);
        } else {
          walkNode(child); // recurse into sub-categories (Eqp)
        }
      });
    };
    walkNode(node);
  } catch (_) {}
}

export async function getItemName(itemId: number): Promise<string> {
  if (nameCache.has(itemId)) return nameCache.get(itemId)!;
  const { wz, cat } = categoryFile(itemId);
  await loadCategory(wz, cat);
  return nameCache.get(itemId) ?? `Item ${itemId}`;
}

export function getItemNameSync(itemId: number): string {
  if (nameCache.has(itemId)) return nameCache.get(itemId)!;
  const { wz, cat } = categoryFile(itemId);
  loadCategory(wz, cat); // fire-and-forget
  return `Item ${itemId}`;
}

const skillNameCache = new Map<number, string>();
let skillNamesLoaded = false;

async function loadSkillNames(): Promise<void> {
  if (skillNamesLoaded) return;
  skillNamesLoaded = true;
  try {
    const node = await NXManager.get('String.wz/Skill.img');
    if (!node?.nChildren) return;
    node.nChildren.forEach((child: any) => {
      const id = parseInt(child.nName);
      if (!isNaN(id)) {
        const name = child.name?.nValue ?? child.nGet?.('name')?.nValue ?? '';
        if (name) skillNameCache.set(id, name);
      }
    });
  } catch (_) {}
}

export function getSkillNameSync(skillId: number): string {
  if (skillNameCache.has(skillId)) return skillNameCache.get(skillId)!;
  loadSkillNames(); // fire-and-forget
  return '';
}
