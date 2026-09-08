import { TetrisGame } from "../game/tetris.js";
import { DEFAULT_BINDINGS } from "../game/input.js";

export interface ScreenOptions {
  onPlay: () => void;
  onSettings: () => void;
  onQuit: () => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

/**
 * Lightweight screen controller that swaps between menu, playing, paused,
 * game-over, and settings overlays using plain DOM manipulation.
 *
 * The play canvas and HUD are mounted once; the overlays are toggled by
 * adding/removing the `visible` class.
 */
export class ScreenController {
  private menu: HTMLElement;
  private settings: HTMLElement;
  private gameOver: HTMLElement;
  private pauseOverlay: HTMLElement;
  private stats: HTMLElement;
  private next: HTMLElement;
  private finalScore: HTMLElement;
  private finalHigh: HTMLElement;
  private finalLevel: HTMLElement;
  private finalLines: HTMLElement;
  private musicToggle: HTMLInputElement;
  private sfxToggle: HTMLInputElement;
  private musicVolume: HTMLInputElement;
  private sfxVolume: HTMLInputElement;
  private game: TetrisGame;

  constructor(game: TetrisGame, opts: ScreenOptions) {
    this.game = game;
    this.menu = mustFind("#screen-menu");
    this.settings = mustFind("#screen-settings");
    this.gameOver = mustFind("#screen-gameover");
    this.pauseOverlay = mustFind("#screen-pause");
    this.stats = mustFind("#stats");
    this.next = mustFind("#next-label");
    this.finalScore = mustFind("#final-score");
    this.finalHigh = mustFind("#final-high");
    this.finalLevel = mustFind("#final-level");
    this.finalLines = mustFind("#final-lines");
    this.musicToggle = mustFind<HTMLInputElement>("#toggle-music");
    this.sfxToggle = mustFind<HTMLInputElement>("#toggle-sfx");
    this.musicVolume = mustFind<HTMLInputElement>("#volume-music");
    this.sfxVolume = mustFind<HTMLInputElement>("#volume-sfx");

    wireButton("#btn-play", opts.onPlay);
    wireButton("#btn-settings", opts.onSettings);
    wireButton("#btn-quit", opts.onQuit);
    wireButton("#btn-settings-back", opts.onMainMenu);
    wireButton("#btn-play-again", opts.onPlayAgain);
    wireButton("#btn-main-menu", opts.onMainMenu);

    this.renderControlsList();
  }

  private renderControlsList(): void {
    const list = document.getElementById("controls-list");
    if (!list) return;
    list.innerHTML = "";
    const items: Array<[string, string]> = [
      ["Move Left", keyLabel(DEFAULT_BINDINGS.left)],
      ["Move Right", keyLabel(DEFAULT_BINDINGS.right)],
      ["Soft Drop", keyLabel(DEFAULT_BINDINGS.softDrop)],
      ["Rotate CW", keyLabel(DEFAULT_BINDINGS.rotateCw)],
      ["Rotate CCW", keyLabel(DEFAULT_BINDINGS.rotateCcw)],
      ["Hard Drop", keyLabel(DEFAULT_BINDINGS.hardDrop)],
      ["Pause", `${keyLabel(DEFAULT_BINDINGS.pause)} / ${keyLabel("KeyP")}`],
      ["Restart", keyLabel(DEFAULT_BINDINGS.restart)],
    ];
    for (const [action, key] of items) {
      const row = document.createElement("div");
      row.className = "control-row";
      const actionEl = document.createElement("span");
      actionEl.className = "control-action";
      actionEl.textContent = action;
      const keyEl = document.createElement("span");
      keyEl.className = "control-key";
      keyEl.textContent = key;
      row.appendChild(actionEl);
      row.appendChild(keyEl);
      list.appendChild(row);
    }
  }

  showMenu(): void {
    setVisible(this.menu, true);
    setVisible(this.settings, false);
    setVisible(this.gameOver, false);
    setVisible(this.pauseOverlay, false);
  }

  showSettings(): void {
    setVisible(this.menu, false);
    setVisible(this.settings, true);
    setVisible(this.gameOver, false);
    setVisible(this.pauseOverlay, false);
  }

