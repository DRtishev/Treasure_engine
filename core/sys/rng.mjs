/**
 * TREASURE ENGINE: Deterministic RNG (EPOCH-13)
 * 
 * Purpose: Provide controlled randomness for deterministic execution
 * Mode: Network-isolated, deterministic
 * 
 * CRITICAL: All core modules should use ctx.rng instead of Math.random()
 */

import { SeededRNG } from '../sim/rng.mjs';

/**
 * Deterministic RNG wrapper
 * Uses SeededRNG from core/sim/rng.mjs
 */
export class DeterministicRNG {
  constructor(seed = 12345) {
    this.seed = seed;
    this.rng = new SeededRNG(seed);
  }

  /**
   * Get next random number [0, 1)
   */
  next() {
    return this.rng.next();
  }

  /**
   * Get uniform random number [min, max)
   */
  uniform(min = 0, max = 1) {
    return this.rng.uniform(min, max);
  }

  /**
   * Get normal distributed random number
   */
  normal(mean = 0, std = 1) {
    return this.rng.normal(mean, std);
  }

  /**
   * Choose random element from array
   */
  choice(arr) {
    return this.rng.choice(arr);
  }

  /**
   * Get random integer [min, max]
   */
  integer(min, max) {
    return Math.floor(this.uniform(min, max + 1));
  }

  /**
   * Get random boolean
   */
  boolean() {
    return this.next() < 0.5;
  }

  /**
   * Reset RNG to initial seed
   */
  reset() {
    this.rng = new SeededRNG(this.seed);
  }

  /**
   * Get current seed
   */
  getSeed() {
    return this.seed;
  }
}

/**
 * System RNG (uses Math.random)
 * Use in live/production mode for non-deterministic randomness
 */
export class SystemRNG {
  next() {
    return Math.random();
  }

  uniform(min = 0, max = 1) {
    return min + Math.random() * (max - min);
  }

  normal(mean = 0, std = 1) {
    // Box-Muller transform
    const u1 = Math.max(Math.random(), 1e-12);
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * std;
  }

  choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  integer(min, max) {
    return Math.floor(this.uniform(min, max + 1));
  }

  boolean() {
    return Math.random() < 0.5;
  }

  // No-op for system RNG
  reset() {
    // No-op
  }

  getSeed() {
    return null;
  }
}
