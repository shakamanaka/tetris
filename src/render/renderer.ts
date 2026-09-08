import { COLS, ROWS, HIDDEN_ROWS } from "../game/types.js";
import type { GameSnapshot } from "../game/tetris.js";
import { PIECE_COLORS, pieceCells } from "../game/pieces.js";

/** Cell size in CSS pixels. */
export const CELL_SIZE = 32;
/** Padding inside the board frame. */
export const BOARD_PADDING = 6;

export interface RendererPalette {
  background: string;
  grid: string;
  border: string;
  ghost: string;
  text: string;
  textDim: string;
  panel: string;
  accent: string;
}

export const DEFAULT_PALETTE: RendererPalette = {
  background: "#0b0a14",
  grid: "rgba(255, 255, 255, 0.06)",
  border: "#3b2f6b",
  ghost: "rgba(255, 255, 255, 0.18)",
  text: "#f4f1ff",
  textDim: "#9d92c6",
  panel: "#16142a",
  accent: "#ff77ff",
};

/** Converts an [r, g, b] tuple to a CSS rgb() string. */
function rgb(rgb: readonly [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Darkens an [r, g, b] tuple by a percentage (0..1). */
function darken(color: readonly [number, number, number], amount: number): readonly [number, number, number] {
  return [
    Math.max(0, Math.floor(color[0] * (1 - amount))),
    Math.max(0, Math.floor(color[1] * (1 - amount))),
    Math.max(0, Math.floor(color[2] * (1 - amount))),
  ] as const;
}

function lighten(
  color: readonly [number, number, number],
  amount: number,
): readonly [number, number, number] {
  return [
    Math.min(255, Math.floor(color[0] + (255 - color[0]) * amount)),
    Math.min(255, Math.floor(color[1] + (255 - color[1]) * amount)),
    Math.min(255, Math.floor(color[2] + (255 - color[2]) * amount)),
  ] as const;
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: readonly [number, number, number],
): void {
  const inset = Math.max(1, Math.floor(size * 0.12));
  ctx.fillStyle = rgb(color);
  ctx.fillRect(x, y, size, size);
  // bevel effect
  ctx.fillStyle = rgb(lighten(color, 0.45));
  ctx.fillRect(x, y, size, inset);
  ctx.fillRect(x, y, inset, size);
  ctx.fillStyle = rgb(darken(color, 0.45));
  ctx.fillRect(x, y + size - inset, size, inset);
  ctx.fillRect(x + size - inset, y, inset, size);
  // inner shadow line
  ctx.strokeStyle = rgb(darken(color, 0.6));
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: readonly [number, number, number],
): void {
  ctx.save();
  ctx.strokeStyle = rgb(lighten(color, 0.5));
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.45;
  ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
  ctx.fillStyle = rgb(color);
  ctx.globalAlpha = 0.1;
  ctx.fillRect(x, y, size, size);
  ctx.restore();
}

// Board and piece bounding box shapes for preview rendering
const SHAPES: Record<keyof typeof PIECE_COLORS, string[]> = {
  I: ["....", "IIII", "....", "...."],
  O: [".OO.", ".OO.", "....", "...."],
  T: [".T.", "TTT", "...", "..."],
  S: [".SS", "SS.", "...", "..."],
  Z: ["ZZ.", ".ZZ", "...", "..."],
  J: ["J..", "JJJ", "...", "..."],
  L: ["..L", "LLL", "...", "..."],
};

/**
 * Renders a game snapshot to a 2D canvas context. The renderer is a pure
 * function of the snapshot; it adapts to the canvas dimensions dynamically.
 */
export function renderGame(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  palette: RendererPalette = DEFAULT_PALETTE,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const cssWidth = ctx.canvas.clientWidth;
  const cssHeight = ctx.canvas.clientHeight;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const padding = BOARD_PADDING;
  const cellSize = Math.max(
    1,
    Math.floor(Math.min((cssWidth - padding * 2) / COLS, (cssHeight - padding * 2) / ROWS)),
  );

  const playfieldWidth = COLS * cellSize;
  const playfieldHeight = ROWS * cellSize;
  const boardX = Math.floor((cssWidth - playfieldWidth) / 2);
  const boardY = Math.floor((cssHeight - playfieldHeight) / 2);

  // Playfield background
  ctx.fillStyle = palette.background;
  ctx.fillRect(boardX, boardY, playfieldWidth, playfieldHeight);

  // Grid
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    const px = boardX + x * cellSize;
    ctx.beginPath();
    ctx.moveTo(px + 0.5, boardY);
    ctx.lineTo(px + 0.5, boardY + playfieldHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    const py = boardY + y * cellSize;
    ctx.beginPath();
    ctx.moveTo(boardX, py + 0.5);
    ctx.lineTo(boardX + playfieldWidth, py + 0.5);
    ctx.stroke();
  }

  // Locked stack
  for (let row = 0; row < ROWS; row++) {
    const boardRow = snapshot.stack[row + HIDDEN_ROWS];
    if (!boardRow) continue;
    for (let col = 0; col < COLS; col++) {
      const cell = boardRow[col];
      if (!cell) continue;
      const color = PIECE_COLORS[cell.type];
      drawBlock(ctx, boardX + col * cellSize, boardY + row * cellSize, cellSize, color);
    }
  }

  // Ghost piece
  if (snapshot.piece && snapshot.state === "PLAYING") {
    const ghostPiece = { ...snapshot.piece, y: snapshot.ghostY };
    const color = PIECE_COLORS[ghostPiece.type];
    for (const cell of pieceCells(ghostPiece)) {
      if (cell.y - HIDDEN_ROWS < 0) continue;
      const px = boardX + cell.x * cellSize;
      const py = boardY + (cell.y - HIDDEN_ROWS) * cellSize;
      drawGhost(ctx, px, py, cellSize, color);
    }
  }

  // Active piece
  if (snapshot.piece && snapshot.state !== "MENU") {
    const color = PIECE_COLORS[snapshot.piece.type];
    for (const cell of pieceCells(snapshot.piece)) {
      if (cell.y - HIDDEN_ROWS < 0) continue;
      const px = boardX + cell.x * cellSize;
      const py = boardY + (cell.y - HIDDEN_ROWS) * cellSize;
      drawBlock(ctx, px, py, cellSize, color);
    }
  }

  // Overlays
  if (snapshot.state === "PAUSED") {
    drawOverlayText(ctx, "PAUSED", palette, boardX, boardY, playfieldWidth, playfieldHeight);
  } else if (snapshot.state === "GAME_OVER") {
    drawOverlayText(ctx, "GAME OVER", palette, boardX, boardY, playfieldWidth, playfieldHeight);
  }

  ctx.restore();
}

/** Draws centered overlay text within the specified bounds. */
function drawOverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  palette: RendererPalette,
  x = 0,
  y = 0,
  width = ctx.canvas.clientWidth,
  height = ctx.canvas.clientHeight,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(11, 10, 20, 0.7)";
  ctx.fillRect(x, y, width, height);
  const fontSize = Math.max(12, Math.min(32, Math.floor(width / 9)));
  ctx.font = `bold ${fontSize}px 'Press Start 2P', 'Courier New', monospace`;
  ctx.fillStyle = palette.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2);
  ctx.restore();
}

