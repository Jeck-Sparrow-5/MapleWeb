// LZ4 block decompressor (no frame header)
export function lz4Decompress(src: Uint8Array, decompressedSize: number): Uint8Array {
  const dst = new Uint8Array(decompressedSize);
  let sPos = 0;
  let dPos = 0;

  while (sPos < src.length) {
    const token = src[sPos++];

    // Literal run
    let litLen = token >>> 4;
    if (litLen === 15) {
      let extra: number;
      do { extra = src[sPos++]; litLen += extra; } while (extra === 255);
    }
    dst.set(src.subarray(sPos, sPos + litLen), dPos);
    sPos += litLen;
    dPos += litLen;

    if (sPos >= src.length) break;

    // Match copy
    const offset = src[sPos] | (src[sPos + 1] << 8);
    sPos += 2;

    let matchLen = (token & 0xf) + 4;
    if ((token & 0xf) === 15) {
      let extra: number;
      do { extra = src[sPos++]; matchLen += extra; } while (extra === 255);
    }

    // Byte-by-byte copy handles overlapping runs (RLE)
    let mPos = dPos - offset;
    for (let i = 0; i < matchLen; i++) dst[dPos++] = dst[mPos++];
  }

  return dst.subarray(0, dPos);
}
