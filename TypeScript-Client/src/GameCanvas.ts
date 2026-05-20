import * as PIXI from 'pixi.js';

class GameCanvas {
  scaleX;
  scaleY;
  mouseX;
  mouseY;
  clicked;
  rightClicked;
  focusGame;
  focusInput;
  scrolledUp;
  scrolledDown;
  keys: { [key: string]: number };
  pressedKeys: { [key: string]: boolean };
  gameWrapper: HTMLElement;
  game: HTMLCanvasElement;
  context: CanvasRenderingContext2D;

  // PixiJS renderer
  _pixiApp: PIXI.Application;
  _texCache: Map<any, PIXI.Texture> = new Map();
  _updatedThisFrame: Set<PIXI.BaseTexture> = new Set();
  _texUpdateCount: WeakMap<PIXI.BaseTexture, number> = new WeakMap();
  // Three fixed layers — bg → sprites → fg (HP bars, text, UI)
  _bgLayer: PIXI.Container = new PIXI.Container();
  _spriteLayer: PIXI.Container = new PIXI.Container();
  _fgLayer: PIXI.Container = new PIXI.Container();
  _spritePool: PIXI.Sprite[] = [];
  _spriteIdx: number = 0;
  _bgGfx: PIXI.Graphics = new PIXI.Graphics();
  _fgGfx: PIXI.Graphics = new PIXI.Graphics();
  _textPool: PIXI.Text[] = [];
  _textIdx: number = 0;
  _styleCache: Map<string, PIXI.TextStyle> = new Map();
  _colorCache: Map<string, number> = new Map();
  _subTexCache: Map<string, PIXI.Texture> = new Map();
  _sharedMatrix: PIXI.Matrix = new PIXI.Matrix();
  _identityMatrix: PIXI.Matrix = new PIXI.Matrix();
  _cachedRect: DOMRect = new DOMRect();
  _contextLost: boolean = false;
  _tilingPool: PIXI.TilingSprite[] = [];
  _tilingIdx: number = 0;
  _particleLayer: PIXI.ParticleContainer = new PIXI.ParticleContainer(4096, { uvs: true, alpha: true }, 1024, true);
  _particlePool: PIXI.Sprite[] = [];
  _particleIdx: number = 0;