/** Renders the next-piece preview panel inside its designated canvas. */
export function renderPreview(
  ctx: CanvasRenderingContext2D,
  types: ReadonlyArray<string>,
  _palette: RendererPalette = DEFAULT_PALETTE,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const cssWidth = ctx.canvas.clientWidth;
  const cssHeight = ctx.canvas.clientHeight;
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Preview up to 3 upcoming pieces
  const count = Math.min(types.length, 3);
  if (count === 0) {
    ctx.restore();
    return;
  }

  const slotHeight = cssHeight / count;
  const mini = Math.max(6, Math.min(16, Math.floor(Math.min(cssWidth / 5.5, slotHeight / 3.4))));

  for (let i = 0; i < count; i++) {
    const type = types[i] as keyof typeof PIECE_COLORS;
    const shape = SHAPES[type];
    if (!shape) continue;

    // Determine the tight bounding box of the piece
    let minCol = 4,
      maxCol = -1,
      minRow = 4,
      maxRow = -1;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === type) {
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
        }
      }
    }

    if (maxCol < 0) continue;

    const pieceWidth = (maxCol - minCol + 1) * mini;
    const pieceHeight = (maxRow - minRow + 1) * mini;
    const startX = Math.floor((cssWidth - pieceWidth) / 2);
    const startY = Math.floor(i * slotHeight + (slotHeight - pieceHeight) / 2);
    const color = PIECE_COLORS[type];

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (shape[r][c] === type) {
          drawBlock(ctx, startX + (c - minCol) * mini, startY + (r - minRow) * mini, mini, color);
        }
      }
    }
  }

  ctx.restore();
}

/** Draws a single mini-piece for previews or HUD elements. */
export function drawMiniPiece(
  ctx: CanvasRenderingContext2D,
  type: keyof typeof PIECE_COLORS,
  x: number,
  y: number,
  _palette: RendererPalette,
  mini = 16,
): void {
  const shape = SHAPES[type];
  if (!shape) return;
  const color = PIECE_COLORS[type];
  for (let row = 0; row < shape.length; row++) {
    const line = shape[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === type) {
        drawBlock(ctx, x + col * mini, y + row * mini, mini, color);
      }
    }
  }
}

/** Returns the size (in CSS pixels) of the playfield renderer area. */
export function boardPixelSize(cellSize = CELL_SIZE): { width: number; height: number } {
  return {
    width: COLS * cellSize + BOARD_PADDING * 2,
    height: ROWS * cellSize + BOARD_PADDING * 2,
  };
}
