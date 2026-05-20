import config from "./Config";

export interface CameraBoundaries {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CameraInterface {
  width: number;
  height: number;
  x: number;
  y: number;
  boundaries: CameraBoundaries;
  initialize: () => void;
  setBoundaries: (_: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }) => void;
  lookAt: (_: number, __: number) => void;
  update: () => void;
  doReset: () => void;
  setTopLeft: (x: number, y: number) => void,
}

const Camera: CameraInterface = {
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  boundaries: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  initialize: () => {},
  setBoundaries: () => {},
  lookAt: () => {},
  update: () => {},
  doReset: () => {},
  setTopLeft: () => {},
};

Camera.initialize = function () {
  this.width = config.width;
  this.height = config.height;
  this.x = 0;
  this.y = 0;
  targetX = 0;
  targetY = 0;
};

// Follow speed per frame — 0.25 matches HeavenClient snappy feel
const easeSpeed = 0.25;
let targetX = 0;
let targetY = 0;

// Vertical fraction: player's feet appear at this % from top of screen
const Y_FRACTION = 0.65;

Camera.setBoundaries = function ({
  left,
  right,
  top,
  bottom,
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}) {
  this.boundaries = { left, right, top, bottom };
};

Camera.setTopLeft = function (x: number, y: number): void {
  targetX = x;
  targetY = y;
};

Camera.lookAt = function (x, y) {
  const width = this.width;
  const height = this.height;
  const boundaries = this.boundaries;

  // Horizontal: center on x
  if (boundaries.right - boundaries.left < width) {
    const leftGap = (width - (boundaries.right - boundaries.left)) / 2;
    targetX = Math.round(boundaries.left - leftGap);
  } else if (x - width / 2 < boundaries.left) {
    targetX = boundaries.left;
  } else if (x + width / 2 > boundaries.right) {
    targetX = boundaries.right - width;
  } else {
    targetX = Math.round(x - width / 2);
  }

  // Vertical: place y at Y_FRACTION from top (feet slightly below center)
  const yOffset = Math.round(height * Y_FRACTION);
  if (boundaries.bottom - boundaries.top < height) {
    const topGap = (height - (boundaries.bottom - boundaries.top)) / 2;
    targetY = Math.round(boundaries.top - topGap);
  } else if (y - yOffset < boundaries.top) {
    targetY = boundaries.top;
  } else if (y - yOffset + height > boundaries.bottom) {
    targetY = boundaries.bottom - height;
  } else {
    targetY = y - yOffset;
  }
};

Camera.update = function () {
  if (this.x === targetX && this.y === targetY) {
    return;
  }

  this.x += (targetX - this.x) * easeSpeed;
  this.y += (targetY - this.y) * easeSpeed;

  if (Math.abs(this.x - targetX) < 0.5) this.x = targetX;
  if (Math.abs(this.y - targetY) < 0.5) this.y = targetY;
};

Camera.doReset = function () {
  this.x = 0;
  this.y = 0;
  targetX = 0;
  targetY = 0;
};

export default Camera;
