#!/usr/bin/env node
// core/obs/reality_gap_monitor.mjs
// Reality Gap Monitor - Tracks divergence between simulation and reality
// 
// Key Insight: Simulations are never perfect. The "reality gap" is the difference
// between what we predicted (paper trading) and what actually happened (live trading).
// 
// A growing reality gap indicates:
// 1. Simulation assumptions breaking down
// 2. Market regime change
// 3. Execution quality degradation
// 4. Hidden costs/slippage
// 
// When gap exceeds threshold → STOP live trading, fix simulation

/**
 * Reality Gap Metrics
 */
export class RealityGapMetrics {
  constructor() {
    this.paper_trades = [];
    this.live_trades = [];
    this.metrics = {
      fill_rate_gap: 0,
      slippage_gap: 0,
      fee_gap: 0,
      timing_gap: 0,
      pnl_gap: 0
    };
    this.thresholds = {
      fill_rate_gap: 0.1, // 10% difference
      slippage_gap: 0.005, // 0.5% difference
      fee_gap: 0.001, // 0.1% difference
      timing_gap: 1000, // 1 second difference
      pnl_gap: 0.2 // 20% difference
    };
    this.alerts = [];
  }

  /**
   * Record paper trade
   */
  recordPaperTrade(trade) {
    this.paper_trades.push({
      timestamp: Date.now(),
      intent: trade.intent,
      filled: trade.filled,
      fill_price: trade.filled_price,
      fee: trade.fee,
      slippage: trade.slippage,
      pnl: trade.pnl_usd,
      timing_ms: trade.timing_ms || 0
    });
  }

  /**
   * Record live trade
   */
  recordLiveTrade(trade) {
    this.live_trades.push({
      timestamp: Date.now(),
      intent: trade.intent,
      filled: trade.filled,
      fill_price: trade.filled_price,
      fee: trade.fee,
      slippage: trade.slippage,
      pnl: trade.pnl_usd,
      timing_ms: trade.timing_ms || 0
    });
  }

  /**
   * Compute reality gap metrics
   */
  computeGap() {
    if (this.paper_trades.length === 0 || this.live_trades.length === 0) {
      return this.metrics; // No data yet
    }

    // Fill rate gap
    const paper_fill_rate = this.paper_trades.filter(t => t.filled).length / this.paper_trades.length;
    const live_fill_rate = this.live_trades.filter(t => t.filled).length / this.live_trades.length;
    this.metrics.fill_rate_gap = Math.abs(paper_fill_rate - live_fill_rate);

    // Slippage gap
    const paper_slippage = this._avg(this.paper_trades.map(t => t.slippage));
    const live_slippage = this._avg(this.live_trades.map(t => t.slippage));
    this.metrics.slippage_gap = Math.abs(paper_slippage - live_slippage);

    // Fee gap
    const paper_fee_pct = this._avg(this.paper_trades.map(t => t.fee / (t.fill_price * 100)));
    const live_fee_pct = this._avg(this.live_trades.map(t => t.fee / (t.fill_price * 100)));
    this.metrics.fee_gap = Math.abs(paper_fee_pct - live_fee_pct);

    // Timing gap
    const paper_timing = this._avg(this.paper_trades.map(t => t.timing_ms));
    const live_timing = this._avg(this.live_trades.map(t => t.timing_ms));
    this.metrics.timing_gap = Math.abs(paper_timing - live_timing);

    // P&L gap
    const paper_pnl = this._sum(this.paper_trades.map(t => t.pnl));
    const live_pnl = this._sum(this.live_trades.map(t => t.pnl));
    const pnl_gap_abs = Math.abs(paper_pnl - live_pnl);
    this.metrics.pnl_gap = paper_pnl !== 0 ? pnl_gap_abs / Math.abs(paper_pnl) : 0;

    return this.metrics;
  }

