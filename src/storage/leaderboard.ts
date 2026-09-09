import { readJson, writeJson } from "./local-storage.js";

/**
 * Local leaderboard persistence.
 *
 * Scores stay in the current browser / WebView profile and are intentionally
 * limited to a small top-ten list. No network account or backend is needed.
 */

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  level: number;
  lines: number;
  playedAt: number;
}

export interface ScoreRecord {
  nickname: string;
  score: number;
  level: number;
  lines: number;
}

export const LEADERBOARD_LIMIT = 10;
export const MAX_NICKNAME_LENGTH = 12;
export const DEFAULT_NICKNAME = "PLAYER";

const STORAGE_KEY = "tetrix.leaderboard.v1";

/** Returns a compact, display-safe nickname for storage and the UI. */
export function normalizeNickname(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);
  return normalized || DEFAULT_NICKNAME;
}

/** Loads, validates, sorts, and limits the persisted scores. */
export function loadLeaderboard(): LeaderboardEntry[] {
  const parsed = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(toEntry)
    .filter((entry): entry is LeaderboardEntry => entry !== null)
    .sort(compareEntries)
    .slice(0, LEADERBOARD_LIMIT);
}

/** Adds one completed game and persists the resulting top-ten list. */
export function recordScore(record: ScoreRecord): LeaderboardEntry {
  const entry: LeaderboardEntry = {
    nickname: normalizeNickname(record.nickname),
    score: nonNegativeInteger(record.score),
    level: positiveInteger(record.level),
    lines: nonNegativeInteger(record.lines),
    playedAt: Date.now(),
  };
  saveLeaderboard([...loadLeaderboard(), entry]);
  return entry;
}

export function saveLeaderboard(entries: ReadonlyArray<LeaderboardEntry>): void {
  const cleanEntries = entries
    .map(toEntry)
    .filter((entry): entry is LeaderboardEntry => entry !== null)
    .sort(compareEntries)
    .slice(0, LEADERBOARD_LIMIT);
  writeJson(STORAGE_KEY, cleanEntries);
}

function toEntry(value: unknown): LeaderboardEntry | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.nickname !== "string" ||
    typeof value.score !== "number" ||
    typeof value.level !== "number" ||
    typeof value.lines !== "number" ||
    typeof value.playedAt !== "number"
  ) {
    return null;
  }
  if (![value.score, value.level, value.lines, value.playedAt].every(Number.isFinite)) {
    return null;
  }

  return {
    nickname: normalizeNickname(value.nickname),
    score: nonNegativeInteger(value.score),
    level: positiveInteger(value.level),
    lines: nonNegativeInteger(value.lines),
    playedAt: Math.max(0, Math.floor(value.playedAt)),
  };
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.score - a.score || b.lines - a.lines || b.level - a.level || b.playedAt - a.playedAt;
}

function nonNegativeInteger(value: number): number {
  return Math.max(0, Math.floor(value));
}

function positiveInteger(value: number): number {
  return Math.max(1, Math.floor(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