  constructor(gameWrapper: HTMLElement) {
    this.scaleX = 1;
    this.scaleY = 1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.clicked = false;
    this.rightClicked = false;
    this.focusGame = false;
    this.focusInput = false;
    this.scrolledUp = false;
    this.scrolledDown = false;
    this.keys = {
      esc: 27,
      f1: 112,
      f2: 113,
      f3: 114,
      f4: 115,
      f5: 116,
      f6: 117,
      f7: 118,
      f8: 119,
      f9: 120,
      f10: 121,
      f11: 122,
      f12: 123,
      tilde: 192,
      1: 49,
      2: 50,
      3: 51,
      4: 52,
      5: 53,
      6: 54,
      7: 55,
      8: 56,
      9: 57,
      0: 48,
      minus: 173,
      plus: 61,
      q: 81,
      w: 87,
      e: 69,
      r: 82,
      t: 84,
      y: 89,
      u: 85,
      i: 73,
      o: 79,
      p: 80,
      "[": 219,
      "]": 221,
      pipe: 220,
      a: 65,
      s: 83,
      d: 68,
      f: 70,
      g: 71,
      h: 72,
      j: 74,
      k: 75,
      l: 76,
      colon: 59,
      quote: 222,
      enter: 13,
      shift: 16,
      z: 90,
      x: 88,
      c: 67,
      v: 86,
      b: 66,
      n: 78,
      m: 77,
      comma: 188,
      period: 190,
      ctrl: 17,
      alt: 18,
      space: 32,
      insert: 45,
      home: 36,
      pageup: 33,
      delete: 46,
      end: 35,
      pagedown: 34,
      up: 38,
      left: 37,
      down: 40,
      right: 39,
      num0: 96,
    };
    this.pressedKeys = {};

    this.gameWrapper = gameWrapper;
    this.game = document.getElementById("game") as HTMLCanvasElement;
    if (!this.game) {
      throw new Error("GameCanvas: game element not found");
    }
    this.context = this.game.getContext("2d")!;

    // Increase default sprite batch size — reduces draw-call splits on busy maps
    (PIXI as any).BatchRenderer.defaultBatchSize = 8192;

    (PIXI.settings as any).RENDER_OPTIONS = { ...((PIXI.settings as any).RENDER_OPTIONS ?? {}), hello: false };
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST; // crisp pixel art
    PIXI.settings.ROUND_PIXELS = true;                                     // snap to integer coords

    // PIXI WebGL renderer — inserted before the 2D overlay canvas
    this._pixiApp = new PIXI.Application({
      width: this.game.width,
      height: this.game.height,
      backgroundColor: 0x000000,
      antialias: false,
      autoStart: false,
      resolution: 1,
      resizeTo: gameWrapper,
    });
    const pixiCanvas = this._pixiApp.view as HTMLCanvasElement;
    pixiCanvas.style.position = 'absolute';
    pixiCanvas.style.top = '0';
    pixiCanvas.style.left = '0';
    pixiCanvas.style.pointerEvents = 'none';
    this.game.style.position = 'absolute';
    this.game.style.top = '0';
    this.game.style.left = '0';
    this.game.style.background = 'transparent';
    gameWrapper.insertBefore(pixiCanvas, this.game);

    let _contextLostTimer: ReturnType<typeof setTimeout> | null = null;

    pixiCanvas.addEventListener('webglcontextlost', (e: Event) => {
      e.preventDefault();
      this._contextLost = true;
      console.warn('[pixi] WebGL context lost — rendering paused');
      // If GPU can't restore within 6s, show fatal overlay
      _contextLostTimer = setTimeout(() => {
        _contextLostTimer = null;
        if (this._contextLost) this._showContextLostOverlay();
      }, 6000);
    }, false);

    pixiCanvas.addEventListener('webglcontextrestored', () => {
      if (_contextLostTimer !== null) {
        clearTimeout(_contextLostTimer);
        _contextLostTimer = null;
      }
      this._contextLost = false;
      this._subTexCache.clear();
      this._texUpdateCount = new WeakMap();
      this._updatedThisFrame.clear();
      console.info('[pixi] WebGL context restored');
    }, false);

    // Layer order: background → sprites → foreground → particles (damage numbers on top)
    const stage = this._pixiApp.stage as any;
    stage.addChild(this._bgLayer);
    stage.addChild(this._spriteLayer);
    stage.addChild(this._fgLayer);
    stage.addChild(this._particleLayer);
    this._bgLayer.addChild(this._bgGfx);
    this._fgLayer.addChild(this._fgGfx);
    // No interaction traversal — we handle clicks ourselves
    this._bgLayer.interactiveChildren = false;
    this._spriteLayer.interactiveChildren = false;
    this._fgLayer.interactiveChildren = false;
    this._particleLayer.interactiveChildren = false;

    this._cachedRect = gameWrapper.getBoundingClientRect();

    this.listenMouse();
    this.listenKeyboard();
  }

  _getTex(img: any): PIXI.Texture {
    let tex = this._texCache.get(img);
    if (!tex) {
      tex = PIXI.Texture.from(img);
      this._texCache.set(img, tex);
    }
    // Canvas textures: upload for a short window, restart window when decode completes.
    // NXNode sets _mwDecoded=true on the canvas element after async bitmap decode.
    if (img instanceof HTMLCanvasElement) {
      const bt = tex.baseTexture;
      if ((img as any)._mwDecoded) {
        (img as any)._mwDecoded = false;
        this._texUpdateCount.set(bt, 0); // restart upload window after decode
      }
      const count = this._texUpdateCount.get(bt) ?? 0;
      if (count < 5 && !this._updatedThisFrame.has(bt)) {
        bt.update();
        this._updatedThisFrame.add(bt);
        this._texUpdateCount.set(bt, count + 1);
      }
    }
    return tex;
  }

