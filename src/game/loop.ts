/**
 * Fixed-step game loop driven by requestAnimationFrame.
 *
 * Uses a time accumulator to ensure the game simulation advances at a
 * deterministic rate independent of the monitor's refresh rate. Rendering is
 * decoupled from the simulation step and happens every animation frame so the
 * displayed state is always fresh.
 */
export type SimulationStep = (elapsedMs: number) => void;
export type RenderStep = (interpolation: number) => void;

export interface GameLoopHandle {
  /** Stops the loop and detaches the rAF handler. */
  stop(): void;
  /** Pauses without losing accumulated time. */
  pause(): void;
  /** Resumes a paused loop. */
  resume(): void;
  /** Returns whether the loop is currently stepping. */
  isRunning(): boolean;
}

export interface GameLoopOptions {
  /** Maximum simulation time processed per frame to avoid spiral-of-death. */
  maxStepMs?: number;
  /** Optional callback invoked after the loop is stopped. */
  onStop?: () => void;
}

/**
 * Starts a requestAnimationFrame loop. `simulate(dt)` is called once per
 * accumulated time slice, `render(alpha)` is called once per frame for visual
 * interpolation. Both are no-ops if the loop is paused.
 */
export function startGameLoop(
  simulate: SimulationStep,
  render: RenderStep,
  options: GameLoopOptions = {},
): GameLoopHandle {
  const maxStep = options.maxStepMs ?? 100;
  let last = performance.now();
  let acc = 0;
  let stopped = false;
  let paused = false;
  let rafId = 0;

  const step = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(step);
    if (paused) {
      last = now;
      return;
    }
    const dt = Math.min(now - last, maxStep);
    last = now;
    acc += dt;
    while (acc >= 16) {
      simulate(16);
      acc -= 16;
    }
    render(acc / 16);
  };

  rafId = requestAnimationFrame(step);

  return {
    stop(): void {
      stopped = true;
      cancelAnimationFrame(rafId);
      options.onStop?.();
    },
    pause(): void {
      paused = true;
    },
    resume(): void {
      paused = false;
      last = performance.now();
    },
    isRunning(): boolean {
      return !stopped && !paused;
    },
  };
}
