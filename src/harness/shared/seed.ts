/**
 * @epicai/core — Test Harness Seed
 * Deterministic PRNG for reproducible test data.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export const SEED = 1337;

/**
 * Mulberry32 PRNG — deterministic, fast, 32-bit.
 * All harness fixtures use this instead of Math.random().
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = SEED) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  reset(seed: number = SEED): void {
    this.state = seed;
  }
}
