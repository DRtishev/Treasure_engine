#!/usr/bin/env node
// core/control/master_system.mjs
// EPOCH-07: Master Control System
// Orchestrates: Truth → Safety → Healing → Performance → Court

import { TruthEngine, VERDICTS, MODES } from '../truth/truth_engine.mjs';
import { GovernanceFSM } from '../governance/mode_fsm.mjs';
import { SafetyMonitor } from '../monitoring/safety_monitor.mjs';
import { SelfHealingSystem } from '../resilience/self_healing.mjs';
import { PerformanceEngine } from '../performance/perf_engine.mjs';
import { EventLog } from '../obs/event_log.mjs';

/**
 * Master Control System - Single entry point for all operations
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────┐
 * │          MASTER CONTROL SYSTEM              │
 * ├─────────────────────────────────────────────┤
 * │                                             │
 * │  1. Truth Engine (authoritative judge)      │
 * │     ↓                                       │
 * │  2. Governance FSM (mode transitions)       │
 * │     ↓                                       │
 * │  3. Safety Monitor (real-time scoring)      │
 * │     ↓                                       │
 * │  4. Self-Healing (auto-recovery)            │
 * │     ↓                                       │
 * │  5. Performance Engine (optimization)       │
 * │                                             │
 * │  Hierarchy: Safety > Truth > Profit         │
 * └─────────────────────────────────────────────┘
 */
export class MasterControlSystem {
  constructor(ssot, options = {}) {
    this.ssot = ssot;
    this.options = options;
    
    // Initialize event log
    this.eventLog = new EventLog({
      run_id: options.run_id || 'master_control',
      log_dir: options.log_dir || 'logs/events'
    });
    
    // Create mock adapter for safety monitor and self-healing
    this.mockAdapter = {
      emergencyStop: false,
      currentPositionSize: 0,
      dailyPnL: 0,
      maxPositionSizeUsd: ssot.risk_governor?.max_position_size_usd || 1000,
      maxDailyLossUsd: ssot.risk_governor?.max_daily_loss_usd || 100,
      getStats: () => ({
        current_position_usd: (this.systemState?.current_drawdown_pct || 0) * 1000,
        daily_pnl: this.systemState?.daily_loss_usd || 0
      }),
      reset: () => {
        this.mockAdapter.emergencyStop = false;
      }
    };
    
    // Initialize core components (in order of hierarchy)
    this.truthEngine = new TruthEngine(ssot);
    this.governanceFSM = new GovernanceFSM(options.initialMode || MODES.OFF);
    
    this.safetyMonitor = new SafetyMonitor(this.mockAdapter, {
      eventLog: this.eventLog,
      enabled: options.enableSafetyMonitor !== false,
      checkIntervalMs: options.safetyCheckIntervalMs || 1000
    });
    
    this.selfHealing = new SelfHealingSystem(this.mockAdapter, {
      eventLog: this.eventLog
    });
    
    this.performanceEngine = new PerformanceEngine({
      enabled: options.enablePerformance !== false
    });
    
    // System state
    this.systemState = {
      kill_switch: false,
      emergency_stop: false,
      reality_gap: 0,
      current_drawdown_pct: 0,
      daily_loss_usd: 0,
      last_data_timestamp: Date.now(),
      perf_p99_ms: 0,
      rejection_rate: 0,
      avg_slippage_bps: 0,
      system_confidence: 1.0,
      requested_mode: options.initialMode || MODES.OFF
    };
    
    // Operational state
    this.currentTruthVerdict = null;
    this.operationalMode = MODES.OFF;
    this.lastHealthCheck = null;
    this.status = 'INITIALIZING';
    
    console.log('🎛️  Master Control System initialized');
    console.log(`   Mode: ${this.operationalMode}`);
    console.log(`   Safety Monitor: ${options.enableSafetyMonitor !== false ? 'ENABLED' : 'DISABLED'}`);
    console.log('');
  }

  /**
   * Start the master control system
   */
  async start() {
    console.log('🚀 Master Control System: STARTING...');
    console.log('');
    
    // Start safety monitor
    if (this.safetyMonitor.config.enabled) {
      this.safetyMonitor.start();
    }
    
    // Initial evaluation
    await this.evaluate();
    
    this.status = 'RUNNING';
    console.log('✓ Master Control System: RUNNING');
    console.log('');
    
    return {
      success: true,
      status: this.status,
      mode: this.operationalMode,
      timestamp: Date.now()
    };
  }

  /**
   * Stop the master control system
   */
  async stop() {
    console.log('🛑 Master Control System: STOPPING...');
    
    // Stop safety monitor
    if (this.safetyMonitor) {
      this.safetyMonitor.stop();
    }
    
    // Close event log
    if (this.eventLog) {
      this.eventLog.close();
    }
    
    this.status = 'STOPPED';
    console.log('✓ Master Control System: STOPPED');
    console.log('');
    
    return {
      success: true,
      status: this.status,
      timestamp: Date.now()
    };
  }