  _getPoolSprite(): PIXI.Sprite {
    if (this._spriteIdx < this._spritePool.length) {
      const s = this._spritePool[this._spriteIdx++];
      s.visible = true;
      s.tint = 0xFFFFFF;
      return s;
    }
    const s = new PIXI.Sprite();
    this._spriteLayer.addChild(s);
    this._spritePool.push(s);
    this._spriteIdx++;
    return s;
  }

  _getParticleSprite(): PIXI.Sprite {
    if (this._particleIdx < this._particlePool.length) {
      const s = this._particlePool[this._particleIdx++];
      s.visible = true;
      return s;
    }
    const s = new PIXI.Sprite();
    this._particleLayer.addChild(s);
    this._particlePool.push(s);
    this._particleIdx++;
    return s;
  }

  _getTilingSprite(): PIXI.TilingSprite {
    if (this._tilingIdx < this._tilingPool.length) {
      const ts = this._tilingPool[this._tilingIdx++];
      ts.visible = true;
      return ts;
    }
    const ts = new PIXI.TilingSprite(PIXI.Texture.EMPTY, 0, 0);
    this._bgLayer.addChild(ts);
    this._tilingPool.push(ts);
    this._tilingIdx++;
    return ts;
  }

  drawTiledImage(opts: {
    img: any;
    dx: number;
    dy: number;
    tileX: boolean;
    tileY: boolean;
    cx: number;
    cy: number;
    w: number;
    h: number;
    alpha?: number;
    flipped?: boolean;
  }) {
    const img = opts.img;
    if (!img?.width) return;
    const alpha = opts.alpha ?? 1;
    const flipped = opts.flipped ?? false;
    const tex = this._getTex(img);
    const ts = this._getTilingSprite();
    ts.texture = tex;
    ts.alpha = alpha;
    const cx = opts.cx || opts.w;
    const cy = opts.cy || opts.h;
    const screenW = this._pixiApp.renderer.width;
    const screenH = this._pixiApp.renderer.height;
    ts.tileScale.set((cx / opts.w) * (flipped ? -1 : 1), cy / opts.h);
    if (opts.tileX && opts.tileY) {
      ts.x = 0; ts.y = 0; ts.width = screenW; ts.height = screenH;
      ts.tilePosition.set(opts.dx, opts.dy);
    } else if (opts.tileX) {
      ts.x = 0; ts.y = opts.dy; ts.width = screenW; ts.height = opts.h;
      ts.tilePosition.set(opts.dx, 0);
    } else {
      ts.x = opts.dx; ts.y = 0; ts.width = opts.w; ts.height = screenH;
      ts.tilePosition.set(0, opts.dy);
    }
  }

  drawParticle(opts: { img: any; dx: number; dy: number; alpha?: number }) {
    const img = opts.img;
    if (!img?.width) return;
    const screenW = this._pixiApp.renderer.width;
    const screenH = this._pixiApp.renderer.height;
    if (opts.dx + img.width < 0 || opts.dx > screenW || opts.dy + img.height < 0 || opts.dy > screenH) return;
    const s = this._getParticleSprite();
    s.texture = this._getTex(img);
    s.x = opts.dx;
    s.y = opts.dy;
    s.alpha = opts.alpha ?? 1;
  }

  beginFrame() {
    if (this._contextLost) return;
    this._spriteIdx = 0;
    this._textIdx = 0;
    this._tilingIdx = 0;
    this._particleIdx = 0;
    this._bgGfx.clear();
    this._fgGfx.clear();
    this._updatedThisFrame.clear();
    this.context.clearRect(0, 0, this.game.width, this.game.height);
  }

