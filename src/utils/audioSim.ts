/**
 * Deterministic audio simulation. No real audio file is required — the engine
 * produces believable spectrum / waveform / beat data driven by the current
 * track's BPM so every visualizer reacts as if it were analysing live audio.
 * A single shared instance is advanced once per animation frame, no matter how
 * many visualizers are reading from it.
 */
export const BAND_COUNT = 72;
export const WAVE_COUNT = 160;

class AudioSim {
  bands = new Float32Array(BAND_COUNT);
  wave = new Float32Array(WAVE_COUNT);
  energy = 0;
  bass = 0;
  beat = 0;
  time = 0;

  playing = false;
  bpm = 120;
  sensitivity = 1;
  speed = 1;

  private lastFrame = -1;

  /** Reads (and advances at most once per frame) the simulated analyser. */
  read(now: number): AudioSim {
    if (now === this.lastFrame) return this;
    const dt = this.lastFrame < 0 ? 0.016 : Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.playing) this.time += dt * this.speed;

    const t = this.time;
    const beatsPerSec = this.bpm / 60;
    const phase = t * beatsPerSec % 1;
    const kick = Math.pow(1 - phase, 5);
    const halfPhase = t * beatsPerSec * 0.5 % 1;
    const swell = 0.55 + 0.45 * Math.sin(halfPhase * Math.PI * 2);
    this.beat += ((this.playing ? kick : 0) - this.beat) * 0.4;

    let sum = 0;
    for (let i = 0; i < BAND_COUNT; i++) {
      const f = i / BAND_COUNT;
      const tilt = Math.pow(1 - f, 1.35) * 0.85 + 0.15;
      const n =
      0.5 +
      0.5 *
      Math.sin(t * (1.3 + i * 0.11) + i * 0.83) *
      Math.sin(t * (0.61 + i * 0.03) + i * 0.29);
      let target = (0.18 + 0.82 * n) * tilt * swell;
      target += kick * tilt * 0.85;
      target *= this.sensitivity;
      if (!this.playing) target *= 0.05;
      target = Math.min(1.35, target);
      const cur = this.bands[i];
      this.bands[i] = cur + (target - cur) * (target > cur ? 0.5 : 0.13);
      sum += this.bands[i];
    }
    this.energy = sum / BAND_COUNT;
    let bassSum = 0;
    for (let i = 0; i < 10; i++) bassSum += this.bands[i];
    this.bass = bassSum / 10;

    for (let i = 0; i < WAVE_COUNT; i++) {
      const x = i / WAVE_COUNT;
      const v =
      Math.sin(x * Math.PI * 4 + t * 2.2) * 0.5 +
      Math.sin(x * Math.PI * 9 - t * 1.4) * 0.28 +
      Math.sin(x * Math.PI * 17 + t * 3.1) * 0.14;
      this.wave[i] = v * (0.35 + this.energy * 1.1) * (this.playing ? 1 : 0.18);
    }
    return this;
  }
}

export const audioSim = new AudioSim();