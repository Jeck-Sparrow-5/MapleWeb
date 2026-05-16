import NXManager from "../wz-utils/NXManager";

export interface AudioManager {
  bgm: HTMLAudioElement;
  bgmName: string;
  playBackgroundMusic: (name: string) => Promise<void>;
}
const Volume = 0.4;

const currentAudioManager: AudioManager = {
  bgm: new Audio(),
  bgmName: "",
  playBackgroundMusic: async function (name: string) {
    if (name !== this.bgmName) {
      if (this.bgm) {
        this.bgm.pause();
        this.bgm.currentTime = 0;
      }
      this.bgmName = name;
      if (!name) return;

      const [filename, child] = name.split("/");
      const wzNode: any = await NXManager.get(
        `Sound.wz/${filename}.img/${child}`
      );
      if (!wzNode) return;

      this.bgm = wzNode.nGetAudio();
      this.bgm.loop = true;
      this.bgm.volume = Volume;

      const tryPlay = () => this.bgm.play().catch(() => {});
      // Audio src is set asynchronously — play when ready
      if (this.bgm.readyState >= 2) {
        tryPlay();
      } else {
        this.bgm.addEventListener('canplay', tryPlay, { once: true });
      }
    }
  },
};

export default currentAudioManager;
