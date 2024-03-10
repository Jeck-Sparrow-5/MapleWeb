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
};

Camera.initialize = function () {
  this.width = config.width;
  this.height = config.height;
  this.x = 0;
  this.y = 0;
};

// only usefull when the game resolution is not 800x600
// const bottomSafeGap = 0; // 800x600
const bottomSafeGap = 200; // 1280x720
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
  this.boundaries = { left, right, top, bottom: bottom - bottomSafeGap };
};

Camera.lookAt = function (x, y) {
  const width = this.width;
  const height = this.height;
  const boundaries = this.boundaries;

  if (boundaries.right - boundaries.left < width) {
    const leftGap = (width - (boundaries.right - boundaries.left)) / 2;
    this.x = Math.round(boundaries.left - leftGap);
  } else if (x - width / 2 < boundaries.left) {
    this.x = boundaries.left;
  } else if (x + width / 2 > boundaries.right) {
    this.x = boundaries.right - width;
  } else {
    this.x = Math.round(x - width / 2);
  }

  if (boundaries.bottom - boundaries.top < height) {
    const topGap = (height - (boundaries.bottom - boundaries.top)) / 2;
    this.y = Math.round(boundaries.top - topGap);
  } else if (y - height / 2 < boundaries.top) {
    this.y = boundaries.top;
  } else if (y + height / 2 > boundaries.bottom) {
    this.y = boundaries.bottom - height;
  } else {
    this.y = Math.round(y - height / 2);
  }
};

Camera.update = function () {};

Camera.doReset = function () {};

export default Camera;
