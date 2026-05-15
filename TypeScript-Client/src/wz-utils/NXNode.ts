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

  private _image: HTMLImageElement | null = null;
  private _imageLoading = false;
  private _audio: HTMLAudioElement | null = null;
  private _audioLoading = false;

  // Shared placeholder returned before real assets load
  static readonly _placeholder: HTMLImageElement = new Image();
  static readonly _silentAudio: HTMLAudioElement = new Audio();

  nGet(key: string | number, defaultValue?: any): any {
    const k = String(key);
    if (k in this) return this[k];
    // Children are built lazily — trigger nChildren to populate named properties, then retry.
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

  // Returns a placeholder image immediately, fetches real image in background.
  // Subsequent calls return the cached image once loaded.
  nGetImage(): HTMLImageElement {
    if (this._image) return this._image;
    if (!this._imageLoading && this._reader && this._bitmapIndex >= 0 && this.nWidth > 0 && this.nHeight > 0) {
      this._imageLoading = true;
      this._reader.decodeBitmapAsync(this._bitmapIndex, this.nWidth, this.nHeight)
        .then((img: HTMLImageElement) => { this._image = img; })
        .catch(() => { this._imageLoading = false; });
    }
    return NXNode._placeholder;
  }

  // Returns an audio element immediately; src is populated asynchronously.
  // AudioManager should listen to canplay before calling play().
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
