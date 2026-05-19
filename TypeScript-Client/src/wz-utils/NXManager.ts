import { NXNode } from './NXNode';
import { NXRangeReader } from './NXRangeReader';
import { setLoadingProgress } from '../LoadingProgress';

const fileCache = new Map<string, NXNode>();
let _nxPending = 0;
let _nxDone    = 0;

function nxName(path: string): string {
  return path.split('/')[0].replace(/\.wz$/, '');
}

async function fetchNX(name: string): Promise<NXNode> {
  if (fileCache.has(name)) return fileCache.get(name)!;
  _nxPending++;
  setLoadingProgress(
    (_nxDone / Math.max(_nxPending, 1)) * 18,
    `Fetching ${name}.nx…`
  );
  const url = `wz_client/${name}.nx`;
  const root = await new NXRangeReader(url).parse();
  fileCache.set(name, root);
  _nxDone++;
  setLoadingProgress(
    (_nxDone / Math.max(_nxPending, 1)) * 18,
    `Loaded ${name}.nx`
  );
  return root;
}

function navigate(root: NXNode, parts: string[]): any {
  let node: any = root;
  for (const part of parts) {
    if (node == null) return undefined;
    // NXNode is a Proxy — unknown property access auto-triggers child building
    node = node[part] ?? node[part.replace(/\.img$/, '')];
  }
  return node;
}

const NXManager = {
  initialize(): void { fileCache.clear(); },

  async load(filename: string): Promise<void> {
    await fetchNX(nxName(filename));
  },

  pathExists(path: string): boolean {
    const parts = path.split('/');
    const name = parts[0].replace(/\.wz$/, '');
    if (!fileCache.has(name)) return false;
    return navigate(fileCache.get(name)!, parts.slice(1)) !== undefined;
  },

  async get(path: string): Promise<any> {
    const parts = path.split('/');
    const name = parts[0].replace(/\.wz$/, '');
    const root = await fetchNX(name);
    return navigate(root, parts.slice(1));
  },
};

export default NXManager;
