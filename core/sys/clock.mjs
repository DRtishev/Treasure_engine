/**
 * TREASURE ENGINE: Deterministic Clock (EPOCH-13)
 * 
 * Purpose: Provide controlled time for deterministic execution
 * Mode: Network-isolated, deterministic
 * 
 * CRITICAL: All core modules should use ctx.clock instead of Date.now()
 */

export class DeterministicClock {
  constructor(initialTime = null) {
    this.currentTime = initialTime || Date.now();
    this.frozen = false;
  }

  /**
   * Get current time (milliseconds since epoch)
   */
  now() {
    return this.currentTime;
  }

  /**
   * Get current time as ISO string
   */
  toISOString() {
    return new Date(this.currentTime).toISOString();
  }

  /**
   * Advance time by milliseconds
   */
  advance(ms) {
    if (!this.frozen) {
      this.currentTime += ms;
    }
    return this.currentTime;
  }

  /**
   * Set time to specific value
   */
  setTime(time) {
    if (!this.frozen) {
      this.currentTime = time;
    }
    return this.currentTime;
  }

  /**
   * Freeze time (for testing)
   */
  freeze() {
    this.frozen = true;
  }

  /**
   * Unfreeze time
   */
  unfreeze() {
    this.frozen = false;
  }

  /**
   * Get timestamp for event (always uses current time)
   */
  timestamp() {
    return this.currentTime;
  }
}

/**
 * System clock (uses real time)
 * Use in live/production mode
 */
export class SystemClock {
  now() {
    return Date.now();
  }

  toISOString() {
    return new Date().toISOString();
  }

  timestamp() {
    return Date.now();
  }

  // No-op for system clock
  advance(ms) {
    return this.now();
  }

  setTime(time) {
    return this.now();
  }

  freeze() {
    // No-op
  }

  unfreeze() {
    // No-op
  }
}
