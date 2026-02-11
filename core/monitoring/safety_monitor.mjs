#!/usr/bin/env node
// core/monitoring/safety_monitor.mjs
// 💎 GENIUS: Continuous Safety Monitor - Real-time production visibility
// "Safety that never sleeps"

export class SafetyMonitor {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.eventLog = options.eventLog;
    this.nowProvider = options.nowProvider || (() => Date.now());
    
    // Configuration
    this.config = {
      checkIntervalMs: options.checkIntervalMs || 1000, // 1 second
      alertThreshold: options.alertThreshold || 70, // Alert if score < 70
      degradeThreshold: options.degradeThreshold || 50, // Auto-degrade if < 50
      anomalyWindow: options.anomalyWindow || 100, // Last 100 operations
      enabled: options.enabled !== false
    };
    
    // State
    this.metrics = {
      safetyScore: 100,
      positionUtilization: 0,
      lossUtilization: 0,
      recentOrders: [],
      anomalies: [],
      alerts: [],
      status: 'HEALTHY'
    };
    
    // Historical data for anomaly detection
    this.history = {
      orders: [],
      scores: [],
      alerts: []
    };
    
    // Monitoring interval
    this.monitoringInterval = null;
    
    if (this.config.enabled) {
      this.start();
    }
  }

  /**
   * Start continuous monitoring
   */
  start() {
    if (this.monitoringInterval) return;
    
    console.log('🔍 Safety Monitor: STARTED');
    console.log(`   Check interval: ${this.config.checkIntervalMs}ms`);
    console.log(`   Alert threshold: ${this.config.alertThreshold}`);
    console.log('');
    
    this.monitoringInterval = setInterval(() => {
      this.checkSafety();
    }, this.config.checkIntervalMs);
    
    // Initial check
    this.checkSafety();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 Safety Monitor: STOPPED');
    }
  }

  /**
   * Check safety and update metrics
   */
  checkSafety() {
    const timestamp = this.nowProvider();
    
    // Calculate safety score
    const score = this.calculateSafetyScore();
    this.metrics.safetyScore = score;
    this.history.scores.push({ timestamp, score });
    
    // Keep only recent history
    if (this.history.scores.length > this.config.anomalyWindow) {
      this.history.scores.shift();
    }
    
    // Update position/loss utilization
    this.updateUtilization();
    
    // Detect anomalies
    const anomalies = this.detectAnomalies();
    if (anomalies.length > 0) {
      this.metrics.anomalies.push(...anomalies);
      
      // Log anomalies
      if (this.eventLog) {
        for (const anomaly of anomalies) {
          this.eventLog.sys('safety_anomaly', anomaly, timestamp);
        }
      }
    }
    
    // Check for alerts
    this.checkAlerts(score);
    
    // Auto-degradation if needed
    if (score < this.config.degradeThreshold) {
      this.autoDegrade('Low safety score');
    }
    
    // Update status
    this.updateStatus(score);
  }

  /**
   * Calculate safety score (0-100)
   */
  calculateSafetyScore() {
    let score = 100;
    
    // Penalty for position utilization
    const posUtil = this.metrics.positionUtilization;
    if (posUtil > 0.9) score -= 30; // >90% = high risk
    else if (posUtil > 0.7) score -= 15; // >70% = medium risk
    else if (posUtil > 0.5) score -= 5;  // >50% = low risk
    
    // Penalty for loss utilization
    const lossUtil = this.metrics.lossUtilization;
    if (lossUtil > 0.9) score -= 40; // >90% = critical
    else if (lossUtil > 0.7) score -= 20; // >70% = high risk
    else if (lossUtil > 0.5) score -= 10; // >50% = medium risk
    
    // Penalty for recent failures
    const recentOrders = this.metrics.recentOrders.slice(-10);
    const failures = recentOrders.filter(o => o.status === 'rejected' || o.status === 'blocked');
    const failureRate = recentOrders.length > 0 ? failures.length / recentOrders.length : 0;
    if (failureRate > 0.5) score -= 20;
    else if (failureRate > 0.2) score -= 10;
    
    // Penalty for emergency stop
    if (this.adapter.emergencyStop) {
      score = 0;
    }
    
    // Penalty for anomalies
    const recentAnomalies = this.metrics.anomalies.slice(-5);
    score -= recentAnomalies.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update position and loss utilization
   */
  updateUtilization() {
    const stats = this.adapter.getStats();
    
    // Position utilization (0-1)
    this.metrics.positionUtilization = Math.abs(stats.current_position_usd) / this.adapter.maxPositionSizeUsd;
    
    // Loss utilization (0-1)
    // Negative PnL = loss
    if (stats.daily_pnl < 0) {
      this.metrics.lossUtilization = Math.abs(stats.daily_pnl) / this.adapter.maxDailyLossUsd;
    } else {
      this.metrics.lossUtilization = 0;
    }
  }

  /**
   * Detect anomalies using simple statistical methods
   */
  detectAnomalies() {
    const anomalies = [];
    const timestamp = this.nowProvider();
    
    // Anomaly 1: Rapid score drop
    if (this.history.scores.length >= 5) {
      const recent = this.history.scores.slice(-5);
      const scoreDrop = recent[0].score - recent[4].score;
      if (scoreDrop > 30) {
        anomalies.push({
          type: 'rapid_score_drop',
          severity: 'HIGH',
          details: `Score dropped ${scoreDrop} points in last 5 checks`,
          timestamp
        });
      }
    }
    
    // Anomaly 2: High failure rate
    const recentOrders = this.metrics.recentOrders.slice(-10);
    if (recentOrders.length >= 5) {
      const failures = recentOrders.filter(o => o.status === 'rejected' || o.status === 'blocked');
      const failureRate = failures.length / recentOrders.length;
      if (failureRate > 0.5) {
        anomalies.push({
          type: 'high_failure_rate',
          severity: 'MEDIUM',
          details: `${(failureRate * 100).toFixed(0)}% of recent orders failed`,
          timestamp
        });
      }
    }
    
    // Anomaly 3: Approaching caps
    if (this.metrics.positionUtilization > 0.9) {
      anomalies.push({
        type: 'position_cap_warning',
        severity: 'HIGH',
        details: `Position at ${(this.metrics.positionUtilization * 100).toFixed(0)}% of cap`,
        timestamp
      });
    }
    
    if (this.metrics.lossUtilization > 0.9) {
      anomalies.push({
        type: 'loss_cap_warning',
        severity: 'CRITICAL',
        details: `Daily loss at ${(this.metrics.lossUtilization * 100).toFixed(0)}% of cap`,
        timestamp
      });
    }
    
    return anomalies;
  }

  /**
   * Check for alerts and notify
   */
  checkAlerts(score) {
    const timestamp = Date.now();
    
    // Alert if score below threshold
    if (score < this.config.alertThreshold) {
      const alert = {
        type: 'low_safety_score',
        severity: score < this.config.degradeThreshold ? 'CRITICAL' : 'WARNING',
        score,
        threshold: this.config.alertThreshold,
        message: `Safety score ${score} below threshold ${this.config.alertThreshold}`,
        timestamp
      };
      
      this.metrics.alerts.push(alert);
      this.history.alerts.push(alert);
      
      // Keep only recent alerts
      if (this.metrics.alerts.length > 10) {
        this.metrics.alerts.shift();
      }
      
      // Log alert
      if (this.eventLog) {
        this.eventLog.sys('safety_alert', alert, timestamp);
      }
      
      console.warn('⚠️  SAFETY ALERT:', alert.message);
    }
  }

  /**
   * Auto-degrade system when safety score critical
   */
  autoDegrade(reason) {
    const timestamp = Date.now();
    
    console.error('🚨 AUTO-DEGRADATION TRIGGERED');
    console.error(`   Reason: ${reason}`);
    console.error(`   Safety Score: ${this.metrics.safetyScore}`);
    console.error('   Action: Reducing risk exposure');
    console.error('');
    
    // Reduce position cap by 50%
    const originalCap = this.adapter.maxPositionSizeUsd;
    this.adapter.maxPositionSizeUsd = originalCap * 0.5;
    
    // Reduce loss cap by 50%
    const originalLossCap = this.adapter.maxDailyLossUsd;
    this.adapter.maxDailyLossUsd = originalLossCap * 0.5;
    
    // Log degradation
    if (this.eventLog) {
      this.eventLog.sys('auto_degradation', {
        reason,
        score: this.metrics.safetyScore,
        old_position_cap: originalCap,
        new_position_cap: this.adapter.maxPositionSizeUsd,
        old_loss_cap: originalLossCap,
        new_loss_cap: this.adapter.maxDailyLossUsd
      }, timestamp);
    }
  }

  /**
   * Update overall system status
   */
  updateStatus(score) {
    if (this.adapter.emergencyStop) {
      this.metrics.status = 'EMERGENCY_STOP';
    } else if (score >= 90) {
      this.metrics.status = 'HEALTHY';
    } else if (score >= 70) {
      this.metrics.status = 'WARNING';
    } else if (score >= 50) {
      this.metrics.status = 'DEGRADED';
    } else {
      this.metrics.status = 'CRITICAL';
    }
  }

  /**
   * Record order event
   */
  recordOrder(orderEvent) {
    this.metrics.recentOrders.push({
      timestamp: this.nowProvider(),
      status: orderEvent.status,
      side: orderEvent.side,
      size: orderEvent.size
    });
    
    // Keep only last 100 orders
    if (this.metrics.recentOrders.length > 100) {
      this.metrics.recentOrders.shift();
    }
    
    this.history.orders.push(orderEvent);
    if (this.history.orders.length > this.config.anomalyWindow) {
      this.history.orders.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: this.nowProvider(),
      config: this.config
    };
  }

  /**
   * Get monitoring report
   */
  getReport() {
    const metrics = this.getMetrics();
    
    return {
      safetyScore: metrics.safetyScore,
      status: metrics.status,
      position: {
        current: this.adapter.currentPositionSize,
        cap: this.adapter.maxPositionSizeUsd,
        utilization: (metrics.positionUtilization * 100).toFixed(1) + '%'
      },
      loss: {
        current: this.adapter.dailyPnL,
        cap: -this.adapter.maxDailyLossUsd,
        utilization: (metrics.lossUtilization * 100).toFixed(1) + '%'
      },
      recentOrders: metrics.recentOrders.length,
      anomalies: metrics.anomalies.length,
      alerts: metrics.alerts.length,
      emergencyStop: this.adapter.emergencyStop
    };
  }


  /**
   * Canonical deterministic monitoring report (epoch-20 contract)
   */
  toReport() {
    const metrics = this.getMetrics();
    const recentOrders = metrics.recentOrders.slice(-20);
    const blockedOrRejected = recentOrders.filter((o) => o.status === 'rejected' || o.status === 'blocked').length;

    return {
      ts_ms: metrics.timestamp,
      safety_score: Number(metrics.safetyScore.toFixed(2)),
      status: metrics.status,
      position_utilization: Number(metrics.positionUtilization.toFixed(6)),
      loss_utilization: Number(metrics.lossUtilization.toFixed(6)),
      risk_incidents: metrics.anomalies.length + metrics.alerts.length,
      recent_orders: recentOrders.length,
      reject_ratio: recentOrders.length > 0 ? Number((blockedOrRejected / recentOrders.length).toFixed(6)) : 0,
      emergency_stop: Boolean(this.adapter.emergencyStop),
    };
  }

  /**
   * Print dashboard to console
   */
  printDashboard() {
    const report = this.getReport();
    
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ 🔍 SAFETY MONITOR (Real-time)          │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Safety Score: ${report.safetyScore}/100 ${this.getScoreEmoji(report.safetyScore)}              │`);
    console.log(`│ Status: ${report.status.padEnd(28)} │`);
    console.log(`│ Position: $${report.position.current.toFixed(0)} / $${report.position.cap} (${report.position.utilization})    │`);
    console.log(`│ Daily PnL: $${report.loss.current.toFixed(2)} / $${report.loss.cap} (${report.loss.utilization})  │`);
    console.log(`│ Recent Orders: ${report.recentOrders}                      │`);
    console.log(`│ Anomalies: ${report.anomalies}                          │`);
    console.log(`│ Alerts: ${report.alerts}                             │`);
    console.log(`│ Emergency: ${report.emergencyStop ? 'YES 🚨' : 'NO ✅'}                     │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');
  }

  getScoreEmoji(score) {
    if (score >= 90) return '✅';
    if (score >= 70) return '⚠️';
    if (score >= 50) return '🔶';
    return '🚨';
  }
}

export default SafetyMonitor;
