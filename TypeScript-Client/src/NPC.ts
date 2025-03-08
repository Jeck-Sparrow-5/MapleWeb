import WZManager from "./wz-utils/WZManager";
import Random from "./Random";
import GameCanvas from "./GameCanvas";
import { CameraInterface } from "./Camera";

class NPC {
  opts: any;
  oId: number = 0;
  id: number = 0;
  x: number = 0;
  cy: number = 0;
  flipped: boolean = false;
  fh: any = null;
  rx0: number = 0;
  rx1: number = 0;
  npcFile: any = null;
  stances: any = {};
  strings: any = {};
  floating: number = 0;
  mapleTv: number = 0;
  mapleTvAdX: number = 0;
  mapleTvAdY: number = 0;
  mapleTvMsgX: number = 0;
  mapleTvMsgY: number = 0;
  tvAdStances: any = [];
  tvAdStance: number = 0;
  tvAdFrame: number = 0;
  tvAdDelay: number = 0;
  tvAdNextDelay: number = 0;
  mapleTvMsgImg: any = null;
  stance: string = "";
  frame: number = 0;
  delay: number = 0;
  nextDelay: number = 0;
  layer: number = 0;
  // Added property to control dialogue bubble display.
  showDialog: boolean = false;

  static async fromOpts(opts: any) {
    const npc = new NPC(opts);
    await npc.load();
    return npc;
  }
  
  constructor(opts: any) {
    this.opts = opts;
  }
  
  async load() {
    const opts = this.opts;

    this.oId = opts.oId;
    this.id = opts.id;
    this.x = opts.x;
    this.cy = opts.cy;
    this.flipped = opts.f;
    this.fh = opts.fh;
    this.rx0 = opts.rx0;
    this.rx1 = opts.rx1;

    let strId = `${this.id}`.padStart(7, "0");
    let npcFile: any = await WZManager.get(`Npc.wz/${strId}.img`);
    if (!!npcFile.info.link) {
      const linkId = npcFile.info.link.nValue;
      strId = `${linkId}`.padStart(7, "0");
      npcFile = await WZManager.get(`Npc.wz/${strId}.img`);
    }
    this.npcFile = npcFile;

    this.stances = {};
    npcFile.nChildren
      .filter((c: any) => c.nName !== "info")
      .forEach((stance: any) => {
        this.stances[stance.nName] = this.loadStance(npcFile, stance.nName);
      });

    this.strings = await this.loadStrings(this.id);

    // Optionally, if your NPC WZ data has a "speak" node,
    // you might want to store it in this.strings.speak. For example:
    if (npcFile.nGet("speak")) {
      this.strings.speak = npcFile.nGet("speak").nGet("nValue", "Hello!");
    }

    this.floating = npcFile.info.nGet("float").nGet("nValue", 0);

    this.mapleTv = npcFile.info.nGet("MapleTV").nGet("nValue", 0);
    if (!!this.mapleTv) {
      this.mapleTvAdX = npcFile.info.MapleTVadX.nValue;
      this.mapleTvAdY = npcFile.info.MapleTVadY.nValue;
      this.mapleTvMsgX = npcFile.info.MapleTVmsgX.nValue;
      this.mapleTvMsgY = npcFile.info.MapleTVmsgY.nValue;

      const tvFile: any = await WZManager.get("UI.wz/MapleTV.img");
      const tvMsg = tvFile.TVmedia;

      this.tvAdStances = tvMsg.nChildren.map((stance: any, i: number) => {
        return this.loadStance(tvMsg, i.toString());
      });

      this.setTvAdFrame(Random.randInt(0, this.tvAdStances.length - 1), 0);

      this.mapleTvMsgImg = tvFile.TVbasic[0].nGetImage();
    }

    this.setFrame("stand", 0);
  }
  
  async loadStrings(id: number) {
    const stringFile: any = await WZManager.get("String.wz/Npc.img");
    const npcStrings = stringFile.nGet(id);
    return npcStrings.nChildren.reduce((acc: any, c: any) => {
      acc[c.nName] = c.nValue;
      return acc;
    }, {});
  }
  
  loadStance(
    wzNode: any = {},
    stance: string = "stand"
  ): {
    frames: any[];
  } {
    if (!wzNode[stance]) {
      return {
        frames: [],
      };
    }

    const frames: any = [];

    wzNode[stance].nChildren.forEach((frame: any) => {
      if (frame.nTagName === "canvas" || frame.nTagName === "uol") {
        const Frame = frame.nTagName === "uol" ? frame.nResolveUOL() : frame;
        frames.push(Frame);
      } else {
        console.log(`Unhandled frame=${frame.nTagName} for NPC `, this);
      }
    });

    return {
      frames,
    };
  }
  
  setFrame(stance = "stand", frame = 0, carryOverDelay = 0) {
    const s = !this.stances[stance] ? "stand" : stance;
    const f = !this.stances[s].frames[frame] ? 0 : frame;
    const stanceFrame = this.stances[s].frames[f];

    this.stance = s;
    this.frame = f;
    this.delay = carryOverDelay;
    this.nextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
  }
  
