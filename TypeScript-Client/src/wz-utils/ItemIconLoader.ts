import WZManager from './WZManager';

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
      const node = await WZManager.get(`Item.wz/${category}/${fileCode}.img`);
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