  /**
   * Check if reality gap exceeds thresholds
   */
  checkThresholds() {
    this.computeGap();
    
    const violations = [];
    
    if (this.metrics.fill_rate_gap > this.thresholds.fill_rate_gap) {
      violations.push(`Fill rate gap: ${(this.metrics.fill_rate_gap * 100).toFixed(1)}% (threshold: ${(this.thresholds.fill_rate_gap * 100).toFixed(1)}%)`);
    }
    
    if (this.metrics.slippage_gap > this.thresholds.slippage_gap) {
      violations.push(`Slippage gap: ${(this.metrics.slippage_gap * 100).toFixed(2)}% (threshold: ${(this.thresholds.slippage_gap * 100).toFixed(2)}%)`);
    }
    
    if (this.metrics.fee_gap > this.thresholds.fee_gap) {
      violations.push(`Fee gap: ${(this.metrics.fee_gap * 100).toFixed(3)}% (threshold: ${(this.thresholds.fee_gap * 100).toFixed(3)}%)`);
    }
    
    if (this.metrics.timing_gap > this.thresholds.timing_gap) {
      violations.push(`Timing gap: ${this.metrics.timing_gap.toFixed(0)}ms (threshold: ${this.thresholds.timing_gap}ms)`);
    }
    
    if (this.metrics.pnl_gap > this.thresholds.pnl_gap) {
      violations.push(`P&L gap: ${(this.metrics.pnl_gap * 100).toFixed(1)}% (threshold: ${(this.thresholds.pnl_gap * 100).toFixed(1)}%)`);
    }
    
    if (violations.length > 0) {
      const alert = {
        timestamp: Date.now(),
        violations,
        action: 'STOP LIVE TRADING - Reality gap too large'
      };
      this.alerts.push(alert);
      return { exceeded: true, alert };
    }
    
    return { exceeded: false };
  }

  /**
   * Get report
   */
  getReport() {
    this.computeGap();
    
    return {
      paper_trades_count: this.paper_trades.length,
      live_trades_count: this.live_trades.length,
      metrics: this.metrics,
      thresholds: this.thresholds,
      alerts: this.alerts,
      status: this.alerts.length > 0 ? 'ALERT' : 'OK'
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.paper_trades = [];
    this.live_trades = [];
    this.alerts = [];
    this.metrics = {
      fill_rate_gap: 0,
      slippage_gap: 0,
      fee_gap: 0,
      timing_gap: 0,
      pnl_gap: 0
    };
  }

  // Helper methods
  _avg(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  _sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
  }
}

/**
 * Reality Gap Monitor
 * Continuously tracks reality gap and alerts when thresholds exceeded
 */
export class RealityGapMonitor {
  constructor(options = {}) {
    this.metrics = new RealityGapMetrics();
    this.checkIntervalMs = options.checkIntervalMs || 60000; // Check every minute
    this.onAlert = options.onAlert || null; // Callback for alerts
    this.monitoring = false;
    this.intervalId = null;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    console.log('🔍 Reality Gap Monitor: STARTED');
    
    this.intervalId = setInterval(() => {
      const check = this.metrics.checkThresholds();
      if (check.exceeded && this.onAlert) {
        this.onAlert(check.alert);
      }
    }, this.checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🔍 Reality Gap Monitor: STOPPED');
  }

  /**
   * Record paper trade
   */
  recordPaper(trade) {
    this.metrics.recordPaperTrade(trade);
  }

  /**
   * Record live trade
   */
  recordLive(trade) {
    this.metrics.recordLiveTrade(trade);
  }

  /**
   * Get current report
   */
  getReport() {
    return this.metrics.getReport();
  }

  /**
   * Print report to console
   */
  printReport() {
    const report = this.getReport();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 REALITY GAP REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Paper trades: ${report.paper_trades_count}`);
    console.log(`Live trades: ${report.live_trades_count}`);
    console.log('');
    console.log('Metrics vs Thresholds:');
    console.log(`  Fill rate gap: ${(report.metrics.fill_rate_gap * 100).toFixed(1)}% (${(report.thresholds.fill_rate_gap * 100).toFixed(1)}%)`);
    console.log(`  Slippage gap: ${(report.metrics.slippage_gap * 100).toFixed(2)}% (${(report.thresholds.slippage_gap * 100).toFixed(2)}%)`);
    console.log(`  Fee gap: ${(report.metrics.fee_gap * 100).toFixed(3)}% (${(report.thresholds.fee_gap * 100).toFixed(3)}%)`);
    console.log(`  Timing gap: ${report.metrics.timing_gap.toFixed(0)}ms (${report.thresholds.timing_gap}ms)`);
    console.log(`  P&L gap: ${(report.metrics.pnl_gap * 100).toFixed(1)}% (${(report.thresholds.pnl_gap * 100).toFixed(1)}%)`);
    console.log('');
    console.log(`Status: ${report.status}`);
    
    if (report.alerts.length > 0) {
      console.log('');
      console.log('🚨 ALERTS:');
      for (const alert of report.alerts) {
        console.log(`  ${new Date(alert.timestamp).toISOString()}`);
        for (const violation of alert.violations) {
          console.log(`    • ${violation}`);
        }
        console.log(`    → ${alert.action}`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }
}

export default RealityGapMonitor;
