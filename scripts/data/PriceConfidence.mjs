#!/usr/bin/env node
// scripts/data/PriceConfidence.mjs
// Price Confidence Score - математическая метрика качества данных
// Score: 0.0 (worst) to 1.0 (perfect)
// Purpose: Enable strategies to reject trades on low-confidence prices

const THRESHOLDS = {
  WEBSOCKET_PERFECT: 1000,      // <1s = perfect (1.0)
  WEBSOCKET_EXCELLENT: 3000,    // <3s = excellent (0.9)
  WEBSOCKET_GOOD: 5000,         // <5s = good (0.7)
  WEBSOCKET_STALE: 5000,        // >=5s = stale (0.5)
  REST_BASE: 0.6,               // REST baseline
  CACHE_BASE: 0.3,              // Cache baseline
  CACHE_DECAY_MS: 60000,        // Cache degrades over 60s
  MIN_CONFIDENCE: 0.0,          // Circuit open / offline
  TRADING_THRESHOLD: 0.8        // Minimum for trading decisions
};

export class PriceConfidence {
  /**
   * Calculate confidence score for price data
   * @param {Object} params
   * @param {string} params.source - 'websocket' | 'rest' | 'cache'
   * @param {number} params.age_ms - Data age in milliseconds
   * @param {boolean} params.connected - Is source connected?
   * @param {string} params.circuit_state - 'closed' | 'open' | 'half-open'
   * @returns {number} Confidence score (0.0-1.0)
   */
  static calculate(params) {
    const { source, age_ms, connected, circuit_state } = params;

    // Circuit breaker open = no confidence
    if (circuit_state === 'open' && source !== 'cache') {
      return THRESHOLDS.MIN_CONFIDENCE;
    }

    // Cache scoring (works even when disconnected/circuit open)
    if (source === 'cache') {
      const decayFactor = Math.max(0, 1 - age_ms / THRESHOLDS.CACHE_DECAY_MS);
      return Math.max(
        THRESHOLDS.MIN_CONFIDENCE,
        THRESHOLDS.CACHE_BASE * decayFactor
      );
    }

    // For non-cache sources: not connected = no confidence
    if (!connected) {
      return THRESHOLDS.MIN_CONFIDENCE;
    }

    // WebSocket scoring (time-based degradation)
    if (source === 'websocket') {
      if (age_ms < THRESHOLDS.WEBSOCKET_PERFECT) {
        return 1.0; // PERFECT: <1s fresh data
      }
      if (age_ms < THRESHOLDS.WEBSOCKET_EXCELLENT) {
        return 0.9; // EXCELLENT: 1-3s
      }
      if (age_ms < THRESHOLDS.WEBSOCKET_GOOD) {
        return 0.7; // GOOD: 3-5s
      }
      return 0.5; // STALE: >=5s
    }

    // REST scoring (static baseline)
    if (source === 'rest') {
      return THRESHOLDS.REST_BASE; // ACCEPTABLE: 0.6
    }

    // Unknown source
    return THRESHOLDS.MIN_CONFIDENCE;
  }

  /**
   * Check if confidence is sufficient for trading
   * @param {number} confidence - Confidence score
   * @returns {boolean} True if above threshold
   */
  static isTradeable(confidence) {
    return confidence >= THRESHOLDS.TRADING_THRESHOLD;
  }

  /**
   * Get confidence level description
   * @param {number} confidence - Confidence score
   * @returns {string} Human-readable level
   */
  static getLevel(confidence) {
    if (confidence >= 1.0) return 'PERFECT';
    if (confidence >= 0.9) return 'EXCELLENT';
    if (confidence >= 0.8) return 'GOOD';
    if (confidence >= 0.7) return 'ACCEPTABLE';
    if (confidence >= 0.5) return 'DEGRADED';
    if (confidence > 0.0) return 'POOR';
    return 'OFFLINE';
  }

  /**
   * Get recommended action based on confidence
   * @param {number} confidence - Confidence score
   * @returns {string} Recommended action
   */
  static getRecommendation(confidence) {
    if (confidence >= THRESHOLDS.TRADING_THRESHOLD) {
      return 'TRADE';
    }
    if (confidence >= 0.5) {
      return 'OBSERVE';
    }
    return 'SKIP';
  }

  /**
   * Create price data object with confidence
   * @param {Object} params
   * @returns {Object} Price data with confidence metadata
   */
  static createPriceData(params) {
    const {
      symbol,
      price,
      source,
      age_ms,
      connected,
      circuit_state,
      timestamp
    } = params;

    const confidence = PriceConfidence.calculate({
      source,
      age_ms,
      connected,
      circuit_state
    });

    return {
      symbol,
      price,
      confidence,
      confidence_level: PriceConfidence.getLevel(confidence),
      tradeable: PriceConfidence.isTradeable(confidence),
      recommendation: PriceConfidence.getRecommendation(confidence),
      metadata: {
        source,
        age_ms,
        connected,
        circuit_state,
        timestamp: timestamp || Date.now()
      }
    };
  }

  /**
   * Get thresholds for testing/validation
   * @returns {Object} Threshold values
   */
  static getThresholds() {
    return { ...THRESHOLDS };
  }
}

export default PriceConfidence;
