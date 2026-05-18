import { NXNode } from './NXNode';
import { lz4Decompress } from './lz4';

// PKG4 binary format parser.
// Supports both standard PKG4 (bitmap/audio blocks) and the Maple.js/wz2nx
// variant that stores image and audio data as raw bytes inside the string block.
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
  private strBuf: Uint8Array[] = []; // raw bytes — needed for binary (image/audio) strings
  private bmpOffsets: number[] = [];
  private audOffsets: number[] = [];

  constructor(buf: ArrayBuffer) {
    this.v = new DataView(buf);
    this.b = new Uint8Array(buf);
  }

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
    if (this.bmpCount > 0) this.loadBmpOffsets();
    if (this.audCount > 0) this.loadAudOffsets();

    return this.buildTree();
  }

  private loadStrings(): void {
    const dec = new TextDecoder('utf-8', { fatal: false });
    for (let i = 0; i < this.strCount; i++) {
      const off = this.u64(this.strBlockOffset + i * 8);
      const len = this.v.getUint16(off, true);
      const bytes = this.b.subarray(off + 2, off + 2 + len);
      this.strings.push(dec.decode(bytes));
      this.strBuf.push(bytes); // keep raw bytes for PNG/audio binary entries
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
        case 0:
          node.nTagName = 'none';
          break;
        case 1:
          node.nTagName = 'int';
          node.nValue = this.v.getInt32(base + 12, true)
                      + this.v.getInt32(base + 16, true) * 0x100000000;
          break;
        case 2:
          node.nTagName = 'double';
          node.nValue = this.v.getFloat64(base + 12, true);
          break;
        case 3:
          node.nTagName = 'string';
          node.nValue = this.strings[this.v.getUint32(base + 12, true)] ?? '';
          break;
        case 4:
          node.nTagName = 'vector';
          node.nX = this.v.getInt32(base + 12, true);
          node.nY = this.v.getInt32(base + 16, true);
          break;
        case 5:
          node.nTagName     = 'canvas';
          node._bitmapIndex = this.v.getUint32(base + 12, true);
          node.nWidth       = this.v.getUint16(base + 16, true);
          node.nHeight      = this.v.getUint16(base + 18, true);
          break;
        case 6:
          node.nTagName     = 'audio';
          node._audioIndex  = this.v.getUint32(base + 12, true);
          node._audioLength = this.v.getUint32(base + 16, true);
          break;
      }

      nodes[i] = node;
    }

    for (let i = 0; i < this.nodeCount; i++) {
      const parent = nodes[i];
      const first  = firstChild[i];
      const count  = childCount[i];
      for (let j = 0; j < count; j++) {
        const child = nodes[first + j];
        child.nParent = parent;
        parent.nChildren.push(child);
        parent[child.nName] = child;
      }
    }

    return nodes[0];
  }

  decodeBitmap(index: number, w: number, h: number): HTMLImageElement {
    if (this.bmpCount > 0) {
      // Standard PKG4: LZ4-compressed BGRA in bitmap block
      const off = this.bmpOffsets[index];
      const compLen = this.v.getUint32(off, true);
      const raw = lz4Decompress(this.b.subarray(off + 4, off + 4 + compLen), w * h * 4);
      return this._bgraToImage(raw, w, h);
    }

    // Maple.js/wz2nx: image data stored as raw bytes in string block
    const raw = this.strBuf[index];
    if (!raw || raw.length === 0) return new Image();

    // PNG magic: 89 50 4E 47
    if (raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4E && raw[3] === 0x47) {
      const blob = new Blob([raw as unknown as BlobPart], { type: 'image/png' });
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      return img;
    }

    // Fallback: try LZ4-compressed BGRA
    try {
      const decompressed = lz4Decompress(raw, w * h * 4);
      return this._bgraToImage(decompressed, w, h);
    } catch {
      return new Image();
    }
  }

  private _bgraToImage(raw: Uint8Array, w: number, h: number): HTMLImageElement {
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i]     = raw[i + 2];
      rgba[i + 1] = raw[i + 1];
      rgba[i + 2] = raw[i];
      rgba[i + 3] = raw[i + 3];
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.putImageData(new ImageData(rgba, w, h), 0, 0);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  decodeAudio(index: number, length: number): HTMLAudioElement {
    let data: Uint8Array;

    if (this.audCount > 0) {
      // Standard PKG4: audio in audio block
      const off = this.audOffsets[index];
      const actualLen = length > 0 ? length : this.v.getUint32(off, true);
      const start = length > 0 ? off : off + 4;
      data = this.b.subarray(start, start + actualLen);
    } else {
      // Maple.js/wz2nx: audio stored as raw bytes in string block
      data = this.strBuf[index];
    }

    if (!data || data.length === 0) return new Audio();

    // Scan for OGG first (4-byte signature, very specific)
    let mime = '';
    let skip = 0;
    const scanLen = Math.min(512, data.length - 4);

    for (let i = 0; i < scanLen; i++) {
      if (data[i] === 0x4F && data[i+1] === 0x67 && data[i+2] === 0x67 && data[i+3] === 0x53) {
        skip = i; mime = 'audio/ogg'; break;
      }
    }
    if (!mime) {
      for (let i = 0; i < scanLen; i++) {
        if (data[i] === 0x49 && data[i+1] === 0x44 && data[i+2] === 0x33) {
          skip = i; mime = 'audio/mpeg'; break;
        }
        if (data[i] === 0xFF && (data[i+1] & 0xE0) === 0xE0) {
          skip = i; mime = 'audio/mpeg'; break;
        }
      }
    }

    // No audio magic found — data is not audio (this NX file has no embedded audio)
    if (!mime) return new Audio();

    if (skip > 0) data = data.subarray(skip);
    const blob = new Blob([data as unknown as BlobPart], { type: mime });
    return new Audio(URL.createObjectURL(blob));
  }
}
