/**
 * Plays audio.
 *
 * This function allows an audio object to be played concurrently, i.e.
 * it is not necessary for an audio object to finish playing before it can
 * be played again.
 *
 * @param {Audio} audio - The audio object.
 * @param {float} [volume=1] - Loudness of audio.
 */
// function PLAY_AUDIO(audio, volume = 1) {
//   const concurrentAudio = audio.cloneNode();
//   concurrentAudio.volume = volume;
//   concurrentAudio.play();
// }

const playingAudios = new Set();

function PLAY_AUDIO(audio: any, volume = 1) {
  if (!playingAudios.has(audio)) {
    const concurrentAudio = audio.cloneNode();
    concurrentAudio.volume = volume;
    concurrentAudio.play();

    playingAudios.add(audio);

    concurrentAudio.addEventListener("ended", () => {
      playingAudios.delete(audio);
    });
  }
}

export default PLAY_AUDIO;
