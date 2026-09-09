import { beforeEach, describe, expect, it } from "vitest";
import { loadLeaderboard, recordScore } from "../src/storage/leaderboard.js";

describe("local leaderboard", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  it("persists a normalized score and nickname", () => {
    const saved = recordScore({
      nickname: "  ACE  ",
      score: 1250,
      level: 3,
      lines: 18,
    });

    expect(saved.nickname).toBe("ACE");
    expect(loadLeaderboard()).toEqual([saved]);
  });

  it("uses safe defaults for invalid score values", () => {
    const saved = recordScore({
      nickname: "   ",
      score: -20,
      level: 0,
      lines: -4,
    });

    expect(saved.nickname).toBe("PLAYER");
    expect(saved.score).toBe(0);
    expect(saved.level).toBe(1);
    expect(saved.lines).toBe(0);
  });

  it("keeps only the ten highest scores in descending order", () => {
    for (let i = 0; i < 12; i += 1) {
      recordScore({ nickname: `P${i}`, score: i * 100, level: 1, lines: i });
    }

    const scores = loadLeaderboard().map((entry) => entry.score);
    expect(scores).toHaveLength(10);
    expect(scores).toEqual([1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200]);
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
