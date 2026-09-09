import { afterEach, describe, expect, it, vi } from "vitest";
import { InputManager } from "../src/input/input-manager.js";
import type { TetrisGame } from "../src/game/tetris.js";

describe("InputManager drop timing", () => {
  let manager: InputManager | undefined;

  afterEach(() => {
    manager?.dispose();
    manager = undefined;
    vi.restoreAllMocks();
  });

  it("repeats soft drop at its interval instead of draining the piece immediately", () => {
    const softDrop = vi.fn().mockReturnValue(true);
    const game = fakeGame({ softDrop });
    manager = new InputManager(game);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown" }));
    expect(softDrop).toHaveBeenCalledTimes(1);

    manager.tick(16);
    expect(softDrop).toHaveBeenCalledTimes(1);

    manager.tick(34);
    expect(softDrop).toHaveBeenCalledTimes(2);
  });

  it("prevents the browser from activating a focused control on hard drop", () => {
    const hardDrop = vi.fn();
    const game = fakeGame({ softDrop: vi.fn() });
    game.hardDrop = hardDrop;
    manager = new InputManager(game);

    const event = new KeyboardEvent("keydown", { code: "Space", cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(hardDrop).toHaveBeenCalledTimes(1);
  });

  it("supports P as the documented pause shortcut", () => {
    const togglePause = vi.fn();
    const game = fakeGame({ softDrop: vi.fn() });
    game.togglePause = togglePause;
    manager = new InputManager(game);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyP" }));

    expect(togglePause).toHaveBeenCalledTimes(1);
  });
});

function fakeGame(methods: { softDrop: ReturnType<typeof vi.fn> }): TetrisGame {
  return {
    timing: { dasMs: 170, arrMs: 55, softDropMs: 50, lockDelayMs: 500 },
    getState: vi.fn().mockReturnValue("PLAYING"),
    softDrop: methods.softDrop,
    tryMove: vi.fn(),
    rotateCw: vi.fn(),
    rotateCcw: vi.fn(),
    hardDrop: vi.fn(),
    togglePause: vi.fn(),
    start: vi.fn(),
  } as unknown as TetrisGame;
}