  showPlaying(): void {
    setVisible(this.menu, false);
    setVisible(this.settings, false);
    setVisible(this.gameOver, false);
    setVisible(this.pauseOverlay, false);
  }

  showPaused(): void {
    setVisible(this.pauseOverlay, true);
  }

  hidePaused(): void {
    setVisible(this.pauseOverlay, false);
  }

  showGameOver(): void {
    const stats = this.game.getStats();
    this.finalScore.textContent = stats.score.toLocaleString("en-US");
    this.finalHigh.textContent = stats.highScore.toLocaleString("en-US");
    this.finalLevel.textContent = stats.level.toString();
    this.finalLines.textContent = stats.lines.toString();
    setVisible(this.gameOver, true);
  }

  hideGameOver(): void {
    setVisible(this.gameOver, false);
  }

  /** Refresh the stats / next piece sidebar from the current snapshot. */
  refreshHud(): void {
    const s = this.game.getStats();
    this.stats.innerHTML = "";
    this.stats.appendChild(makeStatRow("SCORE", formatNumber(s.score)));
    this.stats.appendChild(makeStatRow("HIGH SCORE", formatNumber(s.highScore)));
    this.stats.appendChild(makeStatRow("LEVEL", s.level.toString()));
    this.stats.appendChild(makeStatRow("LINES", s.lines.toString()));
    this.next.textContent = this.game.snapshot().next.join(" ");
  }

  bindSettings(
    initial: { musicEnabled: boolean; sfxEnabled: boolean; musicVolume: number; sfxVolume: number },
    onChange: (next: {
      musicEnabled: boolean;
      sfxEnabled: boolean;
      musicVolume: number;
      sfxVolume: number;
    }) => void,
  ): void {
    this.musicToggle.checked = initial.musicEnabled;
    this.sfxToggle.checked = initial.sfxEnabled;
    this.musicVolume.value = (initial.musicVolume * 100).toString();
    this.sfxVolume.value = (initial.sfxVolume * 100).toString();
    this.musicToggle.addEventListener("change", () =>
      onChange({
        musicEnabled: this.musicToggle.checked,
        sfxEnabled: this.sfxToggle.checked,
        musicVolume: this.musicVolume.valueAsNumber / 100,
        sfxVolume: this.sfxVolume.valueAsNumber / 100,
      }),
    );
    this.sfxToggle.addEventListener("change", () =>
      onChange({
        musicEnabled: this.musicToggle.checked,
        sfxEnabled: this.sfxToggle.checked,
        musicVolume: this.musicVolume.valueAsNumber / 100,
        sfxVolume: this.sfxVolume.valueAsNumber / 100,
      }),
    );
    this.musicVolume.addEventListener("input", () =>
      onChange({
        musicEnabled: this.musicToggle.checked,
        sfxEnabled: this.sfxToggle.checked,
        musicVolume: this.musicVolume.valueAsNumber / 100,
        sfxVolume: this.sfxVolume.valueAsNumber / 100,
      }),
    );
    this.sfxVolume.addEventListener("input", () =>
      onChange({
        musicEnabled: this.musicToggle.checked,
        sfxEnabled: this.sfxToggle.checked,
        musicVolume: this.musicVolume.valueAsNumber / 100,
        sfxVolume: this.sfxVolume.valueAsNumber / 100,
      }),
    );
  }
}

function setVisible(el: HTMLElement, visible: boolean): void {
  el.classList.toggle("visible", visible);
}

function wireButton(id: string, handler: () => void): void {
  const btn = document.querySelector<HTMLButtonElement>(id);
  if (!btn) throw new Error(`Missing UI button: ${id}`);
  btn.addEventListener("click", handler);
}

function mustFind<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required UI element: ${selector}`);
  return el;
}

function makeStatRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "stat-row";
  const labelEl = document.createElement("span");
  labelEl.className = "stat-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  valueEl.textContent = value;
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function keyLabel(code: string): string {
  const ARROW_LABELS: Record<string, string> = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  if (ARROW_LABELS[code]) return ARROW_LABELS[code];
  if (code === "Space") return "SPACE";
  if (code === "Escape") return "ESC";
  if (code.startsWith("Key")) return code.replace("Key", "");
  return code;
}
