#!/usr/bin/env node
// core/ml/anomaly_detector.mjs
// EPOCH-08: ML-based Anomaly Detection
// Statistical and ML-based anomaly detection for trading system

/**
 * Statistical Anomaly Detector
 * 
 * Uses statistical methods for anomaly detection:
 * - Z-score (standard deviations from mean)
 * - IQR (Interquartile Range)
 * - Moving average deviation
 * - Rate of change detection
 */
export class AnomalyDetector {
  constructor(options = {}) {
    this.options = {
      windowSize: options.windowSize || 100,
      zScoreThreshold: options.zScoreThreshold || 3.0,
      iqrMultiplier: options.iqrMultiplier || 1.5,
      rateChangeThreshold: options.rateChangeThreshold || 0.5,
      enabled: options.enabled !== false
    };
    
    // Historical data windows
    this.windows = new Map(); // metric -> circular buffer
    
    // Anomaly history
    this.anomalies = [];
    this.maxAnomalyHistory = 1000;
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      anomaliesDetected: 0,
      falsePositives: 0
    };
  }

  /**
   * Record a metric value
   */
  record(metric, value, metadata = {}) {
    if (!this.windows.has(metric)) {
      this.windows.set(metric, []);
    }
    
    const window = this.windows.get(metric);
    window.push({
      value,
      timestamp: Date.now(),
      metadata
    });
    
    // Keep only last N values
    if (window.length > this.options.windowSize) {
      window.shift();
    }
  }

  /**
   * Check for anomalies in a metric
   */
  check(metric, value, metadata = {}) {
    this.stats.totalChecks++;
    
    if (!this.options.enabled) {
      return { isAnomaly: false, method: 'DISABLED' };
    }
    
    const window = this.windows.get(metric);
    if (!window || window.length < 10) {
      // Not enough data for detection
      return { isAnomaly: false, method: 'INSUFFICIENT_DATA' };
    }
    
    const results = {
      zScore: this._checkZScore(window, value),
      iqr: this._checkIQR(window, value),
      rateChange: this._checkRateChange(window, value),
      movingAvg: this._checkMovingAvgDeviation(window, value)
    };
    
    // Anomaly if any method detects it
    const isAnomaly = results.zScore.isAnomaly || 
                      results.iqr.isAnomaly || 
                      results.rateChange.isAnomaly ||
                      results.movingAvg.isAnomaly;
    
    if (isAnomaly) {
      this.stats.anomaliesDetected++;
      
      const anomaly = {
        metric,
        value,
        timestamp: Date.now(),
        methods: results,
        metadata,
        severity: this._calculateSeverity(results)
      };
      
      this.anomalies.push(anomaly);
      
      // Keep only recent anomalies
      if (this.anomalies.length > this.maxAnomalyHistory) {
        this.anomalies.shift();
      }
      
      return {
        isAnomaly: true,
        anomaly,
        methods: Object.keys(results).filter(k => results[k].isAnomaly)
      };
    }
    
    return { isAnomaly: false };
  }

  /**
   * Z-score detection (standard deviations from mean)
   * @private
   */
  _checkZScore(window, value) {
    const values = window.map(w => w.value);
    const mean = this._mean(values);
    const stdDev = this._stdDev(values, mean);
    
    if (stdDev === 0) {
      return { isAnomaly: false, zScore: 0 };
    }
    
    const zScore = Math.abs((value - mean) / stdDev);
    
    return {
      isAnomaly: zScore > this.options.zScoreThreshold,
      zScore,
      mean,
      stdDev,
      threshold: this.options.zScoreThreshold
    };
  }

  /**
   * IQR detection (Interquartile Range)
   * @private
   */
  _checkIQR(window, value) {
    const values = window.map(w => w.value).sort((a, b) => a - b);
    
    const q1 = this._percentile(values, 25);
    const q3 = this._percentile(values, 75);
    const iqr = q3 - q1;
    
    const lowerBound = q1 - (this.options.iqrMultiplier * iqr);
    const upperBound = q3 + (this.options.iqrMultiplier * iqr);
    
    return {
      isAnomaly: value < lowerBound || value > upperBound,
      value,
      lowerBound,
      upperBound,
      iqr,
      q1,
      q3
    };
  }

  /**
   * Rate of change detection
   * @private
   */
  _checkRateChange(window, value) {
    if (window.length < 2) {
      return { isAnomaly: false };
    }
    
    const lastValue = window[window.length - 1].value;
    const rateChange = Math.abs((value - lastValue) / lastValue);
    
    return {
      isAnomaly: rateChange > this.options.rateChangeThreshold,
      rateChange,
      threshold: this.options.rateChangeThreshold,
      lastValue,
      currentValue: value
    };
  }

  /**
   * Moving average deviation detection
   * @private
   */
  _checkMovingAvgDeviation(window, value) {
    const values = window.map(w => w.value);
    const ma = this._mean(values);
    const deviation = Math.abs((value - ma) / ma);
    
    // Anomaly if deviation > 50% from moving average
    const threshold = 0.5;
    
    return {
      isAnomaly: deviation > threshold,
      deviation,
      movingAverage: ma,
      threshold,
      value
    };
  }

  /**
   * Calculate anomaly severity
   * @private
   */
  _calculateSeverity(results) {
    let score = 0;
    
    // Count how many methods detected anomaly
    if (results.zScore.isAnomaly) score += 3;
    if (results.iqr.isAnomaly) score += 2;
    if (results.rateChange.isAnomaly) score += 2;
    if (results.movingAvg.isAnomaly) score += 1;
    
    // Classify severity
    if (score >= 6) return 'CRITICAL';
    if (score >= 4) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(limit = 10) {
    return this.anomalies.slice(-limit);
  }

  /**
   * Get anomalies for specific metric
   */
  getAnomaliesForMetric(metric, limit = 10) {
    return this.anomalies
      .filter(a => a.metric === metric)
      .slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      detectionRate: this.stats.totalChecks > 0 
        ? (this.stats.anomaliesDetected / this.stats.totalChecks * 100).toFixed(2) + '%'
        : '0%',
      recentAnomalies: this.anomalies.length,
      trackedMetrics: this.windows.size
    };
  }

  /**
   * Print status
   */
  printStatus() {
    const stats = this.getStats();
    
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ 🤖 ANOMALY DETECTOR STATUS              │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Status: ${this.options.enabled ? 'ENABLED ✓' : 'DISABLED ✗'}              │`);
    console.log(`│ Total Checks: ${stats.totalChecks.toString().padEnd(26)} │`);
    console.log(`│ Anomalies: ${stats.anomaliesDetected.toString().padEnd(29)} │`);
    console.log(`│ Detection Rate: ${stats.detectionRate.padEnd(24)} │`);
    console.log(`│ Tracked Metrics: ${stats.trackedMetrics.toString().padEnd(23)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');
  }

  /**
   * Helper: Calculate mean
   * @private
   */
  _mean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Helper: Calculate standard deviation
   * @private
   */
  _stdDev(values, mean) {
    if (values.length === 0) return 0;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = this._mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Helper: Calculate percentile
   * @private
   */
  _percentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Reset detector
   */
  reset() {
    this.windows.clear();
    this.anomalies = [];
    this.stats = {
      totalChecks: 0,
      anomaliesDetected: 0,
      falsePositives: 0
    };
    
    console.log('🔄 Anomaly Detector: RESET');
  }
}

export default AnomalyDetector;
