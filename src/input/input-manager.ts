import type { TetrisGame } from "../game/tetris.js";

/**
 * Translates keyboard events into game actions and advances held-key repeat
 * from the application's fixed-step loop.
 *
 * Keeping repeat timing in the main loop makes input deterministic and avoids
 * a second requestAnimationFrame loop competing with the game simulation.
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
  held: boolean;
  heldSince: number;
  lastShift: number;
  dasActive: boolean;
}

export interface InputManagerOptions {
  bindings?: Partial<InputBindings>;
  dasMs?: number;
  arrMs?: number;
  softDropMs?: number;
}

export class InputManager {
  private bindings: InputBindings;
  private game: TetrisGame;
  private dasMs: number;
  private arrMs: number;
  private softDropMs: number;
  private left: KeyState = this.freshKey();
  private right: KeyState = this.freshKey();
  private softDrop: KeyState = this.freshKey();
  private onKeyDown: (event: KeyboardEvent) => void;
  private onKeyUp: (event: KeyboardEvent) => void;
  private onBlur: () => void;

  constructor(game: TetrisGame, options: InputManagerOptions = {}) {
    this.game = game;
    this.bindings = { ...DEFAULT_BINDINGS, ...(options.bindings ?? {}) };
    this.dasMs = options.dasMs ?? game.timing.dasMs;
    this.arrMs = options.arrMs ?? game.timing.arrMs;
    this.softDropMs = options.softDropMs ?? game.timing.softDropMs;
    this.onKeyDown = (event) => this.handleKeyDown(event);
    this.onKeyUp = (event) => this.handleKeyUp(event);
    this.onBlur = () => this.handleBlur();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  private freshKey(): KeyState {
    return { held: false, heldSince: 0, lastShift: 0, dasActive: false };
  }

  private isGameKey(code: string): boolean {
    return Object.values(this.bindings).includes(code) || this.isPauseKey(code);
  }

  private isPauseKey(code: string): boolean {
    return code === this.bindings.pause || (this.bindings.pause === "Escape" && code === "KeyP");
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat || !this.isGameKey(event.code)) return;
    if (event.code !== this.bindings.pause && event.code !== this.bindings.restart) {
      event.preventDefault();
    }

    if (event.code === this.bindings.left) {
      this.left = { held: true, heldSince: 0, lastShift: 0, dasActive: false };
      this.game.tryMove(-1, 0);
    } else if (event.code === this.bindings.right) {
      this.right = { held: true, heldSince: 0, lastShift: 0, dasActive: false };
      this.game.tryMove(1, 0);
    } else if (event.code === this.bindings.softDrop) {
      this.softDrop = { held: true, heldSince: 0, lastShift: 0, dasActive: true };
      this.game.softDrop();
    } else if (event.code === this.bindings.rotateCw) {
      this.game.rotateCw();
    } else if (event.code === this.bindings.rotateCcw) {
      this.game.rotateCcw();
    } else if (event.code === this.bindings.hardDrop) {
      this.game.hardDrop();
    } else if (this.isPauseKey(event.code)) {
      this.game.togglePause();
    } else if (event.code === this.bindings.restart) {
      this.game.start();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.code === this.bindings.left) this.left = this.freshKey();
    else if (event.code === this.bindings.right) this.right = this.freshKey();
    else if (event.code === this.bindings.softDrop) this.softDrop = this.freshKey();
  }

  private handleBlur(): void {
    this.left = this.freshKey();
    this.right = this.freshKey();
    this.softDrop = this.freshKey();
  }

  /** Advances held-key repeat by one fixed simulation step. */
  tick(elapsedMs: number): void {
    if (this.game.getState() !== "PLAYING") return;
    if (this.left.held) this.repeatHorizontal(this.left, -1, elapsedMs);
    if (this.right.held) this.repeatHorizontal(this.right, 1, elapsedMs);
    if (this.softDrop.held) {
      this.softDrop.lastShift += elapsedMs;
      while (this.softDrop.lastShift >= this.softDropMs) {
        this.softDrop.lastShift -= this.softDropMs;
        this.game.softDrop();
      }
    }
  }

  private repeatHorizontal(state: KeyState, dx: number, elapsedMs: number): void {
    state.heldSince += elapsedMs;
    state.lastShift += elapsedMs;
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

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}
