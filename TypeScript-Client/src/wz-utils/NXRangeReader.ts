import { NXNode } from './NXNode';
import { lz4Decompress } from './lz4';

function u64(v: DataView, pos: number): number {
  return v.getUint32(pos + 4, true) * 0x100000000 + v.getUint32(pos, true);
}

// Parses PKG4 NX files using HTTP Range requests.
//
// Strategy:
//   Eager:  header, node block (raw bytes), string data, bitmap/audio offset tables
//   Lazy:   NXNode objects (created only when a node is first navigated to)
//           Bitmaps and audio (fetched per-asset on first nGetImage / nGetAudio call)
//
// For Map.nx (1.4 GB, 3.4M nodes) only ~71 MB of metadata is fetched upfront.
// Individual map sprites are fetched on demand as the player navigates the world.
export class NXRangeReader {
  readonly url: string;

  private strOff  = 0;
  private bmpOff  = 0;
  private audOff  = 0;
  private nodeOff = 0;

  private nodeBuf!: DataView;            // raw 20-byte node records
  private strings: string[] = [];
  private bmpOffsets: number[] = [];
  private audOffsets: number[] = [];

  // Cache: node index → NXNode wrapper (created on first access)
  private readonly cache = new Map<number, NXNode>();

  constructor(url: string) {
    this.url = url;
  }

  private async fetchRange(start: number, length: number): Promise<ArrayBuffer> {
    if (length <= 0) return new ArrayBuffer(0);
    const res = await fetch(this.url, {
      headers: { Range: `bytes=${start}-${start + length - 1}` },
    });
    if (res.status !== 206 && res.status !== 200) {
      throw new Error(`NX range fetch failed (${res.status}): ${this.url}`);
    }
    return res.arrayBuffer();
  }

  async parse(): Promise<NXNode> {
    // 1. Header (52 bytes)
    const hdrBuf = await this.fetchRange(0, 52);
    const hdr = new DataView(hdrBuf);
    const hb  = new Uint8Array(hdrBuf);

    const magic = String.fromCharCode(hb[0], hb[1], hb[2], hb[3]);
    if (magic !== 'PKG4') throw new Error(`Not an NX file: "${magic}" — ${this.url}`);

    const nodeCount = hdr.getUint32(4,  true);
    this.nodeOff    = u64(hdr, 8);
    const strCount  = hdr.getUint32(16, true);
    this.strOff     = u64(hdr, 20);
    const bmpCount  = hdr.getUint32(28, true);
    this.bmpOff     = u64(hdr, 32);
    const audCount  = hdr.getUint32(40, true);
    this.audOff     = u64(hdr, 44);

    // 2. Parallel: node block + string offset table + bitmap table + audio table
    const [rawNodes, strTableBuf, bmpTableBuf, audTableBuf] = await Promise.all([
      this.fetchRange(this.nodeOff, nodeCount * 20),
      strCount > 0 ? this.fetchRange(this.strOff, strCount * 8) : Promise.resolve(new ArrayBuffer(0)),
      bmpCount > 0 ? this.fetchRange(this.bmpOff, bmpCount * 8) : Promise.resolve(new ArrayBuffer(0)),
      audCount > 0 ? this.fetchRange(this.audOff, audCount * 8) : Promise.resolve(new ArrayBuffer(0)),
    ]);

    this.nodeBuf = new DataView(rawNodes);

    const bv = new DataView(bmpTableBuf);
    for (let i = 0; i < bmpCount; i++) this.bmpOffsets.push(u64(bv, i * 8));

    const av = new DataView(audTableBuf);
    for (let i = 0; i < audCount; i++) this.audOffsets.push(u64(av, i * 8));

    // 3. Strings — one range request using actual block boundaries
    this.strings = await this.loadStrings(new DataView(strTableBuf), strCount);

    return this.wrap(0, null);
  }

  private async loadStrings(tv: DataView, strCount: number): Promise<string[]> {
    if (strCount === 0) return [];

    const offsets: number[] = [];
    for (let i = 0; i < strCount; i++) offsets.push(u64(tv, i * 8));

    const minOff = Math.min(...offsets);

    // String block ends at the next block that comes after strOff
    const nexts = [this.nodeOff, this.bmpOff, this.audOff].filter(o => o > this.strOff);
    const strBlockEnd = nexts.length > 0 ? Math.min(...nexts) : minOff + strCount * 400;
    const size = Math.max(strBlockEnd - minOff, strCount * 4);

    const dataBuf   = await this.fetchRange(minOff, size);
    const dataView  = new DataView(dataBuf);
    const dataBytes = new Uint8Array(dataBuf);
    const dec       = new TextDecoder('utf-8', { fatal: false });

    return offsets.map(off => {
      const local = off - minOff;
      if (local < 0 || local + 2 > dataBuf.byteLength) return '';
      const len = dataView.getUint16(local, true);
      if (local + 2 + len > dataBuf.byteLength) return '';
      return dec.decode(dataBytes.subarray(local + 2, local + 2 + len));
    });
  }

