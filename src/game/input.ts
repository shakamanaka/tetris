import { TetrisGame } from "./tetris.js";

/**
 * Input manager: translates keyboard events into Tetris actions and applies
 * Delayed Auto Shift (DAS) and Auto Repeat Rate (ARR) for horizontal movement.
 *
 * The keyboard event listeners are attached on construction and detached when
 * `dispose()` is called. Soft drop uses its own repeat rate; rotation, hard
 * drop, pause, restart, and hold are single-shot actions.
 */
export interface InputBindings {
  left: string;
  right: string;
  rotateCw: string;
  rotateCcw: string;
  softDrop: string;
  hardDrop: string;
  pause: string;
  restart: string;
}

export const DEFAULT_BINDINGS: InputBindings = {
  left: "ArrowLeft",
  right: "ArrowRight",
  rotateCw: "ArrowUp",
  rotateCcw: "KeyZ",
  softDrop: "ArrowDown",
  hardDrop: "Space",
  pause: "Escape",
  restart: "KeyR",
};

interface KeyState {
  /** True if the key is currently held down. */
  held: boolean;
  /** ms elapsed since the key was first pressed. */
  heldSince: number;
  /** ms since the last auto-shift movement. */
  lastShift: number;
  /** Whether DAS has expired and auto-shift is active. */
  dasActive: boolean;
}

export interface InputManagerOptions {
  bindings?: Partial<InputBindings>;
  dasMs?: number;
  arrMs?: number;
  softDropMs?: number;
}

/**
 * Creates an InputManager bound to the given game. Call `dispose()` to
 * remove the listeners when the game is torn down.
 */
export class InputManager {
  private bindings: InputBindings;
  private game: TetrisGame;
  private dasMs: number;
  private arrMs: number;
  private softDropMs: number;
  private rafId = 0;
  private running = false;
  private left: KeyState = this.freshKey();
  private right: KeyState = this.freshKey();
  private softDrop: KeyState = this.freshKey();
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onBlur: () => void;

  constructor(game: TetrisGame, options: InputManagerOptions = {}) {
    this.game = game;
    this.bindings = { ...DEFAULT_BINDINGS, ...(options.bindings ?? {}) };
    this.dasMs = options.dasMs ?? game.timing.dasMs;
    this.arrMs = options.arrMs ?? game.timing.arrMs;
    this.softDropMs = options.softDropMs ?? game.timing.softDropMs;
    this.onKeyDown = (e) => this.handleKeyDown(e);
    this.onKeyUp = (e) => this.handleKeyUp(e);
    this.onBlur = () => this.handleBlur();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  private freshKey(): KeyState {
    return { held: false, heldSince: 0, lastShift: 0, dasActive: false };
  }

  private isGameKey(code: string): boolean {
    return Object.values(this.bindings).includes(code);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (!this.isGameKey(e.code)) return;
    if (
      e.code !== this.bindings.pause &&
      e.code !== this.bindings.restart &&
      e.code !== this.bindings.hardDrop
    ) {
      e.preventDefault();
    }
    const now = performance.now();
    if (e.code === this.bindings.left) {
      this.left = { held: true, heldSince: now, lastShift: now, dasActive: false };
      this.game.tryMove(-1, 0);
    } else if (e.code === this.bindings.right) {
      this.right = { held: true, heldSince: now, lastShift: now, dasActive: false };
      this.game.tryMove(1, 0);
    } else if (e.code === this.bindings.softDrop) {
      this.softDrop = { held: true, heldSince: now, lastShift: now, dasActive: true };
      this.game.softDrop();
    } else if (e.code === this.bindings.rotateCw) {
      this.game.rotateCw();
    } else if (e.code === this.bindings.rotateCcw) {
      this.game.rotateCcw();
    } else if (e.code === this.bindings.hardDrop) {
      this.game.hardDrop();
    } else if (e.code === this.bindings.pause) {
      this.game.togglePause();
    } else if (e.code === this.bindings.restart) {
      this.game.start();
    }
    this.ensureLoop();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === this.bindings.left) this.left = this.freshKey();
    else if (e.code === this.bindings.right) this.right = this.freshKey();
    else if (e.code === this.bindings.softDrop) this.softDrop = this.freshKey();
    if (!this.left.held && !this.right.held && !this.softDrop.held) {
      cancelAnimationFrame(this.rafId);
      this.running = false;
      this.rafId = 0;
    }
  }

  private handleBlur(): void {
    this.left = this.freshKey();
    this.right = this.freshKey();
    this.softDrop = this.freshKey();
  }

  private ensureLoop(): void {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      this.tickAutoRepeat(dt);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private tickAutoRepeat(dt: number): void {
    if (this.left.held) this.repeatHorizontal(this.left, -1, dt);
    if (this.right.held) this.repeatHorizontal(this.right, 1, dt);
    if (this.softDrop.held) {
      this.softDrop.lastShift += dt;
      while (this.softDrop.lastShift >= this.softDropMs) {
        this.softDrop.lastShift -= this.softDropMs;
        this.game.softDrop();
      }
    }
    if (!this.left.held && !this.right.held && !this.softDrop.held) {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private repeatHorizontal(state: KeyState, dx: number, dt: number): void {
    state.heldSince += dt;
    state.lastShift += dt;
    if (!state.dasActive && state.heldSince >= this.dasMs) {
      state.dasActive = true;
      state.lastShift = 0;
    }
    if (!state.dasActive) return;
    while (state.lastShift >= this.arrMs) {
      state.lastShift -= this.arrMs;
      this.game.tryMove(dx, 0);
    }
  }

  /** Stop listening and cancel any pending auto-repeat frames. */
  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.running = false;
  }
}
