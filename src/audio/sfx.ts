/**
 * Procedural sound effect generator using the Web Audio API.
 *
 * The synthesised effects are intentionally short and arcade-like so the
 * game feels responsive without depending on external assets.
 */

export type SoundEffectName =
  "move" | "rotate" | "softDrop" | "hardDrop" | "clear" | "tetris" | "gameOver" | "menu";

interface Envelope {
  attack: number;
  decay: number;
  release: number;
  peak: number;
  sustain: number;
}

const ENVELOPE_PRESETS: Record<SoundEffectName, Envelope> = {
  move: { attack: 0.001, decay: 0.04, release: 0.02, peak: 0.18, sustain: 0.05 },
  rotate: { attack: 0.001, decay: 0.05, release: 0.03, peak: 0.18, sustain: 0.06 },
  softDrop: { attack: 0.001, decay: 0.04, release: 0.02, peak: 0.2, sustain: 0.05 },
  hardDrop: { attack: 0.001, decay: 0.07, release: 0.06, peak: 0.35, sustain: 0.1 },
  clear: { attack: 0.002, decay: 0.16, release: 0.05, peak: 0.32, sustain: 0.18 },
  tetris: { attack: 0.002, decay: 0.45, release: 0.1, peak: 0.38, sustain: 0.25 },
  gameOver: { attack: 0.005, decay: 0.4, release: 0.4, peak: 0.4, sustain: 0.25 },
  menu: { attack: 0.001, decay: 0.05, release: 0.05, peak: 0.22, sustain: 0.1 },
};

const FREQ_PRESETS: Record<
  SoundEffectName,
  ReadonlyArray<{ freq: number; type: OscillatorType; offset?: number }>
> = {
  move: [{ freq: 240, type: "square" }],
  rotate: [{ freq: 360, type: "square" }],
  softDrop: [{ freq: 180, type: "triangle" }],
  hardDrop: [{ freq: 110, type: "square", offset: 0.0 }],
  clear: [
    { freq: 660, type: "square" },
    { freq: 880, type: "square", offset: 0.06 },
  ],
  tetris: [
    { freq: 523.25, type: "square" },
    { freq: 659.25, type: "square", offset: 0.07 },
    { freq: 783.99, type: "square", offset: 0.14 },
    { freq: 1046.5, type: "square", offset: 0.21 },
  ],
  gameOver: [
    { freq: 392, type: "sawtooth" },
    { freq: 311.13, type: "sawtooth", offset: 0.12 },
    { freq: 233.08, type: "sawtooth", offset: 0.24 },
    { freq: 174.61, type: "sawtooth", offset: 0.36 },
  ],
  menu: [{ freq: 520, type: "square" }],
};

export class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.6;
  private muted = false;

  /** Ensures the audio context exists and is running. Safe to call repeatedly. */
  ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        (
          window as unknown as {
            AudioContext?: typeof AudioContext;
            webkitAudioContext?: typeof AudioContext;
          }
        ).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio API not supported in this environment");
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Plays the given effect. Safe to call when muted (no-op except for `ensure`). */
  play(name: SoundEffectName): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!this.master) return;
    const env = ENVELOPE_PRESETS[name];
    const voices = FREQ_PRESETS[name];
    const start = ctx.currentTime;

    for (const voice of voices) {
      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.value = voice.freq;

      const gain = ctx.createGain();
      const at = start + (voice.offset ?? 0);
      const release = (voice.offset ?? 0) + env.attack + env.decay + env.release;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(env.peak, at + env.attack);
      gain.gain.linearRampToValueAtTime(env.sustain, at + env.attack + env.decay);
      gain.gain.linearRampToValueAtTime(0, at + env.attack + env.decay + env.release);

      osc.connect(gain);
      gain.connect(this.master);
      osc.start(at);
      osc.stop(at + release + 0.05);
    }
  }
}
