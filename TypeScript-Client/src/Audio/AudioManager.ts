import WZManager from "../wz-utils/WZManager";
import WZNode from "../wz-utils/WZNode";

export interface AudioManager {
  bgm: HTMLAudioElement;
  bgmName: string;
  playBackgroundMusic: (name: string) => Promise<void>;
}
const Volume = 0.4;
console.log("Background Volume", Volume);

const currentAudioManager: AudioManager = {
  bgm: new Audio(),
  bgmName: "",
  playBackgroundMusic: async function (name: string) {
    console.log(name);
    if (name !== this.bgmName) {
      if (!!this.bgm) {
        this.bgm.pause();
        this.bgm.currentTime = 0;
      }
      this.bgmName = name;
      if (!name) {
        return;
      }
      const [filename, child] = name.split("/");
      const wzNode: any = await WZManager.get(
        `Sound.wz/${filename}.img/${child}`
      );
      this.bgm = wzNode.nGetAudio();
      this.bgm.loop = true;
      console.log(`Playing ${name}`);
      this.bgm.play();
      this.bgm.volume = Volume;
    }
  },
};

export default currentAudioManager;
