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
  _texCache: WeakMap<any, PIXI.Texture> = new WeakMap();
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

    // PIXI WebGL renderer — inserted before the 2D overlay canvas
    this._pixiApp = new PIXI.Application({
      width: this.game.width,
      height: this.game.height,
      backgroundColor: 0x000000,  // native black fill — no drawRect needed
      antialias: false,
      autoStart: false,
      resolution: 1,
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

    // Layer order: background → sprites → foreground (HP bars, text, UI)
    const stage = this._pixiApp.stage as any;
    stage.addChild(this._bgLayer);
    stage.addChild(this._spriteLayer);
    stage.addChild(this._fgLayer);
    this._bgLayer.addChild(this._bgGfx);
    this._fgLayer.addChild(this._fgGfx);

    this.listenMouse();
    this.listenKeyboard();
  }

  _getTex(img: any): PIXI.Texture {
    let tex = this._texCache.get(img);
    if (!tex) {
      tex = PIXI.Texture.from(img);
      this._texCache.set(img, tex);
    }
    // Canvas textures: re-upload at most once per frame, stop after 180 frames
    if (img instanceof HTMLCanvasElement) {
      const bt = tex.baseTexture;
      const count = this._texUpdateCount.get(bt) ?? 0;
      if (count < 180 && !this._updatedThisFrame.has(bt)) {
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
      return s;
    }
    const s = new PIXI.Sprite();
    this._spriteLayer.addChild(s);
    this._spritePool.push(s);
    this._spriteIdx++;
    return s;
  }

  beginFrame() {
    this._spriteIdx = 0;
    this._textIdx = 0;
    this._bgGfx.clear();
    this._fgGfx.clear();
    this._updatedThisFrame.clear();
    this.context.clearRect(0, 0, this.game.width, this.game.height);
    const w = this.game.width;
    const h = this.game.height;
    if (this._pixiApp.renderer.width !== w || this._pixiApp.renderer.height !== h) {
      this._pixiApp.renderer.resize(w, h);
    }
  }

  endFrame() {
    for (let i = this._spriteIdx; i < this._spritePool.length; i++) this._spritePool[i].visible = false;
    for (let i = this._textIdx; i < this._textPool.length; i++) this._textPool[i].visible = false;
    this._pixiApp.renderer.render(this._pixiApp.stage);
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
    this.gameWrapper.addEventListener("mousemove", (e) => {
      const rectangle = this.gameWrapper.getBoundingClientRect();
      this.mouseX = (e.clientX - rectangle.left) / this.scaleX;
      this.mouseY = (e.clientY - rectangle.top) / this.scaleY;
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
      this.focusGame = e.target === this.game;
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
    window.onkeydown = (e) => {
      if (this.focusGame && !this.focusInput) {
        e.preventDefault();
        this.pressedKeys[e.keyCode] = true;
      }
    };
    window.onkeyup = (e) => {
      if (this.focusGame && !this.focusInput) {
        e.preventDefault();
        this.pressedKeys[e.keyCode] = false;
      }
    };
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
        tex = new PIXI.Texture(baseTex.baseTexture, new PIXI.Rectangle(sx, sy, sw, sh));
      }

      const sprite = this._getPoolSprite();
      sprite.texture = tex;
      sprite.alpha = alpha;
      // pivot = rotation/flip center in local sprite coords
      sprite.pivot.set(rx / scaleX, ry / scaleY);
      // position = where pivot sits in world
      sprite.x = dx + rx;
      sprite.y = dy + ry;
      sprite.angle = angle;
      sprite.scale.x = flipped ? -scaleX : scaleX;
      sprite.scale.y = scaleY;
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

    this._fgGfx.lineStyle(width, new PIXI.Color(color).toNumber(), alpha);
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
    const hex = color ? new PIXI.Color(color).toNumber() : null;
    const strokeHex = opts.strokeColor ? new PIXI.Color(opts.strokeColor).toNumber() : null;

    if (strokeHex !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, strokeHex, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (hex !== null) this._fgGfx.beginFill(hex, alpha);
    else this._fgGfx.beginFill(0, 0);
    if (angle !== 0) {
      const cx = x + width / 2, cy = y + height / 2;
      const rad = (angle * Math.PI) / 180;
      // rotated rect via transform on a Graphics — use Matrix
      const m = new PIXI.Matrix().translate(-cx, -cy).rotate(rad).translate(cx, cy);
      this._fgGfx.setMatrix(m);
      this._fgGfx.drawRect(x, y, width, height);
      this._fgGfx.setMatrix(new PIXI.Matrix());
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
    const fill = opts.color ? new PIXI.Color(opts.color).toNumber() : null;
    const stroke = opts.strokeColor ? new PIXI.Color(opts.strokeColor).toNumber() : null;
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
    const fill = opts.color ? new PIXI.Color(opts.color).toNumber() : null;
    const stroke = opts.strokeColor ? new PIXI.Color(opts.strokeColor).toNumber() : null;
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
    const stroke = opts.strokeColor ? new PIXI.Color(opts.strokeColor).toNumber() : null;
    const fill = opts.color ? new PIXI.Color(opts.color).toNumber() : null;
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
    const fill = opts.color ? new PIXI.Color(opts.color).toNumber() : null;
    const stroke = opts.strokeColor ? new PIXI.Color(opts.strokeColor).toNumber() : null;
    if (stroke !== null) this._fgGfx.lineStyle(opts.strokeWidth ?? 1, stroke, opts.strokeAlpha ?? 1);
    else this._fgGfx.lineStyle(0);
    if (fill !== null) this._fgGfx.beginFill(fill, opts.alpha ?? 1);
    else this._fgGfx.beginFill(0, 0);
    this._fgGfx.drawPolygon(opts.points);
    this._fgGfx.endFill();
  }
}

export default GameCanvas;