  endFrame() {
    if (this._contextLost) return;
    for (let i = this._spriteIdx; i < this._spritePool.length; i++) this._spritePool[i].visible = false;
    for (let i = this._textIdx; i < this._textPool.length; i++) this._textPool[i].visible = false;
    for (let i = this._tilingIdx; i < this._tilingPool.length; i++) this._tilingPool[i].visible = false;
    for (let i = this._particleIdx; i < this._particlePool.length; i++) this._particlePool[i].visible = false;
    this._pixiApp.renderer.render(this._pixiApp.stage);
  }

  disposeAllTextures() {
    const toDestroy: PIXI.BaseTexture[] = [];
    this._texCache.forEach((tex) => {
      if (!tex.baseTexture.destroyed) toDestroy.push(tex.baseTexture);
    });
    this._texCache.clear();
    this._subTexCache.clear();
    this._texUpdateCount = new WeakMap();
    this._updatedThisFrame.clear();
    // Destroy GPU resources in idle time — avoids synchronous frame stutter
    const destroyBatch = () => {
      const batch = toDestroy.splice(0, 10);
      batch.forEach(bt => { if (!bt.destroyed) bt.destroy(); });
      if (toDestroy.length > 0) {
        'requestIdleCallback' in window
          ? (window as any).requestIdleCallback(destroyBatch)
          : setTimeout(destroyBatch, 50);
      }
    };
    if (toDestroy.length > 0) {
      'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(destroyBatch)
        : setTimeout(destroyBatch, 50);
    }
  }

