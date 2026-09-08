import { TOTAL_ROWS, type LockResult } from "./types.js";

/**
 * Per-line score multipliers, indexed by the number of lines cleared
 * simultaneously (1..4). Combos and T-spins are intentionally not implemented
 * to keep the game approachable.
 */
const LINE_SCORES = [0, 100, 300, 500, 800];

export const LINES_PER_LEVEL = 10;
export const MAX_LEVEL = 20;

/** Base soft-drop / hard-drop points (per cell). */
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

/** Minimum gravity interval (ms) at the highest level. */
export const MIN_GRAVITY_MS = 50;

/** Lock delay in ms before a settled piece is committed. */
export const LOCK_DELAY_MS = 500;

/**
 * Returns the gravity interval (ms per row) for a given level.
 * Uses the classic Tetris formula `1000 * 0.8 ^ (level - 1)` clamped to a
 * sensible minimum so the gameplay stays playable on the fastest levels.
 */
export function gravityMs(level: number): number {
  const lv = Math.max(1, Math.min(MAX_LEVEL, level));
  const raw = 1000 * Math.pow(0.8, lv - 1);
  return Math.max(MIN_GRAVITY_MS, raw);
}

/** Calculates score for a lock event. */
export function calculateLineScore(level: number, linesCleared: number): number {
  const base = LINE_SCORES[Math.max(0, Math.min(4, linesCleared))] ?? 0;
  return base * level;
}

/** Calculates the new level from total lines cleared. */
export function levelFor(lines: number): number {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(lines / LINES_PER_LEVEL) + 1));
}

export function applyLockReward(
  state: { score: number; level: number; lines: number },
  result: { cleared: number },
): { score: number; level: number; lines: number; leveledUp: boolean } {
  const newLines = state.lines + result.cleared;
  const newLevel = levelFor(newLines);
  const leveledUp = newLevel > state.level;
  const lineScore = calculateLineScore(state.level, result.cleared);
  return {
    score: state.score + lineScore,
    level: newLevel,
    lines: newLines,
    leveledUp,
  };
}

/** Re-exported for tests / downstream callers. */
export type { LockResult };
export { TOTAL_ROWS };
