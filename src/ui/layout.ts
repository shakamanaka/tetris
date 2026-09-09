import type { TetrisGame } from "../game/tetris.js";
import { BOARD_PADDING, renderGame, renderPreview } from "../render/renderer.js";

export interface LayoutController {
  update(): void;
  dispose(): void;
}

/** Owns responsive canvas sizing while keeping rendering outside the bootstrap. */
export function createLayoutController(
  game: TetrisGame,
  boardCanvas: HTMLCanvasElement,
  boardContext: CanvasRenderingContext2D,
  previewCanvas: HTMLCanvasElement,
  previewContext: CanvasRenderingContext2D,
): LayoutController {
  function resizeCanvas(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    cssWidth: number,
    cssHeight: number,
  ): void {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function update(): void {
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

    resizeCanvas(boardCanvas, boardContext, boardWidth, boardHeight);
    resizeCanvas(previewCanvas, previewContext, previewWidth, previewHeight);

    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    if (sidebar) {
      sidebar.style.width = isNarrow ? "100%" : `${sidebarWidth}px`;
      sidebar.style.maxHeight = isNarrow ? "none" : `${boardHeight}px`;
    }

    const snapshot = game.snapshot();
    renderGame(boardContext, snapshot);
    renderPreview(previewContext, snapshot.next);
  }

  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
  update();

  return {
    update,
    dispose(): void {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    },
  };
}
