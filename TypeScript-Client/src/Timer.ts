interface Timer {
  getNow: () => number;
  lastUpdate: number;
  delta: number;
  tdelta: number;
  initialize: () => void;
  doReset: () => void;
  update: () => void;
}

const Timer: Timer = {
  getNow: !performance ? Date.now : performance.now.bind(performance),
  lastUpdate: 0,
  delta: 0,
  tdelta: 0,

  initialize() {
    this.lastUpdate = this.getNow();
    this.delta = 0;
    this.tdelta = 0;
  },

  doReset() {
    this.lastUpdate = this.getNow();
    this.delta = 0;
    this.tdelta = 0;
  },

  update() {
    const now = this.getNow();
    this.delta = now - this.lastUpdate;
    this.lastUpdate = now;
  },
};

export default Timer;
