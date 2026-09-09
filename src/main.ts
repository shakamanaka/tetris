import { TetrisGame } from "./game/tetris.js";
import { startGameLoop } from "./game/loop.js";
import { InputManager } from "./input/input-manager.js";
import { SfxEngine } from "./audio/sfx.js";
import { MusicPlayer } from "./audio/music.js";
import { renderGame, renderPreview } from "./render/renderer.js";
import { ScreenController } from "./ui/screens.js";
import { createLayoutController } from "./ui/layout.js";
import { loadSettings, saveSettings } from "./storage/persistence.js";
import type { Settings } from "./storage/persistence.js";
import { loadLeaderboard, recordScore } from "./storage/leaderboard.js";
import musicUrl from "./assets/music.ogg";

import "./styles.css";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Boots the application. The boot function is the only side-effectful entry
 * point; everything else is pure modules.
 */
function boot(): void {
  const initialSettings: Settings = loadSettings();
  const game = new TetrisGame({ highScore: initialSettings.highScore });
  const sfx = new SfxEngine();
  const music = new MusicPlayer(musicUrl);
  let nickname = initialSettings.nickname;
  let scoreSavedForGame = false;
  let lastRenderedState = game.getState();

  sfx.setVolume(initialSettings.sfxVolume);
  sfx.setMuted(!initialSettings.sfxEnabled);
  music.setVolume(initialSettings.musicVolume);
  music.setEnabled(initialSettings.musicEnabled);

  const boardCanvas = mustFind<HTMLCanvasElement>("#board");
  const previewCanvas = mustFind<HTMLCanvasElement>("#preview");
  const rawBoardCtx = boardCanvas.getContext("2d");
  const rawPreviewCtx = previewCanvas.getContext("2d");
  if (!rawBoardCtx || !rawPreviewCtx) throw new Error("2D canvas rendering unavailable");
  const boardCtx: CanvasRenderingContext2D = rawBoardCtx;
  const previewCtx: CanvasRenderingContext2D = rawPreviewCtx;

  const layout = createLayoutController(game, boardCanvas, boardCtx, previewCanvas, previewCtx);

  const screens = new ScreenController(game, {
    onPlay: () => {
      sfx.ensure();
      scoreSavedForGame = false;
      game.start();
      screens.showPlaying();
      layout.update();
      if (music.isEnabled()) music.play();
    },
    onSettings: () => screens.showSettings(),
    onQuit: () => {
      void getCurrentWindow().close();
    },
    onPlayAgain: () => {
      sfx.ensure();
      scoreSavedForGame = false;
      game.start();
      screens.hideGameOver();
      screens.showPlaying();
      layout.update();
      if (music.isEnabled()) music.play();
    },
    onMainMenu: () => {
      music.fadeOut();
      screens.hideGameOver();
      screens.showMenu();
    },
    onSaveScore: (requestedNickname) => {
      if (scoreSavedForGame || game.getState() !== "GAME_OVER") return;
      const stats = game.getStats();
      const entry = recordScore({
        nickname: requestedNickname,
        score: stats.score,
        level: stats.level,
        lines: stats.lines,
      });
      nickname = entry.nickname;
      scoreSavedForGame = true;
      persist({ ...loadSettings(), nickname: entry.nickname });
      screens.markScoreSaved(entry.nickname);
      screens.renderLeaderboard(loadLeaderboard());
    },
  });

  screens.showMenu();
  screens.renderLeaderboard(loadLeaderboard());
  screens.bindSettings(
    {
      musicEnabled: initialSettings.musicEnabled,
      sfxEnabled: initialSettings.sfxEnabled,
      musicVolume: initialSettings.musicVolume,
      sfxVolume: initialSettings.sfxVolume,
    },
    (next) => {
      music.setEnabled(next.musicEnabled);
      music.setVolume(next.musicVolume);
      sfx.setMuted(!next.sfxEnabled);
      sfx.setVolume(next.sfxVolume);
      persist({
        ...loadSettings(),
        musicEnabled: next.musicEnabled,
        sfxEnabled: next.sfxEnabled,
        musicVolume: next.musicVolume,
        sfxVolume: next.sfxVolume,
        highScore: game.getHighScore(),
      });
    },
  );

  const input = new InputManager(game);

  // Save high score when the window unloads.
  window.addEventListener("beforeunload", () => {
    layout.dispose();
    persist({ ...loadSettings(), highScore: game.getHighScore() });
  });

  startGameLoop(
    (dt) => {
      input.tick(dt);
      game.tick(dt);
    },
    () => {
      const snap = game.snapshot();
      renderGame(boardCtx, snap);
      renderPreview(previewCtx, snap.next);
      screens.refreshHud();

      // Sound effects driven by per-frame events.
      for (const ev of snap.lastEvents) {
        switch (ev.kind) {
          case "move":
            sfx.play("move");
            break;
          case "rotate":
            sfx.play("rotate");
            break;
          case "softDrop":
            sfx.play("softDrop");
            break;
          case "hardDrop":
            sfx.play("hardDrop");
            break;
          case "clear":
            sfx.play(ev.lines >= 4 ? "tetris" : "clear");
            break;
          case "tetris":
            sfx.play("tetris");
            break;
          case "levelUp":
            sfx.play("menu");
            break;
          case "gameOver":
            sfx.play("gameOver");
            music.fadeOut(1200);
            break;
        }
      }

      if (snap.state === "PAUSED") {
        screens.showPaused();
      } else if (snap.state === "PLAYING") {
        screens.hidePaused();
        if (lastRenderedState === "MENU" || lastRenderedState === "GAME_OVER") {
          scoreSavedForGame = false;
          screens.showPlaying();
        }
      } else if (snap.state === "GAME_OVER" && lastRenderedState !== "GAME_OVER") {
        screens.showGameOver(loadLeaderboard(), nickname);
      }

      lastRenderedState = snap.state;

      persistHighScore(game.getHighScore());
    },
  );

  // Save the high score when it changes (debounced via rAF).
  let pendingHigh = 0;
  function persistHighScore(value: number): void {
    if (value > pendingHigh) {
      pendingHigh = value;
      requestAnimationFrame(() => {
        if (pendingHigh > 0) {
          const settings = loadSettings();
          if (pendingHigh > settings.highScore) {
            saveSettings({ ...settings, highScore: pendingHigh });
          }
          pendingHigh = 0;
        }
      });
    }
  }

  function persist(s: Settings): void {
    saveSettings({ ...s, highScore: Math.max(s.highScore, game.getHighScore()) });
  }

  // Expose the running components for local debugging and manual smoke tests.
  Object.assign(window as unknown as { tetrix?: object }, { tetrix: { game, sfx, music, input } });
}

function mustFind<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required DOM element: ${selector}`);
  return el;
}

boot();
