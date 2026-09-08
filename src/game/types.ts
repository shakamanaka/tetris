/**
 * Core game types. Pure data structures that the game logic uses;
 * they have no dependencies on the DOM or rendering layer.
 */

export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 4;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

/** Seven classic tetromino ids. */
export const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

/** Rotation states: 0 = spawn, 1 = R (clockwise), 2 = 180, 3 = L (counter-clockwise). */
export type Rotation = 0 | 1 | 2 | 3;

/** A 2-D point in board coordinates. */
export interface Cell {
  x: number;
  y: number;
}

/**
 * The active piece. Coordinates are top-left of its 4x4 bounding box (3x3 for O)
 * measured against the visible board (rows >= HIDDEN_ROWS).
 */
export interface ActivePiece {
  type: PieceType;
  rotation: Rotation;
  /** Top-left X of the bounding box on the board. */
  x: number;
  /** Top-left Y of the bounding box on the board (negative allowed for spawn buffer). */
  y: number;
}

/** A single cell in the locked stack. `null` represents an empty cell. */
export type StackCell = { type: PieceType } | null;

/** A read-only snapshot of the locked portion of the board. */
export type Stack = ReadonlyArray<ReadonlyArray<StackCell>>;

/** Per-game statistics. */
export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  lines: number;
}

/** High-level game state machine. */
export type GameState = "MENU" | "PLAYING" | "PAUSED" | "GAME_OVER";

/** Events emitted by the game logic for the UI/audio layers to consume. */
export type GameEvent =
  | { kind: "move" }
  | { kind: "rotate" }
  | { kind: "softDrop" }
  | { kind: "hardDrop"; distance: number }
  | { kind: "lock" }
  | { kind: "clear"; lines: number; combo: number }
  | { kind: "tetris" }
  | { kind: "hold" }
  | { kind: "levelUp"; level: number }
  | { kind: "gameOver" };

/** Result of attempting to lock a piece. */
export interface LockResult {
  cleared: number;
  leveledUp: boolean;
  newLevel: number;
  gameOver: boolean;
}

/** Reusable empty board. */
export function emptyStack(): StackCell[][] {
  const grid: StackCell[][] = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    const row: StackCell[] = [];
    for (let x = 0; x < COLS; x++) row.push(null);
    grid.push(row);
  }
  return grid;
}

/** Deep clone a stack; used when mutating board state. */
export function cloneStack(stack: StackCell[][]): StackCell[][] {
  return stack.map((row) => row.slice());
}
