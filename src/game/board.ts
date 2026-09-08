import {
  COLS,
  ROWS,
  HIDDEN_ROWS,
  TOTAL_ROWS,
  type ActivePiece,
  type PieceType,
  type StackCell,
} from "./types.js";
import { pieceCells } from "./pieces.js";

/** A coordinate is inside the board (including hidden rows). */
export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < COLS && y >= HIDDEN_ROWS && y < TOTAL_ROWS;
}

/** A coordinate is inside the visible portion of the board. */
export function inVisibleBounds(x: number, y: number): boolean {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

/** True if the piece collides with the locked stack or the walls/floor. */
export function collides(stack: ReadonlyArray<ReadonlyArray<StackCell>>, piece: ActivePiece): boolean {
  for (const cell of pieceCells(piece)) {
    // Hidden rows above the playfield don't block the piece; we allow the piece to
    // exist above row 0 during spawn.
    if (cell.x < 0 || cell.x >= COLS) return true;
    if (cell.y >= TOTAL_ROWS) return true;
    if (cell.y < HIDDEN_ROWS) continue;
    if (stack[cell.y]?.[cell.x]) return true;
  }
  return false;
}

/** True if any cells of the piece are still inside the visible playfield. */
export function overlapsVisible(stack: ReadonlyArray<ReadonlyArray<StackCell>>, piece: ActivePiece): boolean {
  for (const cell of pieceCells(piece)) {
    if (cell.x < 0 || cell.x >= COLS) continue;
    if (cell.y < 0 || cell.y >= TOTAL_ROWS) continue;
    if (stack[cell.y]?.[cell.x]) return true;
  }
  return false;
}

/** Returns the Y position of the lowest resting place for the piece (ghost Y). */
export function ghostY(stack: ReadonlyArray<ReadonlyArray<StackCell>>, piece: ActivePiece): number {
  let drop = 0;
  while (!collides(stack, { ...piece, y: piece.y + drop + 1 })) drop++;
  return piece.y + drop;
}

/**
 * Drops the piece straight down until it collides and merges it into the stack.
 * Returns the number of cells it dropped and the new stack.
 */
export function hardDrop(
  stack: StackCell[][],
  piece: ActivePiece,
): { distance: number; stack: StackCell[][] } {
  const distance = ghostY(stack, piece) - piece.y;
  return { distance, stack: mergePiece(stack, { ...piece, y: piece.y + distance }) };
}

/** Writes the piece cells into the stack. Assumes the piece has been validated. */
export function mergePiece(stack: StackCell[][], piece: ActivePiece): StackCell[][] {
  const next = stack.map((row) => row.slice());
  for (const cell of pieceCells(piece)) {
    if (cell.y < HIDDEN_ROWS) continue;
    const row = next[cell.y];
    if (!row) continue;
    row[cell.x] = { type: piece.type };
  }
  return next;
}

/** Removes fully-filled rows. Returns the new stack and the indices that were cleared. */
export function clearLines(stack: StackCell[][]): { stack: StackCell[][]; cleared: ReadonlyArray<number> } {
  const cleared: number[] = [];
  for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
    const row = stack[y];
    if (!row) continue;
    if (row.every((c) => c !== null)) cleared.push(y);
  }
  if (cleared.length === 0) return { stack, cleared };

  // Rebuild the visible portion from scratch.
  const visible: StackCell[][] = [];
  for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
    if (cleared.includes(y)) continue;
    visible.push(stack[y]?.slice() ?? newArray(COLS));
  }
  // Insert blank rows at the top of the visible area.
  while (visible.length < ROWS) visible.unshift(newArray(COLS));

  const rebuilt: StackCell[][] = [];
  for (let y = 0; y < HIDDEN_ROWS; y++) rebuilt.push(newArray(COLS));
  for (const row of visible) rebuilt.push(row);
  return { stack: rebuilt, cleared };
}

function newArray(width: number): StackCell[] {
  const row: StackCell[] = [];
  for (let x = 0; x < width; x++) row.push(null);
  return row;
}

/** True if any cell above row HIDDEN_ROWS is occupied. */
export function isAboveField(stack: ReadonlyArray<ReadonlyArray<StackCell>>): boolean {
  for (let y = 0; y < HIDDEN_ROWS; y++) {
    const row = stack[y];
    if (!row) continue;
    for (const c of row) if (c !== null) return true;
  }
  return false;
}

/** Render-friendly helper: visible slice of the stack. */
export function visibleStack(
  stack: ReadonlyArray<ReadonlyArray<StackCell>>,
): ReadonlyArray<ReadonlyArray<StackCell>> {
  return stack.slice(HIDDEN_ROWS, HIDDEN_ROWS + ROWS);
}

export type { PieceType };
