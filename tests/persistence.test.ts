import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings } from "../src/storage/persistence.js";

describe("settings persistence", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  it("falls back safely when persisted settings have invalid values", () => {
    window.localStorage.setItem(
      "tetris.settings.v1",
      JSON.stringify({
        highScore: -100,
        nickname: "   PLAYER   ",
        musicEnabled: "yes",
        sfxEnabled: false,
        musicVolume: 2,
        sfxVolume: -1,
      }),
    );

    expect(loadSettings()).toEqual({
      highScore: 0,
      nickname: "PLAYER",
      musicEnabled: true,
      sfxEnabled: false,
      musicVolume: 1,
      sfxVolume: 0,
    });
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
