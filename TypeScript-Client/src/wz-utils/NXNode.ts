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
  private _audio: HTMLAudioElement | null = null;

  nGet(key: string | number, defaultValue?: any): any {
    const k = String(key);
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

  nGetImage(): HTMLImageElement {
    if (this._image) return this._image;
    if (this._reader && this._bitmapIndex >= 0) {
      this._image = this._reader.decodeBitmap(this._bitmapIndex, this.nWidth, this.nHeight);
    }
    return this._image!;
  }

  nGetAudio(): HTMLAudioElement {
    if (this._audio) return this._audio;
    if (this._reader && this._audioIndex >= 0) {
      this._audio = this._reader.decodeAudio(this._audioIndex, this._audioLength);
    }
    return this._audio!;
  }
}
