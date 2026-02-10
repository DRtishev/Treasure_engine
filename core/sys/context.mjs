/**
 * TREASURE ENGINE: Run Context (EPOCH-13)
 * 
 * Purpose: Encapsulate all context needed for deterministic execution
 * Includes: run_id, seed, dataset_sha, ssot_sha, clock, rng
 * 
 * CRITICAL: Pass context to all operations instead of global state
 */

import { createHash } from 'crypto';
import { DeterministicClock, SystemClock } from './clock.mjs';
import { DeterministicRNG, SystemRNG } from './rng.mjs';

export class RunContext {
  constructor(options = {}) {
    // Run metadata
    this.run_id = options.run_id || this._generateRunId();
    this.mode = options.mode || 'sim'; // sim, paper, live
    this.dataset_sha = options.dataset_sha || null;
    this.ssot_sha = options.ssot_sha || null;

    // Seed generation (deterministic from dataset + ssot)
    this.run_seed = this._generateSeed(options.run_seed);

    // Deterministic providers
    const useDeterministic = options.deterministic !== false && this.mode !== 'live';
    
    if (useDeterministic) {
      this.clock = new DeterministicClock(options.initial_time);
      this.rng = new DeterministicRNG(this.run_seed);
    } else {
      this.clock = new SystemClock();
      this.rng = new SystemRNG();
    }

    // Additional context
    this.metadata = options.metadata || {};
    this.persistence_enabled = options.persistence_enabled || false;
  }

  /**
   * Generate deterministic seed from dataset_sha + ssot_sha
   * Formula: run_seed = sha256(dataset_sha + ssot_sha + "TREASURE_ENGINE") → uint32
   */
  _generateSeed(explicitSeed = null) {
    if (explicitSeed !== null && explicitSeed !== undefined) {
      return explicitSeed;
    }

    const components = [
      this.dataset_sha || 'NO_DATASET',
      this.ssot_sha || 'NO_SSOT',
      'TREASURE_ENGINE'
    ];

    const hash = createHash('sha256')
      .update(components.join('::'))
      .digest();

    // Convert first 4 bytes to uint32
    const seed = hash.readUInt32BE(0);
    
    return seed;
  }

  /**
   * Generate run ID
   * @private
   */
  _generateRunId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `run_${timestamp}_${random}`;
  }

  /**
   * Get context snapshot for logging
   */
  snapshot() {
    return {
      run_id: this.run_id,
      mode: this.mode,
      dataset_sha: this.dataset_sha,
      ssot_sha: this.ssot_sha,
      run_seed: this.run_seed,
      current_time: this.clock.now(),
      metadata: this.metadata
    };
  }

  /**
   * Clone context (useful for parallel operations)
   */
  clone(overrides = {}) {
    return new RunContext({
      run_id: this.run_id,
      mode: this.mode,
      dataset_sha: this.dataset_sha,
      ssot_sha: this.ssot_sha,
      run_seed: this.run_seed,
      initial_time: this.clock.now(),
      metadata: { ...this.metadata },
      persistence_enabled: this.persistence_enabled,
      ...overrides
    });
  }

  /**
   * Get current timestamp from clock
   */
  timestamp() {
    return this.clock.timestamp();
  }

  /**
   * Get current time as ISO string
   */
  toISOString() {
    return this.clock.toISOString();
  }
}

/**
 * Create context from configuration
 */
export function createContext(config) {
  return new RunContext(config);
}
