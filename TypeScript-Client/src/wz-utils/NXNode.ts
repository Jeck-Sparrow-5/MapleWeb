export class NXNode {
  [key: string]: any;

  nName: string = '';
  nValue: any = null;
  nTagName: string = 'none';
  nChildren: NXNode[] = [];
  nParent: NXNode | null = null;
  nWidth: number = 0;
  nHeight: number = 0;
  nX: number = 0;
  nY: number = 0;

  _reader: any = null;
  _bitmapIndex: number = -1;
  _audioIndex: number = -1;
  _audioLength: number = 0;

  // Persistent canvas returned by nGetImage() — same object every call.
  // When the bitmap loads, content is copied into this canvas so all
  // callers who cached the reference automatically see the real image.
  private _canvas: HTMLCanvasElement | null = null;
  private _imageLoading = false;

  private _audio: HTMLAudioElement | null = null;
  private _audioLoading = false;

  static readonly _silentAudio: HTMLAudioElement = new Audio();

  nGet(key: string | number, defaultValue?: any): any {
    const k = String(key);
    if (k in this) return this[k];
    void this.nChildren;
    return k in this ? this[k] : defaultValue;
  }

  nGetChild(cb: (node: NXNode) => boolean): NXNode | null {
    for (const child of this.nChildren) {
      if (cb(child)) return child;
    }
    return null;
  }

  nGetPath(): string {
    let ret = '';
    let p: NXNode | null = this;
    while (p) { ret = `${p.nName}/${ret}`; p = p.nParent; }
    return ret.slice(1, -1);
  }

  nResolveUOL(): NXNode | null {
    if (this.nTagName === 'uol' && typeof this.nValue === 'string') {
      let node: any = this.nParent;
      for (const part of (this.nValue as string).split('/')) {
        if (!node) return null;
        node = part === '..' ? node.nParent : node[part];
      }
      return node ?? null;
    }
    return null;
  }

  // Returns a PERSISTENT canvas element — same object on every call.
  // Content is empty (transparent) until the bitmap finishes loading,
  // at which point it is copied in-place. Any code that cached the
  // return value will automatically see the real image without needing
  // to call nGetImage() again.
  nGetImage(): any {
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
      this._canvas.width  = this.nWidth  || 1;
      this._canvas.height = this.nHeight || 1;

      if (!this._imageLoading && this._reader && this._bitmapIndex >= 0 && this.nWidth > 0 && this.nHeight > 0) {
        this._imageLoading = true;
        this._reader.decodeBitmapAsync(this._bitmapIndex, this.nWidth, this.nHeight)
          .then((cv: HTMLCanvasElement) => {
            const target = this._canvas!;
            target.width  = cv.width;
            target.height = cv.height;
            target.getContext('2d')!.drawImage(cv, 0, 0);
          })
          .catch((err: any) => {
            console.warn('[NX] bitmap decode failed', err);
            this._imageLoading = false;
          });
      }
    }
    return this._canvas;
  }

  nGetAudio(): HTMLAudioElement {
    if (this._audio && this._audio.src) return this._audio;
    if (!this._audioLoading && this._reader && this._audioIndex >= 0) {
      this._audioLoading = true;
      this._audio = this._audio ?? new Audio();
      const target = this._audio;
      this._reader.decodeAudioAsync(this._audioIndex, this._audioLength)
        .then((audio: HTMLAudioElement) => { if (audio.src) target.src = audio.src; })
        .catch(() => { this._audioLoading = false; });
    }
    return this._audio ?? NXNode._silentAudio;
  }
}