  // Create or return cached NXNode for node at index i.
  // Children are built lazily via a getter; named properties on parent are
  // set the first time nChildren is accessed.
  private wrap(i: number, parent: NXNode | null): NXNode {
    const hit = this.cache.get(i);
    if (hit) return hit;

    const base = i * 20;
    const v    = this.nodeBuf;
    const node = new NXNode();
    node._reader = this;
    node.nName   = this.strings[v.getUint32(base, true)] ?? '';
    node.nParent = parent;

    const firstChild = v.getUint32(base + 4, true);
    const childCount = v.getUint16(base + 8, true);
    const type       = v.getUint16(base + 10, true);

    switch (type) {
      case 0: node.nTagName = 'none'; break;
      case 1:
        node.nTagName = 'int';
        // Int64 stored as two int32 — combine carefully
        node.nValue = v.getInt32(base + 12, true) + v.getInt32(base + 16, true) * 0x100000000;
        break;
      case 2:
        node.nTagName = 'double';
        node.nValue   = v.getFloat64(base + 12, true);
        break;
      case 3:
        node.nTagName = 'string';
        node.nValue   = this.strings[v.getUint32(base + 12, true)] ?? '';
        break;
      case 4:
        node.nTagName = 'vector';
        node.nX       = v.getInt32(base + 12, true);
        node.nY       = v.getInt32(base + 16, true);
        break;
      case 5:
        node.nTagName     = 'canvas';
        node._bitmapIndex = v.getUint32(base + 12, true);
        node.nWidth       = v.getUint16(base + 16, true);
        node.nHeight      = v.getUint16(base + 18, true);
        break;
      case 6:
        node.nTagName     = 'audio';
        node._audioIndex  = v.getUint32(base + 12, true);
        node._audioLength = v.getUint32(base + 16, true);
        break;
    }

    // Lazy children: build NXNode wrappers + named properties on first nChildren access
    const self = this;
    let childArr: NXNode[] | null = null;

    Object.defineProperty(node, 'nChildren', {
      get(): NXNode[] {
        if (!childArr) {
          childArr = [];
          for (let j = 0; j < childCount; j++) {
            const child = self.wrap(firstChild + j, node);
            childArr.push(child);
            // Set named property so node.foo works without going through nChildren again
            if (!(child.nName in node)) node[child.nName] = child;
          }
        }
        return childArr;
      },
      set(v: NXNode[]) { childArr = v; },
      configurable: true,
      enumerable: true,
    });

    // For nodes with small child counts that are almost always fully iterated
    // (animation frames, layer objects), eagerly build children now to avoid
    // getter overhead on hot draw paths.
    if (childCount > 0 && childCount <= 32) {
      // Triggers the getter defined above, which builds and caches childArr
      void node.nChildren;
    }

    this.cache.set(i, node);
    return node;
  }

  // ── Asset decoding ──────────────────────────────────────────────────────────

  async decodeBitmapAsync(index: number, w: number, h: number): Promise<HTMLImageElement> {
    if (index >= this.bmpOffsets.length || w === 0 || h === 0) return new Image();

    const off = this.bmpOffsets[index];
    // LZ4 compressed size ≤ uncompressed + uncompressed/255 + 16
    const maxComp = w * h * 4 + Math.ceil((w * h * 4) / 255) + 20;
    const buf     = await this.fetchRange(off, 4 + maxComp);
    const view    = new DataView(buf);
    const compLen = view.getUint32(0, true);
    const raw     = lz4Decompress(new Uint8Array(buf, 4, compLen), w * h * 4);

    // BGRA → RGBA
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i]     = raw[i + 2];
      rgba[i + 1] = raw[i + 1];
      rgba[i + 2] = raw[i];
      rgba[i + 3] = raw[i + 3];
    }

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d')!.putImageData(new ImageData(rgba, w, h), 0, 0);
    const img = new Image();
    img.src = cv.toDataURL();
    return img;
  }

  async decodeAudioAsync(index: number, length: number): Promise<HTMLAudioElement> {
    if (index >= this.audOffsets.length || length === 0) return new Audio();

    const off = this.audOffsets[index];
    const buf = await this.fetchRange(off, length);
    let data  = new Uint8Array(buf);

    let mime = '';
    let skip = 0;
    const scanLen = Math.min(512, data.length - 4);

    // OGG has a very distinctive 4-byte magic — scan for it first
    for (let i = 0; i < scanLen; i++) {
      if (data[i] === 0x4F && data[i+1] === 0x67 && data[i+2] === 0x67 && data[i+3] === 0x53) {
        skip = i; mime = 'audio/ogg'; break;
      }
    }
    if (!mime) {
      for (let i = 0; i < scanLen; i++) {
        if (data[i] === 0x49 && data[i+1] === 0x44 && data[i+2] === 0x33) { skip = i; mime = 'audio/mpeg'; break; }
        if (data[i] === 0xFF && (data[i+1] & 0xE0) === 0xE0) { skip = i; mime = 'audio/mpeg'; break; }
      }
    }
    if (!mime) return new Audio();

    if (skip > 0) data = data.subarray(skip);
    const blob = new Blob([data], { type: mime });
    return new Audio(URL.createObjectURL(blob));
  }
}
