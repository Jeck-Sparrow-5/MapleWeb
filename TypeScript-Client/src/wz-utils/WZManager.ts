import { NXNode } from './NXNode';
import { NXReader } from './NXReader';

// Cache: nx file name (e.g. "Map") → parsed root NXNode
const fileCache = new Map<string, NXNode>();

function nxName(path: string): string {
  // "Map.wz/Back/forest.img" → "Map"
  return path.split('/')[0].replace(/\.wz$/, '');
}

async function fetchNX(name: string): Promise<NXNode> {
  if (fileCache.has(name)) return fileCache.get(name)!;
  const res = await fetch(`wz_client/${name}.nx`);
  if (!res.ok) throw new Error(`NX not found: ${name}.nx`);
  const root = new NXReader(await res.arrayBuffer()).parse();
  fileCache.set(name, root);
  return root;
}

function navigate(root: NXNode, parts: string[]): any {
  let node: any = root;
  for (const part of parts) {
    if (node == null) return undefined;
    // Try exact name first, then strip .img suffix (some converters drop it)
    node = node[part] ?? node[part.replace(/\.img$/, '')];
  }
  return node;
}

const WZManager = {
  initialize(): void {
    fileCache.clear();
  },

  // Kept for API compatibility — NX loads the whole file, so this is a prefetch
  async load(filename: string): Promise<void> {
    await fetchNX(nxName(filename));
  },

  pathExists(thePath: string): boolean {
    const parts = thePath.split('/');
    const name = parts[0].replace(/\.wz$/, '');
    if (!fileCache.has(name)) return false;
    return navigate(fileCache.get(name)!, parts.slice(1)) !== undefined;
  },

  async get(thePath: string): Promise<any> {
    const parts = thePath.split('/');
    const name = parts[0].replace(/\.wz$/, '');
    const root = await fetchNX(name);
    return navigate(root, parts.slice(1));
  },
};

export default WZManager;
