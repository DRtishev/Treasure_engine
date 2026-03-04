/**
 * fill_probe.mjs — Fill Detection Probe
 *
 * Polls for fill status on pending orders.
 * Works with any adapter implementing getOrderStatus(orderId).
 * Supports both live testnet and offline/paper modes.
 *
 * Safety: paper/testnet only. Circuit breaker on consecutive failures.
 * Deterministic: no Date.now() — uses adapter timestamps or provided clock.
 */

/**
 * @typedef {Object} FillResult
 * @property {string} status - 'FILLED' | 'CANCELLED' | 'TIMEOUT' | 'ERROR'
 * @property {number} [fill_price] - Average fill price (FILLED only)
 * @property {number} [fill_qty] - Filled quantity (FILLED only)
 * @property {number} [latency_ms] - Time from order to fill
 * @property {number} [slippage_bps] - Realized slippage in bps
 * @property {string} [reason] - Reason for cancel/error
 * @property {number} [polls] - Number of polls attempted
 */

export class FillProbe {
  /**
   * @param {Object} adapter - Execution adapter with getOrderStatus(orderId)
   * @param {Object} [opts]
   * @param {number} [opts.maxPolls=60] - Maximum poll attempts
   * @param {number} [opts.pollIntervalMs=1000] - Ms between polls
   * @param {number} [opts.circuitBreakerLimit=3] - Consecutive failures before halt
   * @param {Object} [opts.clock] - Optional clock (DeterministicClock or SystemClock)
   */
  constructor(adapter, opts = {}) {
    if (!adapter) {
      throw new Error('FillProbe requires an adapter');
    }
    this._adapter = adapter;
    this._maxPolls = opts.maxPolls ?? 60;
    this._pollIntervalMs = opts.pollIntervalMs ?? 1000;
    this._circuitBreakerLimit = opts.circuitBreakerLimit ?? 3;
    this._clock = opts.clock ?? null;

    // Circuit breaker state
    this._consecutiveFailures = 0;
    this._circuitOpen = false;

    // Probe history for diagnostics
    this._history = [];
  }

  /**
   * Poll for fill status until filled, cancelled, or timeout.
   * @param {string} orderId - Order ID to probe
   * @param {Object} [probeOpts]
   * @param {number} [probeOpts.expectedPrice] - Expected fill price for slippage calc
   * @param {string} [probeOpts.side] - 'BUY' or 'SELL' for slippage direction
   * @returns {Promise<FillResult>}
   */
  async probe(orderId, probeOpts = {}) {
    if (this._circuitOpen) {
      return {
        status: 'ERROR',
        reason: `Circuit breaker open after ${this._circuitBreakerLimit} consecutive failures`,
        polls: 0,
      };
    }

    let polls = 0;
    const startTime = this._now();

    for (let i = 0; i < this._maxPolls; i++) {
      polls++;
      try {
        const orderStatus = await this._adapter.getOrderStatus(orderId);

        if (orderStatus.filled) {
          this._consecutiveFailures = 0;
          const result = {
            status: 'FILLED',
            fill_price: orderStatus.avgPrice ?? orderStatus.fill_price ?? 0,
            fill_qty: orderStatus.filledQty ?? orderStatus.fill_qty ?? 0,
            latency_ms: this._now() - startTime,
            polls,
          };

          // Compute slippage if reference price provided
          if (probeOpts.expectedPrice && probeOpts.side) {
            result.slippage_bps = this._computeSlippage(
              probeOpts.expectedPrice,
              result.fill_price,
              probeOpts.side
            );
          }

          this._recordHistory(orderId, result);
          return result;
        }

        if (orderStatus.cancelled || orderStatus.rejected) {
          this._consecutiveFailures++;
          this._checkCircuitBreaker();
          const result = {
            status: 'CANCELLED',
            reason: orderStatus.reason ?? 'unknown',
            polls,
          };
          this._recordHistory(orderId, result);
          return result;
        }

        // Still pending — wait before next poll
        if (i < this._maxPolls - 1) {
          await this._delay(this._pollIntervalMs);
        }
      } catch (err) {
        this._consecutiveFailures++;
        this._checkCircuitBreaker();
        const result = {
          status: 'ERROR',
          reason: err.message,
          polls,
        };
        this._recordHistory(orderId, result);
        return result;
      }
    }

    // Timeout
    const result = { status: 'TIMEOUT', polls };
    this._recordHistory(orderId, result);
    return result;
  }

  /**
   * Check if circuit breaker should open.
   */
  _checkCircuitBreaker() {
    if (this._consecutiveFailures >= this._circuitBreakerLimit) {
      this._circuitOpen = true;
    }
  }

  /**
   * Reset circuit breaker (manual recovery).
   */
  resetCircuitBreaker() {
    this._consecutiveFailures = 0;
    this._circuitOpen = false;
  }

  /**
   * Compute realized slippage in basis points.
   * @param {number} expected - Expected price
   * @param {number} actual - Actual fill price
   * @param {string} side - 'BUY' or 'SELL'
   * @returns {number} Slippage in bps (positive = adverse)
   */
  _computeSlippage(expected, actual, side) {
    if (!expected || expected <= 0) return 0;
    const diff = actual - expected;
    if (side === 'BUY') {
      return (diff / expected) * 10000;
    } else if (side === 'SELL') {
      return (-diff / expected) * 10000;
    }
    return 0;
  }

  /**
   * Get current time from clock or fallback.
   */
  _now() {
    if (this._clock) return this._clock.now();
    return Date.now();
  }

  /**
   * Delay for ms.
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Record probe result in history.
   */
  _recordHistory(orderId, result) {
    this._history.push({ orderId, ...result, probed_at: this._now() });
    // Keep last 100 entries
    if (this._history.length > 100) this._history.shift();
  }

  /**
   * Get probe diagnostics.
   */
  getDiagnostics() {
    const filled = this._history.filter(h => h.status === 'FILLED');
    const avgLatency = filled.length > 0
      ? filled.reduce((s, h) => s + (h.latency_ms || 0), 0) / filled.length
      : 0;

    return {
      total_probes: this._history.length,
      filled: filled.length,
      cancelled: this._history.filter(h => h.status === 'CANCELLED').length,
      timeouts: this._history.filter(h => h.status === 'TIMEOUT').length,
      errors: this._history.filter(h => h.status === 'ERROR').length,
      avg_latency_ms: avgLatency,
      circuit_breaker_open: this._circuitOpen,
      consecutive_failures: this._consecutiveFailures,
    };
  }
}
