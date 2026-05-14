import { NXNode } from './NXNode';
import { lz4Decompress } from './lz4';

// PKG4 binary format parser
export class NXReader {
  private readonly v: DataView;
  private readonly b: Uint8Array;

  private nodeCount = 0;
  private nodeBlockOffset = 0;
  private strCount = 0;
  private strBlockOffset = 0;
  private bmpCount = 0;
  private bmpBlockOffset = 0;
  private audCount = 0;
  private audBlockOffset = 0;

  private strings: string[] = [];
  private bmpOffsets: number[] = [];
  private audOffsets: number[] = [];

  constructor(buf: ArrayBuffer) {
    this.v = new DataView(buf);
    this.b = new Uint8Array(buf);
  }

  // uint64 as JS number — safe up to ~8 TB file size
  private u64(pos: number): number {
    const lo = this.v.getUint32(pos, true);
    const hi = this.v.getUint32(pos + 4, true);
    return hi * 0x100000000 + lo;
  }

  parse(): NXNode {
    const magic = String.fromCharCode(this.b[0], this.b[1], this.b[2], this.b[3]);
    if (magic !== 'PKG4') throw new Error(`Not an NX file (magic: "${magic}")`);

    this.nodeCount       = this.v.getUint32(4, true);
    this.nodeBlockOffset = this.u64(8);
    this.strCount        = this.v.getUint32(16, true);
    this.strBlockOffset  = this.u64(20);
    this.bmpCount        = this.v.getUint32(28, true);
    this.bmpBlockOffset  = this.u64(32);
    this.audCount        = this.v.getUint32(40, true);
    this.audBlockOffset  = this.u64(44);

    this.loadStrings();
    this.loadBmpOffsets();
    this.loadAudOffsets();
    return this.buildTree();
  }

  private loadStrings(): void {
    const dec = new TextDecoder('utf-8');
    for (let i = 0; i < this.strCount; i++) {
      const off = this.u64(this.strBlockOffset + i * 8);
      const len = this.v.getUint16(off, true);
      this.strings.push(dec.decode(this.b.subarray(off + 2, off + 2 + len)));
    }
  }

  private loadBmpOffsets(): void {
    for (let i = 0; i < this.bmpCount; i++) {
      this.bmpOffsets.push(this.u64(this.bmpBlockOffset + i * 8));
    }
  }

  private loadAudOffsets(): void {
    for (let i = 0; i < this.audCount; i++) {
      this.audOffsets.push(this.u64(this.audBlockOffset + i * 8));
    }
  }

  private buildTree(): NXNode {
    // Pass 1: create nodes
    const nodes: NXNode[] = new Array(this.nodeCount);
    const firstChild: number[] = new Array(this.nodeCount);
    const childCount: number[] = new Array(this.nodeCount);

    for (let i = 0; i < this.nodeCount; i++) {
      const base = this.nodeBlockOffset + i * 20;
      const node = new NXNode();
      node._reader = this;
      node.nName   = this.strings[this.v.getUint32(base, true)] ?? '';

      firstChild[i] = this.v.getUint32(base + 4, true);
      childCount[i] = this.v.getUint16(base + 8, true);
      const type    = this.v.getUint16(base + 10, true);

      switch (type) {
        case 0: // None
          node.nTagName = 'none';
          break;
        case 1: // Int64
          node.nTagName = 'int';
          node.nValue = this.v.getInt32(base + 12, true)
                      + this.v.getInt32(base + 16, true) * 0x100000000;
          break;
        case 2: // Double
          node.nTagName = 'double';
          node.nValue = this.v.getFloat64(base + 12, true);
          break;
        case 3: // String
          node.nTagName = 'string';
          node.nValue = this.strings[this.v.getUint32(base + 12, true)] ?? '';
          break;
        case 4: // Vector
          node.nTagName = 'vector';
          node.nX = this.v.getInt32(base + 12, true);
          node.nY = this.v.getInt32(base + 16, true);
          break;
        case 5: // Bitmap / canvas
          node.nTagName      = 'canvas';
          node._bitmapIndex  = this.v.getUint32(base + 12, true);
          node.nWidth        = this.v.getUint16(base + 16, true);
          node.nHeight       = this.v.getUint16(base + 18, true);
          break;
        case 6: // Audio
          node.nTagName     = 'audio';
          node._audioIndex  = this.v.getUint32(base + 12, true);
          node._audioLength = this.v.getUint32(base + 16, true);
          break;
      }

      nodes[i] = node;
    }

    // Pass 2: wire children (children are stored contiguously by firstChild id)
    for (let i = 0; i < this.nodeCount; i++) {
      const parent = nodes[i];
      const first  = firstChild[i];
      const count  = childCount[i];

      for (let j = 0; j < count; j++) {
        const child = nodes[first + j];
        child.nParent = parent;
        parent.nChildren.push(child);
        parent[child.nName] = child; // direct property access, same as WZNode
      }
    }

    return nodes[0]; // node 0 is always root
  }

  decodeBitmap(index: number, w: number, h: number): HTMLImageElement {
    const off = this.bmpOffsets[index];
    const compLen = this.v.getUint32(off, true);
    const raw = lz4Decompress(this.b.subarray(off + 4, off + 4 + compLen), w * h * 4);

    // BGRA → RGBA
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i]     = raw[i + 2]; // R
      rgba[i + 1] = raw[i + 1]; // G
      rgba[i + 2] = raw[i];     // B
      rgba[i + 3] = raw[i + 3]; // A
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.putImageData(new ImageData(rgba, w, h), 0, 0);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  decodeAudio(index: number, length: number): HTMLAudioElement {
    const off = this.audOffsets[index];
    const data = this.b.subarray(off, off + length);
    const blob = new Blob([data], { type: 'audio/mpeg' });
    return new Audio(URL.createObjectURL(blob));
  }
}
