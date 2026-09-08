import { HIDDEN_ROWS } from "./types.js";
import { spawnPiece, kickOffsets, pieceCells } from "./pieces.js";
import { collides, ghostY, hardDrop, mergePiece, clearLines, isAboveField } from "./board.js";
import {
  applyLockReward,
  gravityMs,
  HARD_DROP_POINTS,
  LINES_PER_LEVEL,
  LOCK_DELAY_MS,
  MAX_LEVEL,
  SOFT_DROP_POINTS,
} from "./scoring.js";
import { SevenBag } from "./bag.js";
import {
  type ActivePiece,
  type GameEvent,
  type GameStats,
  emptyStack,
  type GameState,
  type PieceType,
  type Stack,
  type StackCell,
} from "./types.js";

/** Timing settings used by the loop. All values are in milliseconds. */
export interface TimingSettings {
  /** DAS (Delayed Auto Shift): time the key has to be held before auto-repeat starts. */
  dasMs: number;
  /** ARR (Auto Repeat Rate): time between repeats while the key is held. */
  arrMs: number;
  /** Soft-drop rate while arrow down is held. */
  softDropMs: number;
  /** Lock delay before a settled piece is committed. */
  lockDelayMs: number;
}

export const DEFAULT_TIMING: TimingSettings = {
  dasMs: 133,
  arrMs: 33,
  softDropMs: 50,
  lockDelayMs: LOCK_DELAY_MS,
};

/** Snapshot of the public state of the game. Used by the renderer / UI. */
export interface GameSnapshot {
  state: GameState;
  stack: Stack;
  piece: ActivePiece | null;
  ghostY: number;
  next: PieceType[];
  stats: GameStats;
  lastEvents: ReadonlyArray<GameEvent>;
}

/** Result of attempting to spawn the next piece. */
interface SpawnResult {
  piece: ActivePiece | null;
  gameOver: boolean;
}

const PREVIEW_COUNT = 5;

/**
 * Pure game engine. Owns no DOM references and no timers of its own.
 * All mutations are deterministic given the same sequence of input actions.
 */
export class TetrisGame {
  private stack: StackCell[][] = emptyStack();
  private piece: ActivePiece | null = null;
  private bag = new SevenBag();
  private next: PieceType[] = this.bag.preview(PREVIEW_COUNT);
  private score = 0;
  private highScore = 0;
  private level = 1;
  private lines = 0;
  private state: GameState = "MENU";
  private lastEvents: GameEvent[] = [];
  private lockTimer = 0;
  private lockMoves = 0;
  private initialised = false;

  constructor(
    options: {
      highScore?: number;
      seed?: number | (() => number);
      timing?: TimingSettings;
      initialStack?: StackCell[][];
    } = {},
  ) {
    if (options.highScore !== undefined) this.highScore = options.highScore;
    if (options.seed !== undefined) this.bag = new SevenBag(options.seed);
    if (options.initialStack) this.stack = options.initialStack.map((row) => row.slice());
    this.timing = { ...DEFAULT_TIMING, ...(options.timing ?? {}) };
  }

  /** Mutable per-instance timing settings. */
  timing: TimingSettings;

  /** Current high score (for persistence). */
  getHighScore(): number {
    return this.highScore;
  }

  /** Override high score from persisted storage. */
  setHighScore(value: number): void {
    this.highScore = Math.max(0, Math.floor(value));
  }

  /** Returns an immutable snapshot of the visible game state. */
  snapshot(): GameSnapshot {
    return {
      state: this.state,
      stack: this.stack,
      piece: this.piece,
      ghostY: this.piece ? ghostY(this.stack, this.piece) : 0,
      next: this.next.slice(),
      stats: {
        score: this.score,
        highScore: this.highScore,
        level: this.level,
        lines: this.lines,
      },
      lastEvents: this.lastEvents.slice(),
    };
  }

  getState(): GameState {
    return this.state;
  }

  getStats(): GameStats {
    return {
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      lines: this.lines,
    };
  }

  /** Begins a new game. */
  start(): void {
    if (this.initialised) {
      this.stack = emptyStack();
    }
    this.initialised = true;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.lastEvents = [];
    this.bag = new SevenBag();
    this.next = this.bag.preview(PREVIEW_COUNT);
    const first = this.bag.next();
    this.next = this.bag.preview(PREVIEW_COUNT);
    const spawn = this.spawnNew(first);
    if (spawn.gameOver) {
      this.piece = null;
      this.state = "GAME_OVER";
    } else {
      this.piece = spawn.piece;
      this.state = "PLAYING";
    }
  }

  pause(): void {
    if (this.state === "PLAYING") this.state = "PAUSED";
  }

  resume(): void {
    if (this.state === "PAUSED") this.state = "PLAYING";
  }

  togglePause(): void {
    if (this.state === "PLAYING") this.pause();
    else if (this.state === "PAUSED") this.resume();
  }

  reset(): void {
    this.start();
  }

  /** Try to move the current piece by (dx, dy). Returns true if the piece actually moved. */
  tryMove(dx: number, dy: number): boolean {
    if (this.state !== "PLAYING" || !this.piece) return false;
    const next = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
    if (!collides(this.stack, next)) {
      this.piece = next;
      this.lastEvents.push({ kind: "move" });
      this.onPieceMoved();
      return true;
    }
    return false;
  }

  /** Rotate clockwise; uses SRS wall kicks. */
  rotateCw(): boolean {
    return this.rotateBy(1);
  }

  /** Rotate counter-clockwise; uses SRS wall kicks. */
  rotateCcw(): boolean {
    return this.rotateBy(-1);
  }

