import { TetrisGame } from "./game/tetris.js";
import { startGameLoop } from "./game/loop.js";
import { InputManager } from "./game/input.js";
import { SfxEngine } from "./audio/sfx.js";
import { MusicPlayer } from "./audio/music.js";
import { renderGame, renderPreview, BOARD_PADDING } from "./render/renderer.js";
import { ScreenController } from "./ui/screens.js";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./storage/persistence.js";
import type { Settings } from "./storage/persistence.js";
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

  // Configure canvas resolution to match its CSS pixel size at devicePixelRatio.
  function resizeCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    cssWidth: number,
    cssHeight: number,
  ): void {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateLayout(): void {
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const padY = Math.max(8, Math.min(24, Math.floor(vh * 0.03)));
    const padX = Math.max(8, Math.min(24, Math.floor(vw * 0.03)));
    const gap = Math.max(10, Math.min(24, Math.floor(vw * 0.02)));

    const availH = vh - padY * 2;
    const availW = vw - padX * 2;

    const isNarrow = vw < 540;

    let boardWidth: number;
    let boardHeight: number;
    let sidebarWidth: number;

    if (isNarrow) {
      sidebarWidth = Math.min(availW, 360);
      const availBoardH = Math.max(200, availH - 220 - gap);
      const maxCellH = Math.floor((availBoardH - BOARD_PADDING * 2) / 20);
      const maxCellW = Math.floor((availW - BOARD_PADDING * 2) / 10);
      const cellSize = Math.max(10, Math.min(maxCellH, maxCellW, 32));
      boardWidth = 10 * cellSize + BOARD_PADDING * 2;
      boardHeight = 20 * cellSize + BOARD_PADDING * 2;
    } else {
      sidebarWidth = Math.max(170, Math.min(230, Math.floor(availW * 0.28)));
      const availBoardW = availW - sidebarWidth - gap;

      const maxCellH = Math.floor((availH - BOARD_PADDING * 2) / 20);
      const maxCellW = Math.floor((availBoardW - BOARD_PADDING * 2) / 10);
      const cellSize = Math.max(12, Math.min(maxCellH, maxCellW, 36));

      boardWidth = 10 * cellSize + BOARD_PADDING * 2;
      boardHeight = 20 * cellSize + BOARD_PADDING * 2;
    }

    const previewWidth = Math.max(80, Math.min(160, sidebarWidth - 28));
    const previewHeight = Math.max(80, Math.min(140, Math.floor(boardHeight * 0.24)));

    resizeCanvas(boardCanvas, boardCtx, boardWidth, boardHeight);
    resizeCanvas(previewCanvas, previewCtx, previewWidth, previewHeight);

    const sidebarEl = document.querySelector<HTMLElement>(".sidebar");
    if (sidebarEl) {
      sidebarEl.style.width = isNarrow ? "100%" : `${sidebarWidth}px`;
      sidebarEl.style.maxHeight = isNarrow ? "none" : `${boardHeight}px`;
    }

    const snap = game.snapshot();
    renderGame(boardCtx, snap);
    renderPreview(previewCtx, snap.next);
  }

  window.addEventListener("resize", updateLayout);
  window.addEventListener("orientationchange", updateLayout);
  updateLayout();

  const screens = new ScreenController(game, {
    onPlay: () => {
      sfx.ensure();
      game.start();
      screens.showPlaying();
      updateLayout();
      if (music.isEnabled()) music.play();
    },
    onSettings: () => screens.showSettings(),
    onQuit: () => {
      void getCurrentWindow().close();
    },
    onPlayAgain: () => {
      sfx.ensure();
      game.start();
      screens.hideGameOver();
      screens.showPlaying();
      updateLayout();
      if (music.isEnabled()) music.play();
    },
    onMainMenu: () => {
      music.fadeOut();
      screens.hideGameOver();
      screens.showMenu();
    },
  });

  screens.showMenu();
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
        ...initialSettings,
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
    persist({ ...loadSettings(), highScore: game.getHighScore() });
  });

  startGameLoop(
    (dt) => {
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
            screens.showGameOver();
            break;
        }
      }

      if (snap.state === "PAUSED") {
        screens.showPaused();
      } else if (snap.state === "PLAYING") {
        screens.hidePaused();
      }

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

  // Ensure default settings are written on first launch.
  if (!localStorageAvailable()) {
    saveSettings(DEFAULT_SETTINGS);
  }

  // Expose for debug / tests if needed.
  Object.assign(window as unknown as { tetrix?: object }, { tetrix: { game, sfx, music, input } });
}

function localStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function mustFind<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required DOM element: ${selector}`);
  return el;
}

boot();
