/**
 * Background music playback. Loads the bundled OGG/Vorbis file via an
 * HTMLAudioElement so it integrates with the system volume and loops cleanly.
 */

export class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private enabled = true;
  private volume = 0.35;
  private source: string;
  private fadeFrame: number | null = null;

  constructor(source: string) {
    this.source = source;
  }

  /** Lazily creates the HTMLAudioElement on first use. */
  private ensure(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio(this.source);
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.volume = this.enabled ? this.volume : 0;
    }
    return this.audio;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.audio) this.audio.volume = enabled ? this.volume : 0;
    if (!enabled) this.stop();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.audio && this.enabled) this.audio.volume = this.volume;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Begin playing from the start. */
  play(): void {
    if (!this.enabled) return;
    const a = this.ensure();
    a.currentTime = 0;
    void a.play().catch(() => {
      /* Autoplay might be blocked until first user interaction. */
    });
  }

  /** Smoothly reduce the volume to zero, then pause the track. */
  fadeOut(durationMs = 600): void {
    if (!this.audio) return;
    if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
    const a = this.audio;
    const startVol = a.volume;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      a.volume = startVol * (1 - t);
      if (t < 1) {
        this.fadeFrame = requestAnimationFrame(tick);
      } else {
        a.pause();
        a.volume = this.enabled ? this.volume : 0;
        this.fadeFrame = null;
      }
    };
    this.fadeFrame = requestAnimationFrame(tick);
  }

  /** Pause immediately without fading. */
  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
  }
}