  setTvAdFrame(stance = 0, frame = 0, carryOverDelay = 0) {
    const s = !this.tvAdStances[stance] ? 0 : stance;
    const f = !this.tvAdStances[s].frames[frame] ? 0 : frame;
    const stanceFrame = this.tvAdStances[s].frames[f];

    this.tvAdStance = s;
    this.tvAdFrame = f;
    this.tvAdDelay = carryOverDelay;
    this.tvAdNextDelay = stanceFrame.nGet("delay").nGet("nValue", 100);
  }
  
  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    const currentFrame = this.stances[this.stance].frames[this.frame];
    const currentImage = currentFrame.nGetImage();

    const originX = currentFrame.nGet("origin").nGet("nX", 0);
    const originY = currentFrame.nGet("origin").nGet("nY", 0);

    const adjustX = !this.flipped ? originX : currentFrame.nWidth - originX;

    canvas.drawImage({
      img: currentImage,
      dx: this.x - camera.x - adjustX,
      dy: this.cy - camera.y - originY,
      flipped: !!this.flipped,
    });

    this.drawName(canvas, camera, lag, msPerTick, tdelta);
    this.drawTvAd(canvas, camera, lag, msPerTick, tdelta);
  }
  
  drawName(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    const hideName = this.npcFile.info.nGet("hideName").nGet("nValue", 0);
    const hasName = !!this.strings.name;
    const hasFunc = !!this.strings.func;
    const tagHeight = 16;
    const tagPadding = 4;
    const tagColor = "#000000";
    const tagAlpha = 0.7;
    const offsetFromCy = 2;

    if (!hideName && hasName) {
      const nameOpts = {
        text: this.strings.name,
        x: this.x - camera.x,
        y: this.cy - camera.y + offsetFromCy + 3,
        color: "#ffff00",
        fontWeight: "bold",
        align: "center",
      };
      const nameWidth = Math.ceil(
        canvas.measureText(nameOpts).width + tagPadding
      );
      const nameTagX = Math.ceil(this.x - camera.x - nameWidth / 2);
      canvas.drawRect({
        x: nameTagX,
        y: this.cy - camera.y + offsetFromCy,
        width: nameWidth,
        height: tagHeight,
        color: tagColor,
        alpha: tagAlpha,
      });
      canvas.drawText(nameOpts);
    }
    if (!hideName && hasFunc) {
      const funcOpts = {
        text: this.strings.func,
        x: this.x - camera.x,
        y: this.cy - camera.y + offsetFromCy + tagHeight + 3 + 1,
        color: "#ffff00",
        fontWeight: "bold",
        align: "center",
      };
      const funcWidth = Math.ceil(
        canvas.measureText(funcOpts).width + tagPadding
      );
      const funcTagX = Math.ceil(this.x - camera.x - funcWidth / 2);
      canvas.drawRect({
        x: funcTagX,
        y: this.cy - camera.y + offsetFromCy + tagHeight + 1,
        width: funcWidth,
        height: tagHeight,
        color: tagColor,
        alpha: tagAlpha,
      });
      canvas.drawText(funcOpts);
    }
  }
  
  drawTvAd(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (!this.mapleTv) {
      return;
    }

    const s = this.tvAdStance;
    const f = this.tvAdFrame;
    const currentFrame = this.tvAdStances[s].frames[f];
    const currentImage = currentFrame.nGetImage();

    canvas.drawImage({
      img: currentImage,
      dx: this.x - camera.x + this.mapleTvAdX,
      dy: this.cy - camera.y + this.mapleTvAdY,
    });

    canvas.drawImage({
      img: this.mapleTvMsgImg,
      dx: this.x - camera.x + ((this.mapleTvMsgX - 0x10000) % 0x10000),
      dy: this.cy - camera.y + this.mapleTvMsgY,
    });
  }
  
  // --- New: Draw dialogue bubble ---
  drawDialogueBubble(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    // Use the "speak" string if available; otherwise default.
    const dialogueText = this.strings.speak || "Hello!";
    // Calculate the screen position above the NPC. Adjust offsets as needed.
    const bubbleWidth = 100;
    const bubbleHeight = 40;
    const npcScreenX = this.x - camera.x;
    const npcScreenY = this.cy - camera.y;
    // Draw a bubble background above the NPC.
    canvas.drawRect({
      x: npcScreenX - bubbleWidth / 2,
      y: npcScreenY - bubbleHeight - 10,
      width: bubbleWidth,
      height: bubbleHeight,
      color: "black",
      alpha: 0.7,
      angle: 0,
    });
    // Draw the dialogue text in the center of the bubble.
    canvas.drawText({
      text: dialogueText,
      x: npcScreenX,
      y: npcScreenY - bubbleHeight / 2 - 10,
      color: "#FFFFFF",
      align: "center",
      fontSize: 12,
    });
  }
  
  updateTvAd(msPerTick: number) {
    if (!!this.mapleTv) {
      this.tvAdDelay += msPerTick;
      if (this.tvAdDelay > this.tvAdNextDelay) {
        this.setTvAdFrame(
          this.tvAdStance,
          this.tvAdFrame + 1,
          this.tvAdDelay - this.tvAdNextDelay
        );
      }
    }
  }
  
  update(msPerTick: number) {
    this.delay += msPerTick;
    if (this.delay > this.nextDelay) {
      this.setFrame(this.stance, this.frame + 1, this.delay - this.nextDelay);
    }
    this.updateTvAd(msPerTick);
  }
}

export default NPC;