  _showContextLostOverlay() {
    const existing = document.getElementById('webgl-lost-overlay');
    if (existing) return;
    const overlay = document.createElement('div');
    overlay.id = 'webgl-lost-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif', color: '#ffffff', gap: '16px',
    });
    overlay.innerHTML = `
      <div style="font-size:22px;font-weight:bold;color:#f5a623;">Graphics Error</div>
      <div style="font-size:14px;color:#cccccc;text-align:center;max-width:340px;">
        The WebGL context was lost and could not be restored.<br>
        This usually means the GPU ran out of memory.
      </div>
      <button id="webgl-reload-btn" style="
        margin-top:8px;padding:10px 28px;font-size:14px;font-weight:bold;
        background:#f5a623;color:#000;border:none;border-radius:6px;cursor:pointer;">
        Reload Game
      </button>`;
    document.body.appendChild(overlay);
    document.getElementById('webgl-reload-btn')?.addEventListener('click', () => location.reload());
  }

  _colorToNum(color: string): number {
    let n = this._colorCache.get(color);
    if (n === undefined) {
      n = new PIXI.Color(color).toNumber();
      this._colorCache.set(color, n);
    }
    return n;
  }

  _getCachedStyle(key: string, opts: Partial<PIXI.ITextStyle>): PIXI.TextStyle {
    let s = this._styleCache.get(key);
    if (!s) { s = new PIXI.TextStyle(opts); this._styleCache.set(key, s); }
    return s;
  }

  _getPoolText(style: PIXI.TextStyle): PIXI.Text {
    if (this._textIdx < this._textPool.length) {
      const t = this._textPool[this._textIdx++];
      t.visible = true;
      return t;
    }
    const t = new PIXI.Text('', style);
    this._fgLayer.addChild(t);
    this._textPool.push(t);
    this._textIdx++;
    return t;
  }

  listenMouse() {
    window.addEventListener("resize", () => {
      this._cachedRect = this.gameWrapper.getBoundingClientRect();
    });
    this.gameWrapper.addEventListener("mousemove", (e) => {
      this.mouseX = (e.clientX - this._cachedRect.left) / this.scaleX;
      this.mouseY = (e.clientY - this._cachedRect.top) / this.scaleY;
    });
    this.gameWrapper.addEventListener("mousedown", (e) => {
      if (e.which === 1) {
        this.clicked = true;
      } else if (e.which === 3) {
        this.rightClicked = true;
      }
    });
    this.gameWrapper.addEventListener("mouseup", (e) => {
      if (e.which === 1) {
        this.clicked = false;
      } else if (e.which === 3) {
        this.rightClicked = false;
      }
    });
    this.gameWrapper.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
    this.gameWrapper.addEventListener("mouseout", (e: any) => {
      const stillHoveringGameWrapper =
        !!e.relatedTarget && e.relatedTarget.parentNode === this.gameWrapper;
      if (!stillHoveringGameWrapper) {
        this.clicked = false;
        this.rightClicked = false;
      }
    });
    window.addEventListener("mousedown", (e) => {
      const t = e.target as Node;
      this.focusGame = t === this.game || this.gameWrapper.contains(t);
    });
    this.gameWrapper.addEventListener("DOMMouseScroll", (e: any) => {
      // firefox
      this.scrolledUp = e.detail < 0;
      this.scrolledDown = e.detail > 0;
    });
    this.gameWrapper.addEventListener("mousewheel", (e: any) => {
      // chrome
      this.scrolledUp = e.wheelDelta > 0;
      this.scrolledDown = e.wheelDelta < 0;
    });
  }
  listenKeyboard() {
    // Movement keyCodes always processed regardless of focusInput
    const movementKeys = new Set([37, 38, 39, 40, 18, 17]); // arrows + alt + ctrl
    window.addEventListener('keydown', (e) => {
      if (!this.focusGame) return;
      if (this.focusInput && !movementKeys.has(e.keyCode)) return;
      e.preventDefault();
      this.pressedKeys[e.keyCode] = true;
    });
    window.addEventListener('keyup', (e) => {
      if (!this.focusGame) return;
      if (this.focusInput && !movementKeys.has(e.keyCode)) return;
      e.preventDefault();
      this.pressedKeys[e.keyCode] = false;
    });
  }
  isKeyDown(key: string) {
    return !!this.pressedKeys[this.keys[key]] || !!this.pressedKeys[key];
  }
  resetMousewheel() {
    this.scrolledUp = false;
    this.scrolledDown = false;
  }
  releaseFocusInput() {
    this.pressedKeys[this.keys.enter] = false;
    this.game.focus();
  }

  /**
   * Draws image onto canvas.
   *
   * Crops image using sx, sy, sw, sh.
   * Scales image using scaleX, scaleY.
   * Flips image if flip.
   * Rotates image using angle.
   * Draws image using dx, dy.
   *
   * @param {Image} opts.img - Source image.
   * @param {int} [opts.sx=0] - Source x.
   * @param {int} [opts.sy=0] - Source y.
   * @param {int} [opts.sw=opts.img.width-opts.sx] - Source width.
   * @param {int} [opts.sh=opts.img.height-opts.sy] - Source height.
   * @param {int} [opts.dx=0] - Destination x.
   * @param {int} [opts.dy=0] - Destination y.
   * @param {int} [opts.dw=opts.sw] - Destination width (prefer scaleX).
   * @param {int} [opts.dh=opts.sh] - Destination height (prefer scaleY).
   * @param {bool} [opts.flipped=false] - Flipped horizontally.
   * @param {float} [opts.scaleX=1] - Scale x.
   * @param {float} [opts.scaleY=1] - Scale y.
   * @param {int} [opts.angle=0] - Degrees clockwise rotation.
   * @param {int} [opts.rx=opts.dw*opts.scaleX/2] - Center x of rotation.
   * @param {int} [opts.ry=opts.dh*opts.scaleY/2] - Center y of rotation.
   * @param {float} [opts.alpha=1] - Opacity.
   */
  drawImage(opts: {
    img: any;
    sx?: number;
    sy?: number;
    sw?: number;
    sh?: number;
    dx?: number;
    dy?: number;
    dw?: number;
    dh?: number;
    flipped?: boolean;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
    rx?: number;
    ry?: number;
    alpha?: number;
    tint?: number;
  }) {
    const img = opts.img;
    if (!img?.width) return;

    try {
      const sx = opts.sx ?? 0;
      const sy = opts.sy ?? 0;
      const sw = opts.sw ?? img.width - sx;
      const sh = opts.sh ?? img.height - sy;
      const dx = opts.dx ?? 0;
      const dy = opts.dy ?? 0;
      const flipped = opts.flipped ?? false;
      const angle = opts.angle ?? 0;
      const alpha = opts.alpha ?? 1;
      const scaleX = opts.scaleX ?? 1;
      const scaleY = opts.scaleY ?? 1;
      const effectiveWidth = sw * scaleX;
      const effectiveHeight = sh * scaleY;
      const rx = opts.rx ?? effectiveWidth / 2;
      const ry = opts.ry ?? effectiveHeight / 2;

      const baseTex = this._getTex(img as HTMLImageElement);
      // Sub-texture if cropped
      let tex: PIXI.Texture;
      if (sx === 0 && sy === 0 && sw === img.width && sh === img.height) {
        tex = baseTex;
      } else {
        const subKey = `${baseTex.baseTexture.uid}:${sx}:${sy}:${sw}:${sh}`;
        tex = this._subTexCache.get(subKey)!;
        if (!tex) {
          tex = new PIXI.Texture(baseTex.baseTexture, new PIXI.Rectangle(sx, sy, sw, sh));
          if (!(img instanceof HTMLCanvasElement)) this._subTexCache.set(subKey, tex);
        }
      }

      // Viewport cull — skip sprites fully off-screen
      const screenW = this._pixiApp.renderer.width;
      const screenH = this._pixiApp.renderer.height;
      const cullPad = angle !== 0 ? Math.max(effectiveWidth, effectiveHeight) : 0;
      if (dx + effectiveWidth + cullPad < 0 || dx - cullPad > screenW ||
          dy + effectiveHeight + cullPad < 0 || dy - cullPad > screenH) return;

      const sprite = this._getPoolSprite();
      sprite.texture = tex;
      sprite.alpha = alpha;
      sprite.angle = angle;
      sprite.scale.y = scaleY;
      sprite.tint = opts.tint ?? 0xFFFFFF;

      if (flipped) {
        // Canvas 2D flip: translate(effectiveWidth) then scale(-1,1) — independent of rx.
        // For angle=0 (all character parts): local lx → screen dx + effectiveWidth - lx.
        // PIXI equivalent: pivot at center (effectiveWidth/2), position at dx+center.
        const cx = effectiveWidth / 2;
        const cy = effectiveHeight / 2;
        sprite.pivot.set(cx / scaleX, cy / scaleY);
        sprite.x = dx + cx;
        sprite.y = dy + cy;
        sprite.scale.x = -scaleX;
      } else {
        sprite.pivot.set(rx / scaleX, ry / scaleY);
        sprite.x = dx + rx;
        sprite.y = dy + ry;
        sprite.scale.x = scaleX;
      }
    } catch (e) {
      console.warn('[pixi] drawImage failed:', e);
    }
  }

  /**
   * Draws line onto canvas.
   *
   * @param {int} [opts.x1=0] - Destination x1.
   * @param {int} [opts.y1=0] - Destination y1.
   * @param {int} [opts.x2=0] - Destination x2.
   * @param {int} [opts.y2=0] - Destination y2.
   * @param {float} [opts.width=1] - Thickness.
   * @param {float} [opts.alpha=1] - Opacity.
   * @param {string] [opts.color='#000000'] - Color.
   */
  drawLine(
    opts: {
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      alpha?: number;
      color?: string;
      width?: number;
    } = {}
  ) {
    const x1 = opts.x1 || 0;
    const y1 = opts.y1 || 0;
    const x2 = opts.x2 || 0;
    const y2 = opts.y2 || 0;
    const alpha = opts.alpha || 1;
    const color = opts.color || "#000000";
    const width = opts.width || 1;

    this._fgGfx.lineStyle(width, this._colorToNum(color), alpha);
    this._fgGfx.moveTo(x1, y1);
    this._fgGfx.lineTo(x2, y2);
  }

  /**
   * Draws rectangle onto canvas.
   *
   * @param {int} [opts.x=0] - Destination x.
   * @param {int} [opts.y=0] - Destination y.
   * @param {int} [opts.width=0] - Width.
   * @param {int} [opts.height=0] - Height.
   * @param {int} [opts.angle=0] - Degrees clockwise rotation.
   * @param {float} [opts.alpha=1] - Opacity.
   * @param {string} [opts.color='#000000'] - Color.
   */
  drawRect(opts: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    angle?: number;
    alpha?: number;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeAlpha?: number;
  }) {
    const x = opts.x || 0;
    const y = opts.y || 0;
    const width = opts.width || 0;
    const height = opts.height || 0;
    const angle = opts.angle || 0;
    const alpha = opts.alpha ?? 1;
    const color = opts.color || "#000000";
    const hex = color ? this._colorToNum(color) : null;
    const strokeHex = opts.strokeColor ? this._colorToNum(opts.strokeColor) : null;

    if (strokeHex !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, strokeHex, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (hex !== null) this._fgGfx.beginFill(hex, alpha);
    else this._fgGfx.beginFill(0, 0);
    if (angle !== 0) {
      const cx = x + width / 2, cy = y + height / 2;
      const rad = (angle * Math.PI) / 180;
      // rotated rect via transform on a Graphics — use Matrix
      this._sharedMatrix.identity().translate(-cx, -cy).rotate(rad).translate(cx, cy);
      this._fgGfx.setMatrix(this._sharedMatrix);
      this._fgGfx.drawRect(x, y, width, height);
      this._fgGfx.setMatrix(this._identityMatrix);
    } else {
      this._fgGfx.drawRect(x, y, width, height);
    }
    this._fgGfx.endFill();
  }

  /**
   * Draws text onto canvas.
   *
   * @param {string} [opts.text=''] - Text.
   * @param {int} [opts.x=0] - Destination x.
   * @param {int} [opts.y=0] - Destination y.
   * @param {string} [opts.color='#000000'] - Color.
   * @param {string} [opts.fontWeight=''] - Font weight, such as bold or 900.
   * @param {string} [opts.fontStyle=''] - Font style, such as italic.
   * @param {int} [opts.fontSize=12] - Font size.
   * @param {string} [opts.fontFamily='Arial'] - Font family.
   * @param {string} [opts.align='left'] - Alignment relative to destination x.
   */
  drawText(opts: {
    text?: string;
    x?: number;
    y?: number;
    color?: string;
    fontWeight?: string;
    fontStyle?: string;
    fontSize?: number;
    fontFamily?: string;
    align?: string;
    alpha?: number;
  }) {
    const text = opts.text ?? "";
    const x = opts.x ?? 0;
    const y = opts.y ?? 0;
    const color = opts.color || "#ffffff";
    const fontWeight = (opts.fontWeight || "normal") as PIXI.TextStyleFontWeight;
    const fontStyle = (opts.fontStyle || "normal") as PIXI.TextStyleFontStyle;
    const fontSize = opts.fontSize || 12;
    const fontFamily = opts.fontFamily || "Arial";
    const align = (opts.align || "left") as PIXI.TextStyleAlign;

    const styleKey = `${color}|${fontSize}|${fontWeight}|${fontStyle}|${fontFamily}|${align}`;
    const style = this._getCachedStyle(styleKey, { fill: color, fontWeight, fontStyle, fontSize, fontFamily, align });

    const t = this._getPoolText(style);
    t.text = text;
    t.style = style;
    t.anchor.x = align === 'center' ? 0.5 : align === 'right' ? 1 : 0;
    t.anchor.y = 0;
    t.x = x;
    t.y = y;
    t.alpha = opts.alpha ?? 1;
  }

  /**
   * Measures text.
   *
   * @param {string} [opts.text=''] - Text.
   * @param {string} [opts.color='#000000'] - Color.
   * @param {string} [opts.fontWeight=''] - Font weight, such as bold or 900.
   * @param {string} [opts.fontStyle=''] - Font style, such as italic.
   * @param {int} [opts.fontSize=12] - Font size.
   * @param {string} [opts.fontFamily='Arial'] - Font family.
   * @return {TextMetrics} Text measurements given options.
   */
  measureText(
    opts: {
      text?: string;
      color?: string;
      fontWeight?: string;
      fontStyle?: string;
      fontSize?: number;
      fontFamily?: string;
    } = {}
  ) {
    const text = opts.text || "";
    const color = opts.color || "#000000";
    const fontWeight = opts.fontWeight || "";
    const fontStyle = opts.fontStyle || "";
    const fontSize = opts.fontSize || 12;
    const fontFamily = opts.fontFamily || "Arial";

    this.context.save();

    this.context.textBaseline = "top";
    this.context.fillStyle = color;
    this.context.font = `${fontWeight} ${fontStyle} ${fontSize}px ${fontFamily}`;

    const textMetrics = this.context.measureText(text);

    this.context.restore();

    return textMetrics;
  }

  drawCircle(opts: {
    x: number; y: number; radius: number;
    color?: string; alpha?: number;
    strokeColor?: string; strokeWidth?: number; strokeAlpha?: number;
  }) {
    const fill = opts.color ? this._colorToNum(opts.color) : null;
    const stroke = opts.strokeColor ? this._colorToNum(opts.strokeColor) : null;
    if (stroke !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, stroke, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (fill !== null) this._fgGfx.beginFill(fill, opts.alpha ?? 1);
    else this._fgGfx.beginFill(0, 0);
    this._fgGfx.drawCircle(opts.x, opts.y, opts.radius);
    this._fgGfx.endFill();
  }

  drawRoundedRect(opts: {
    x: number; y: number; width: number; height: number; radius?: number;
    color?: string; alpha?: number;
    strokeColor?: string; strokeWidth?: number; strokeAlpha?: number;
  }) {
    const fill = opts.color ? this._colorToNum(opts.color) : null;
    const stroke = opts.strokeColor ? this._colorToNum(opts.strokeColor) : null;
    if (stroke !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, stroke, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (fill !== null) this._fgGfx.beginFill(fill, opts.alpha ?? 1);
    else this._fgGfx.beginFill(0, 0);
    this._fgGfx.drawRoundedRect(opts.x, opts.y, opts.width, opts.height, opts.radius ?? 4);
    this._fgGfx.endFill();
  }

  drawArc(opts: {
    x: number; y: number; radius: number;
    startAngle: number; endAngle: number; anticlockwise?: boolean;
    strokeColor?: string; strokeWidth?: number; strokeAlpha?: number;
    color?: string; alpha?: number;
  }) {
    const stroke = opts.strokeColor ? this._colorToNum(opts.strokeColor) : null;
    const fill = opts.color ? this._colorToNum(opts.color) : null;
    if (stroke !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, stroke, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (fill !== null) this._fgGfx.beginFill(fill, opts.alpha ?? 1);
    else this._fgGfx.beginFill(0, 0);
    this._fgGfx.arc(opts.x, opts.y, opts.radius, opts.startAngle, opts.endAngle, opts.anticlockwise ?? false);
    this._fgGfx.endFill();
  }

  drawPolygon(opts: {
    points: number[];
    color?: string; alpha?: number;
    strokeColor?: string; strokeWidth?: number; strokeAlpha?: number;
  }) {
    const fill = opts.color ? this._colorToNum(opts.color) : null;
    const stroke = opts.strokeColor ? this._colorToNum(opts.strokeColor) : null;
    if (stroke !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, stroke, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (fill !== null) this._fgGfx.beginFill(fill, opts.alpha ?? 1);
    else this._fgGfx.beginFill(0, 0);
    this._fgGfx.drawPolygon(opts.points);
    this._fgGfx.endFill();
  }
}

export default GameCanvas;
