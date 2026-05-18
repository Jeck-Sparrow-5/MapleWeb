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
  _texCache: WeakMap<HTMLImageElement, PIXI.Texture> = new WeakMap();
  _spritePool: PIXI.Sprite[] = [];
  _spriteIdx: number = 0;
  _gfx: PIXI.Graphics = new PIXI.Graphics();   // single batched graphics object
  _textPool: PIXI.Text[] = [];
  _textIdx: number = 0;

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
      backgroundAlpha: 0,
      antialias: false,
      autoStart: false,
      resolution: 1,
    });
    const pixiCanvas = this._pixiApp.view as HTMLCanvasElement;
    pixiCanvas.style.position = 'absolute';
    pixiCanvas.style.top = '0';
    pixiCanvas.style.left = '0';
    pixiCanvas.style.pointerEvents = 'none';
    // 2D overlay on top (transparent background, receives pointer events)
    this.game.style.position = 'absolute';
    this.game.style.top = '0';
    this.game.style.left = '0';
    this.game.style.background = 'transparent';
    gameWrapper.insertBefore(pixiCanvas, this.game);

    // Graphics on top of sprites (rects/lines drawn after sprites)
    (this._pixiApp.stage as any).addChild(this._gfx);

    this.listenMouse();
    this.listenKeyboard();
  }

  _getTex(img: HTMLImageElement): PIXI.Texture {
    let tex = this._texCache.get(img);
    if (!tex) {
      tex = PIXI.Texture.from(img);
      this._texCache.set(img, tex);
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
    (this._pixiApp.stage as any).addChild(s);
    this._spritePool.push(s);
    this._spriteIdx++;
    return s;
  }

  beginFrame() {
    this._spriteIdx = 0;
    this._textIdx = 0;
    this._gfx.clear();
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

  _getPoolText(style: PIXI.TextStyle): PIXI.Text {
    if (this._textIdx < this._textPool.length) {
      const t = this._textPool[this._textIdx++];
      t.visible = true;
      t.style = style;
      return t;
    }
    const t = new PIXI.Text('', style);
    (this._pixiApp.stage as any).addChild(t);
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

    this._gfx.lineStyle(width, PIXI.utils.string2hex(color), alpha);
    this._gfx.moveTo(x1, y1);
    this._gfx.lineTo(x2, y2);
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
  }) {
    const x = opts.x || 0;
    const y = opts.y || 0;
    const width = opts.width || 0;
    const height = opts.height || 0;
    const angle = opts.angle || 0;
    const alpha = opts.alpha ?? 1;
    const color = opts.color || "#000000";
    const hex = PIXI.utils.string2hex(color);

    this._gfx.lineStyle(0);
    this._gfx.beginFill(hex, alpha);
    if (angle !== 0) {
      const cx = x + width / 2, cy = y + height / 2;
      const rad = (angle * Math.PI) / 180;
      // rotated rect via transform on a Graphics — use Matrix
      const m = new PIXI.Matrix().translate(-cx, -cy).rotate(rad).translate(cx, cy);
      this._gfx.setMatrix(m);
      this._gfx.drawRect(x, y, width, height);
      this._gfx.setMatrix(new PIXI.Matrix());
    } else {
      this._gfx.drawRect(x, y, width, height);
    }
    this._gfx.endFill();
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

    const style = new PIXI.TextStyle({
      fill: color,
      fontWeight,
      fontStyle,
      fontSize,
      fontFamily,
      align,
    });

    const t = this._getPoolText(style);
    t.text = text;
    t.style = style;
    // anchor for alignment
    t.anchor.x = align === 'center' ? 0.5 : align === 'right' ? 1 : 0;
    t.anchor.y = 0;
    t.x = x;
    t.y = y;
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
}

export default GameCanvas;
