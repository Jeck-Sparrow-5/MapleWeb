import NXManager from "../wz-utils/NXManager";

export interface AudioManager {
  bgm: HTMLAudioElement;
  bgmName: string;
  playBackgroundMusic: (name: string) => Promise<void>;
}

const TARGET_VOLUME = 0.4;
const FADE_STEP_MS  = 50;
const FADE_OUT_STEPS = 20; // 1 second fade-out

function fadeOut(audio: HTMLAudioElement): Promise<void> {
  return new Promise(resolve => {
    const step = audio.volume / FADE_OUT_STEPS;
    const interval = setInterval(() => {
      if (audio.volume <= step) {
        audio.volume = 0;
        audio.pause();
        audio.currentTime = 0;
        clearInterval(interval);
        resolve();
      } else {
        audio.volume = Math.max(0, audio.volume - step);
      }
    }, FADE_STEP_MS);
  });
}

function fadeIn(audio: HTMLAudioElement): void {
  audio.volume = 0;
  const step = TARGET_VOLUME / FADE_OUT_STEPS;
  const interval = setInterval(() => {
    if (audio.volume >= TARGET_VOLUME - step) {
      audio.volume = TARGET_VOLUME;
      clearInterval(interval);
    } else {
      audio.volume = Math.min(TARGET_VOLUME, audio.volume + step);
    }
  }, FADE_STEP_MS);
}

const currentAudioManager: AudioManager = {
  bgm: new Audio(),
  bgmName: "",
  playBackgroundMusic: async function (name: string) {
    if (name === this.bgmName) return;

    const oldBgm = this.bgm;
    this.bgmName = name;

    // Fade out old track concurrently while fetching new one
    const fadeOutPromise = oldBgm.src ? fadeOut(oldBgm) : Promise.resolve();

    if (!name) { await fadeOutPromise; return; }

    const [filename, child] = name.split("/");
    const wzNode: any = await NXManager.get(`Sound.wz/${filename}.img/${child}`);
    if (!wzNode) { await fadeOutPromise; return; }

    await fadeOutPromise;

    // Guard: another map change may have happened while fetching
    if (name !== this.bgmName) return;

    this.bgm = wzNode.nGetAudio();
    this.bgm.loop = true;
    this.bgm.volume = 0;

    const tryPlay = () => {
      this.bgm.play()
        .then(() => fadeIn(this.bgm))
        .catch(() => {});
    };

    if (this.bgm.readyState >= 2) {
      tryPlay();
    } else {
      this.bgm.addEventListener('canplay', tryPlay, { once: true });
    }
  },
};

export default currentAudioManager;