  /** Soft drop the piece by one row and award points. */
  softDrop(): boolean {
    if (this.state !== "PLAYING" || !this.piece) return false;
    if (this.tryMove(0, 1)) {
      this.score += SOFT_DROP_POINTS;
      this.lastEvents.push({ kind: "softDrop" });
      return true;
    }
    return false;
  }

  /** Hard drop: instantly lock the piece, award points. */
  hardDrop(): boolean {
    if (this.state !== "PLAYING" || !this.piece) return false;
    const result = hardDrop(this.stack, this.piece);
    this.stack = result.stack;
    this.score += result.distance * HARD_DROP_POINTS;
    this.lastEvents.push({ kind: "hardDrop", distance: result.distance });
    this.afterLock();
    return true;
  }

  /**
   * Called by the game loop every frame with the elapsed real time since the
   * previous frame (in ms). Advances gravity, lock delay, and soft drop.
   */
  tick(elapsedMs: number): void {
    if (this.state !== "PLAYING" || !this.piece) {
      this.lastEvents = [];
      return;
    }
    this.lastEvents = [];
    this.applyGravity(elapsedMs);
    this.applyLockDelay(elapsedMs);
  }

  /** Number of cleared rows in the most recent lock event. */
  private pendingClear = 0;
  /** Combo counter for cascading line clears. */
  private combo = -1;

  private applyGravity(elapsedMs: number): void {
    if (!this.piece) return;
    this.gravityAcc = (this.gravityAcc ?? 0) + elapsedMs;
    const interval = gravityMs(this.level);
    while (this.gravityAcc >= interval) {
      this.gravityAcc -= interval;
      if (!this.tryMove(0, 1)) {
        // Piece can't drop anymore; rely on lock delay.
        break;
      }
    }
  }

  private gravityAcc = 0;

  private applyLockDelay(elapsedMs: number): void {
    if (!this.piece) return;
    if (!this.pieceIsResting()) {
      this.lockTimer = 0;
      this.lockMoves = 0;
      return;
    }
    this.lockTimer += elapsedMs;
    if (this.lockTimer >= this.timing.lockDelayMs || this.lockMoves >= 15) {
      this.commitLock();
    }
  }

  private pieceIsResting(): boolean {
    if (!this.piece) return false;
    return collides(this.stack, { ...this.piece, y: this.piece.y + 1 });
  }

  private commitLock(): void {
    if (!this.piece) return;
    this.stack = mergePiece(this.stack, this.piece);
    this.lastEvents.push({ kind: "lock" });
    const cleared = clearLines(this.stack);
    this.stack = cleared.stack;
    this.pendingClear = cleared.cleared.length;
    if (this.pendingClear > 0) {
      const prevCombo = this.combo;
      this.combo = this.combo < 0 ? 0 : this.combo + 1;
      const result = applyLockReward(
        { score: this.score, level: this.level, lines: this.lines },
        { cleared: this.pendingClear },
      );
      this.score = result.score;
      this.level = result.level;
      this.lines = result.lines;
      const event: GameEvent =
        this.pendingClear === 4
          ? { kind: "tetris" }
          : { kind: "clear", lines: this.pendingClear, combo: prevCombo };
      this.lastEvents.push(event);
      if (result.leveledUp) this.lastEvents.push({ kind: "levelUp", level: result.level });
      this.updateHighScore();
    } else {
      this.combo = -1;
    }

    const upcoming = this.bag.next();
    this.next = this.bag.preview(PREVIEW_COUNT);
    const spawn = this.spawnNew(upcoming);
    if (spawn.gameOver || !spawn.piece) {
      this.piece = null;
      this.state = "GAME_OVER";
      this.lastEvents.push({ kind: "gameOver" });
    } else {
      this.piece = spawn.piece;
      this.lockTimer = 0;
      this.lockMoves = 0;
    }
  }

  private afterLock(): void {
    if (this.state !== "PLAYING") return;
    this.commitLock();
  }

  private onPieceMoved(): void {
    if (!this.piece) return;
    if (collides(this.stack, { ...this.piece, y: this.piece.y + 1 })) {
      this.lockMoves++;
    } else {
      this.lockTimer = 0;
      this.lockMoves = 0;
    }
  }

  private rotateBy(direction: 1 | -1): boolean {
    if (this.state !== "PLAYING" || !this.piece) return false;
    const from = this.piece.rotation;
    const to = ((((from + direction) % 4) + 4) % 4) as ActivePiece["rotation"];
    const kicks = kickOffsets(this.piece.type, from, to);
    for (const [dx, dy] of kicks) {
      const candidate: ActivePiece = {
        ...this.piece,
        rotation: to,
        x: this.piece.x + dx,
        y: this.piece.y - dy,
      };
      if (!collides(this.stack, candidate)) {
        this.piece = candidate;
        this.lastEvents.push({ kind: "rotate" });
        this.onPieceMoved();
        return true;
      }
    }
    return false;
  }

  private spawnNew(type: PieceType): SpawnResult {
    const piece = spawnPiece(type);
    piece.x = 3;

    // Immediate game over if the hidden buffer is already full.
    if (isAboveField(this.stack)) {
      return { piece: null, gameOver: true };
    }

    if (collides(this.stack, piece)) {
      // Try nudging up into the buffer; if that still collides, it's game over.
      for (let y = piece.y - 1; y >= 0; y--) {
        const test = { ...piece, y };
        if (!collides(this.stack, test)) {
          return { piece: test, gameOver: false };
        }
      }
      return { piece: null, gameOver: true };
    }
    return { piece, gameOver: false };
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) this.highScore = this.score;
  }

  /** Re-export constants for callers that want them alongside the class. */
  static readonly LINES_PER_LEVEL = LINES_PER_LEVEL;
  static readonly MAX_LEVEL = MAX_LEVEL;
  static readonly HIDDEN_ROWS = HIDDEN_ROWS;
}

export { pieceCells };
