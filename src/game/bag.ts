import { ALL_PIECES } from "./pieces.js";
import type { PieceType } from "./types.js";

/**
 * Deterministic 7-bag randomizer.
 *
 * Every "bag" contains exactly one of each of the seven pieces in random order.
 * When the bag is empty it is reshuffled. This guarantees that within any 7
 * consecutive pieces every piece appears once, eliminating the unfair droughts
 * and floods of a pure uniform random distribution.
 */
export class SevenBag {
  private bag: PieceType[] = [];
  private rng: () => number;

  constructor(seed?: number | (() => number)) {
    if (typeof seed === "function") {
      this.rng = seed;
    } else if (typeof seed === "number") {
      let state = seed >>> 0;
      this.rng = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
      };
    } else {
      this.rng = Math.random;
    }
    this.refill();
  }

  private refill(): void {
    const next = [...ALL_PIECES];
    // Fisher-Yates shuffle using our RNG.
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const a = next[i];
      const b = next[j];
      if (a !== undefined && b !== undefined) {
        next[i] = b;
        next[j] = a;
      }
    }
    this.bag = next;
  }

  /** Returns the next piece without advancing the queue. */
  peek(): PieceType {
    if (this.bag.length === 0) this.refill();
    const head = this.bag[0];
    if (!head) throw new Error("Seven bag unexpectedly empty after refill");
    return head;
  }

  /** Returns the next piece and advances the queue. */
  next(): PieceType {
    if (this.bag.length === 0) this.refill();
    const head = this.bag.shift();
    if (!head) throw new Error("Seven bag unexpectedly empty after shift");
    if (this.bag.length === 0) this.refill();
    return head;
  }

  /** Returns the upcoming pieces without consuming them. */
  preview(count: number): PieceType[] {
    while (this.bag.length < count) this.refill();
    return this.bag.slice(0, count);
  }
}