  /**
   * Evaluate system state and update verdict
   */
  async evaluate() {
    // STEP 1: Truth Engine evaluation
    this.currentTruthVerdict = this.truthEngine.evaluate(this.systemState);
    
    // STEP 2: Governance FSM transition
    const transition = this.governanceFSM.transition(
      this.currentTruthVerdict.mode,
      this.currentTruthVerdict
    );
    
    if (transition.success) {
      this.operationalMode = transition.to;
    }
    
    // STEP 3: Self-healing check
    if (this.currentTruthVerdict.verdict !== VERDICTS.HALT) {
      // Only allow self-healing if not HALT
      this.lastHealthCheck = await this.selfHealing.runHealthChecks();
    }
    
    // Log evaluation
    this.eventLog.sys('master_evaluation', {
      truth_verdict: this.currentTruthVerdict.verdict,
      truth_mode: this.currentTruthVerdict.mode,
      truth_confidence: this.currentTruthVerdict.confidence,
      truth_reason_codes: this.currentTruthVerdict.reason_codes,
      operational_mode: this.operationalMode,
      fsm_state: this.governanceFSM.getState(),
      health_check: this.lastHealthCheck
    });
    
    return {
      verdict: this.currentTruthVerdict,
      mode: this.operationalMode,
      transition: transition,
      health: this.lastHealthCheck
    };
  }

  /**
   * Update system state (from external sources)
   */
  updateSystemState(updates) {
    Object.assign(this.systemState, updates);
    this.systemState.last_data_timestamp = Date.now();
  }

  /**
   * Request mode change
   */
  async requestMode(newMode) {
    console.log(`📡 Mode change requested: ${this.operationalMode} → ${newMode}`);
    
    // Update system state
    this.systemState.requested_mode = newMode;
    
    // Re-evaluate
    const result = await this.evaluate();
    
    if (result.mode === newMode) {
      console.log(`✓ Mode change successful: ${newMode}`);
    } else {
      console.log(`⚠️  Mode change blocked: requested ${newMode}, got ${result.mode}`);
      console.log(`   Truth verdict: ${result.verdict.verdict}`);
      console.log(`   Reason codes: ${result.verdict.reason_codes.join(', ')}`);
    }
    
    return result;
  }

  /**
   * Activate kill switch (emergency halt)
   */
  async activateKillSwitch(reason) {
    console.log('🚨 KILL SWITCH ACTIVATED');
    console.log(`   Reason: ${reason}`);
    console.log('');
    
    this.systemState.kill_switch = true;
    this.systemState.emergency_stop = true;
    this.mockAdapter.emergencyStop = true;
    
    const result = await this.evaluate();
    
    this.eventLog.sys('kill_switch_activated', {
      reason,
      verdict: result.verdict
    });
    
    return result;
  }

  /**
   * Request manual reset (to exit HALT)
   */
  async requestManualReset() {
    console.log('🔄 Manual reset requested...');
    
    // Clear kill switch and emergency stop
    this.systemState.kill_switch = false;
    this.systemState.emergency_stop = false;
    this.mockAdapter.emergencyStop = false;
    
    // Request FSM manual reset
    const fsmReset = this.governanceFSM.requestManualReset();
    
    // Re-evaluate
    const result = await this.evaluate();
    
    console.log(`   FSM reset: ${fsmReset.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   New verdict: ${result.verdict.verdict}`);
    console.log(`   New mode: ${result.mode}`);
    console.log('');
    
    return {
      fsm_reset: fsmReset,
      evaluation: result
    };
  }

  /**
   * Get system status (comprehensive report)
   */
  getStatus() {
    return {
      status: this.status,
      operational_mode: this.operationalMode,
      truth_verdict: this.currentTruthVerdict,
      fsm_state: this.governanceFSM.getState(),
      system_state: { ...this.systemState },
      safety_metrics: this.safetyMonitor ? this.safetyMonitor.getMetrics() : null,
      health_check: this.lastHealthCheck,
      performance_metrics: this.performanceEngine.getMetrics(),
      timestamp: Date.now()
    };
  }

  /**
   * Print comprehensive dashboard
   */
  printDashboard() {
    const status = this.getStatus();
    
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 🎛️  MASTER CONTROL SYSTEM DASHBOARD                        │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ Status: ${status.status.padEnd(50)} │`);
    console.log(`│ Mode: ${status.operational_mode.padEnd(52)} │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    
    if (status.truth_verdict) {
      console.log('│ TRUTH LAYER                                                 │');
      console.log(`│   Verdict: ${status.truth_verdict.verdict.padEnd(47)} │`);
      console.log(`│   Confidence: ${status.truth_verdict.confidence.toFixed(2).padEnd(45)} │`);
      console.log(`│   Reason Codes: ${status.truth_verdict.reason_codes.join(', ').substring(0, 40).padEnd(40)} │`);
    }
    
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ SYSTEM STATE                                                │');
    console.log(`│   Kill Switch: ${(status.system_state.kill_switch ? 'ACTIVE 🚨' : 'OFF ✓').padEnd(43)} │`);
    console.log(`│   Emergency Stop: ${(status.system_state.emergency_stop ? 'ACTIVE 🚨' : 'OFF ✓').padEnd(40)} │`);
    console.log(`│   Reality Gap: ${(status.system_state.reality_gap * 100).toFixed(1)}%${' '.repeat(42)} │`);
    console.log(`│   Drawdown: ${(status.system_state.current_drawdown_pct * 100).toFixed(1)}%${' '.repeat(45)} │`);
    
    if (status.safety_metrics) {
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log('│ SAFETY MONITOR                                              │');
      console.log(`│   Safety Score: ${status.safety_metrics.safetyScore}/100${' '.repeat(37)} │`);
      console.log(`│   Status: ${status.safety_metrics.status.padEnd(47)} │`);
      console.log(`│   Anomalies: ${status.safety_metrics.anomalies.length}${' '.repeat(45)} │`);
    }
    
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('');
  }
}

export default MasterControlSystem;
