import {
  type ActivePiece,
  type Cell,
  type PieceType,
  PIECE_TYPES,
  type Rotation,
  HIDDEN_ROWS,
} from "./types.js";

/**
 * Per-piece color palette. Inspired by the classic Tetris guideline colors.
 * Stored as RGB triplets so the renderer can build gradients however it likes.
 */
export const PIECE_COLORS: Record<PieceType, readonly [number, number, number]> = {
  I: [0, 240, 240],
  O: [240, 240, 0],
  T: [160, 0, 240],
  S: [0, 240, 0],
  Z: [240, 0, 0],
  J: [0, 0, 240],
  L: [240, 160, 0],
};

/**
 * Per-piece shape matrices. Each piece uses its own 4x4 (I) or 3x3 (others) box.
 * The matrices are stored as rows of "1" / "0" strings for readability.
 * Coordinates are local to the piece's bounding box (top-left = (0,0)).
 */
const SHAPE_STRINGS: Record<PieceType, Record<Rotation, string[]>> = {
  I: {
    0: ["....", "IIII", "....", "...."],
    1: ["..I.", "..I.", "..I.", "..I."],
    2: ["....", "....", "IIII", "...."],
    3: [".I..", ".I..", ".I..", ".I.."],
  },
  O: {
    0: [".OO.", ".OO.", "....", "...."],
    1: [".OO.", ".OO.", "....", "...."],
    2: [".OO.", ".OO.", "....", "...."],
    3: [".OO.", ".OO.", "....", "...."],
  },
  T: {
    0: [".T.", "TTT", "...", "..."],
    1: [".T.", ".TT", ".T.", "..."],
    2: ["...", "TTT", ".T.", "..."],
    3: [".T.", "TT.", ".T.", "..."],
  },
  S: {
    0: [".SS", "SS.", "...", "..."],
    1: [".S.", ".SS", "..S", "..."],
    2: ["...", ".SS", "SS.", "..."],
    3: ["S..", "SS.", ".S.", "..."],
  },
  Z: {
    0: ["ZZ.", ".ZZ", "...", "..."],
    1: ["..Z", ".ZZ", ".Z.", "..."],
    2: ["...", "ZZ.", ".ZZ", "..."],
    3: [".Z.", "ZZ.", "Z..", "..."],
  },
  J: {
    0: ["J..", "JJJ", "...", "..."],
    1: [".J.", ".J.", "JJ.", "..."],
    2: ["...", "JJJ", "..J", "..."],
    3: [".JJ", ".J.", ".J.", "..."],
  },
  L: {
    0: ["..L", "LLL", "...", "..."],
    1: ["LL.", ".L.", ".L.", "..."],
    2: ["...", "LLL", "L..", "..."],
    3: [".L.", ".L.", ".LL", "..."],
  },
};

/**
 * SRS wall-kick tables.
 * For each (from -> to) rotation pair, a list of (dx, dy) offsets is tried in order.
 * Coordinates follow Tetris guideline: +x right, +y up (we negate y when applying).
 * Note: 180-degree rotation uses the same tables as JLSTZ because there are no
 * dedicated SRS 180-degree tests; the I piece does have official 180-degree tests.
 */
type Kick = readonly (readonly [number, number])[];

const KICKS_JLSTZ: Record<"0->1" | "1->0" | "1->2" | "2->1" | "2->3" | "3->2", Kick> = {
  "0->1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "1->0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "1->2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2->1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2->3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "3->2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
};

const KICKS_I: Record<"0->1" | "1->0" | "1->2" | "2->1" | "2->3" | "3->2", Kick> = {
  "0->1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "1->0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "1->2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  "2->1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "2->3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "3->2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
};

/**
 * Returns wall-kick offsets for a rotation transition, or an empty list if the
 * transition is invalid (e.g. wrapping around).
 */
export function kickOffsets(type: PieceType, from: Rotation, to: Rotation): Kick {
  if (type === "O") return [[0, 0]];
  const key = `${from}->${to}` as keyof typeof KICKS_JLSTZ;
  if (type === "I") return KICKS_I[key] ?? [[0, 0]];
  return KICKS_JLSTZ[key] ?? [[0, 0]];
}

/** Bounding-box dimensions of a piece, per rotation. */
export function pieceSize(type: PieceType): { width: number; height: number } {
  return type === "I" ? { width: 4, height: 4 } : { width: 3, height: 3 };
}

/** Returns the absolute board coordinates occupied by the piece. */
export function pieceCells(piece: ActivePiece): Cell[] {
  const shape = SHAPE_STRINGS[piece.type][piece.rotation];
  const cells: Cell[] = [];
  for (let row = 0; row < shape.length; row++) {
    const line = shape[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === piece.type) {
        cells.push({ x: piece.x + col, y: piece.y + row });
      }
    }
  }
  return cells;
}

/** Build a fresh piece at the spawn location. */
export function spawnPiece(type: PieceType): ActivePiece {
  // Standard SRS spawn: pieces enter at columns 3-6 at the top of the visible playfield.
  return {
    type,
    rotation: 0,
    x: 3,
    y: type === "I" ? HIDDEN_ROWS - 1 : HIDDEN_ROWS,
  };
}

/** All seven piece types, useful for the randomizer. */
export const ALL_PIECES: readonly PieceType[] = PIECE_TYPES;
