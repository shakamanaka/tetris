import { DEFAULT_NICKNAME, normalizeNickname } from "./leaderboard.js";
import { readJson, writeJson } from "./local-storage.js";

/**
 * Persistent storage for high score, user settings, and the preferred nickname.
 *
 * Uses localStorage when available (works in browsers and inside Tauri's
 * WebView). Each setting is namespaced under the same key so we can read /
 * write the whole record atomically.
 */

export interface Settings {
  highScore: number;
  nickname: string;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  highScore: 0,
  nickname: DEFAULT_NICKNAME,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.6,
};

const STORAGE_KEY = "tetrix.settings.v1";

export function loadSettings(): Settings {
  const parsed = readJson<unknown>(STORAGE_KEY, null);
  if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS };
  return {
    highScore: nonNegativeInteger(parsed.highScore, DEFAULT_SETTINGS.highScore),
    nickname: normalizeNickname(typeof parsed.nickname === "string" ? parsed.nickname : DEFAULT_NICKNAME),
    musicEnabled: booleanOr(parsed.musicEnabled, DEFAULT_SETTINGS.musicEnabled),
    sfxEnabled: booleanOr(parsed.sfxEnabled, DEFAULT_SETTINGS.sfxEnabled),
    musicVolume: volumeOr(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: volumeOr(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
  };
}

export function saveSettings(settings: Settings): void {
  writeJson(STORAGE_KEY, settings);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function volumeOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
