#!/usr/bin/env node
// core/ultimate/ultimate_system.mjs
// EPOCH-X: The Ultimate System - Complete Integration
// Orchestrates: AI Agent + Master Control + Portfolio + Data + Everything

import { EventEmitter } from 'events';
import { AutonomousAgent } from '../ai/autonomous_agent.mjs';
import { MasterControlSystem } from '../control/master_system.mjs';
import { MultiStrategyPortfolio } from '../portfolio/multi_strategy.mjs';
import { WebSocketFeed } from '../data/websocket_feed.mjs';
import { AnomalyDetector } from '../ml/anomaly_detector.mjs';
import { MODES } from '../truth/truth_engine.mjs';

/**
 * The Ultimate System
 * 
 * Complete integration of all components:
 * - Autonomous AI Agent (thinking, learning, evolving)
 * - Master Control System (truth, safety, governance)
 * - Multi-Strategy Portfolio (strategy execution)
 * - Real-time Data Feeds (WebSocket + anomaly detection)
 * - AI Brain Visualization (thought monitoring)
 * 
 * This is the FINAL FORM.
 */
export class UltimateSystem extends EventEmitter {
  constructor(ssot, options = {}) {
    super();
    
    this.ssot = ssot;
    this.options = {
      name: options.name || 'NEURO-MEV-ULTIMATE',
      mode: options.mode || 'LEARNING',
      enableAI: options.enableAI !== false,
      enableWebSocket: options.enableWebSocket || false,
      enableAnomalyDetection: options.enableAnomalyDetection !== false,
      aiPopulationSize: options.aiPopulationSize || 30,
      portfolioCapital: options.portfolioCapital || 10000,
      run_id: options.run_id || `ultimate_${Date.now()}`
    };
    
    // Core systems
    this.masterControl = null;
    this.aiAgent = null;
    this.portfolio = null;
    this.dataFeed = null;
    this.anomalyDetector = null;
    
    // System state
    this.state = {
      active: false,
      mode: 'INITIALIZING',
      startTime: null,
      uptime: 0,
      totalTrades: 0,
      aiDecisions: 0,
      anomaliesDetected: 0
    };
    
    // Performance metrics
    this.metrics = {
      latency: {
        decision: [],
        execution: [],
        total: []
      },
      throughput: {
        decisions_per_second: 0,
        trades_per_minute: 0
      },
      quality: {
        ai_confidence_avg: 0,
        truth_verdict_distribution: {},
        safety_score_avg: 0
      }
    };
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 ULTIMATE SYSTEM - INITIALIZING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Name: ${this.options.name}`);
    console.log(`   Mode: ${this.options.mode}`);
    console.log(`   AI Enabled: ${this.options.enableAI ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   WebSocket: ${this.options.enableWebSocket ? 'LIVE' : 'MOCK'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }

  /**
   * Initialize all systems
   */
  async initialize() {
    console.log('🚀 Initializing Ultimate System...');
    console.log('');
    
    try {
      // STEP 1: Initialize Master Control System
      console.log('1️⃣  Initializing Master Control System...');
      this.masterControl = new MasterControlSystem(this.ssot, {
        run_id: this.options.run_id,
        initialMode: MODES.OFF,
        enableSafetyMonitor: true,
        safetyCheckIntervalMs: 1000
      });
      await this.masterControl.start();
      console.log('   ✓ Master Control System: READY');
      console.log('');
      
      // STEP 2: Initialize Multi-Strategy Portfolio
      console.log('2️⃣  Initializing Multi-Strategy Portfolio...');
      this.portfolio = new MultiStrategyPortfolio({
        run_id: this.options.run_id,
        totalCapitalUsd: this.options.portfolioCapital,
        maxPortfolioDrawdownPct: 0.20,
        maxDailyLossUsd: this.options.portfolioCapital * 0.05
      });
      console.log('   ✓ Portfolio: READY');
      console.log('');
      
      // STEP 3: Initialize Autonomous AI Agent
      if (this.options.enableAI) {
        console.log('3️⃣  Initializing Autonomous AI Agent...');
        this.aiAgent = new AutonomousAgent({
          name: this.options.name + '-AI',
          mode: this.options.mode,
          populationSize: this.options.aiPopulationSize,
          autoEvolve: true,
          evolutionInterval: 20
        });
        await this.aiAgent.initialize();
        console.log('   ✓ AI Agent: READY');
        console.log('');
      }
      
      // STEP 4: Initialize WebSocket Data Feed
      console.log('4️⃣  Initializing WebSocket Data Feed...');
      this.dataFeed = new WebSocketFeed({
        enabled: this.options.enableWebSocket,
        url: 'wss://stream.binance.com:9443/ws'
      });
      await this.dataFeed.connect();
      console.log('   ✓ Data Feed: READY');
      console.log('');
      
      // STEP 5: Initialize Anomaly Detector
      if (this.options.enableAnomalyDetection) {
        console.log('5️⃣  Initializing ML Anomaly Detector...');
        this.anomalyDetector = new AnomalyDetector({
          enabled: true,
          windowSize: 100,
          zScoreThreshold: 3.0
        });
        console.log('   ✓ Anomaly Detector: READY');
        console.log('');
      }
      
      // STEP 6: Setup event listeners
      this._setupEventListeners();
      console.log('6️⃣  Event listeners configured');
      console.log('');
      
      // STEP 7: Register AI-generated strategies in portfolio
      if (this.aiAgent) {
        console.log('7️⃣  Registering AI strategies in portfolio...');
        const aiStrategies = this.aiAgent.strategyGen.getActiveStrategies();
        
        for (let i = 0; i < Math.min(aiStrategies.length, 3); i++) {
          const aiStrategy = aiStrategies[i];
          this.portfolio.registerStrategy({
            id: aiStrategy.id,
            name: `AI-Gen-${i + 1}`,
            allocation_pct: 30 / Math.min(aiStrategies.length, 3), // Split 30% among AI strategies
            max_position_usd: this.options.portfolioCapital * 0.3,
            max_daily_loss_usd: this.options.portfolioCapital * 0.02,
            enabled: true,
            priority: 8 + i
          });
        }
        console.log(`   ✓ Registered ${Math.min(aiStrategies.length, 3)} AI strategies`);
        console.log('');
      }
      
      // STEP 8: Final setup
      this.state.active = true;
      this.state.mode = 'READY';
      this.state.startTime = Date.now();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ULTIMATE SYSTEM: INITIALIZED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      this.emit('initialized');
      
      return { success: true };
      
    } catch (err) {
      console.error('✗ Initialization failed:', err.message);
      throw err;
    }
  }

  /**
   * Setup event listeners for cross-system communication
   * @private
   */
  _setupEventListeners() {
    // AI Agent events
    if (this.aiAgent) {
      this.aiAgent.on('decision', (decision) => {
        this.state.aiDecisions++;
        this.emit('ai_decision', decision);
      });
      
      this.aiAgent.on('trade_executed', (data) => {
        this.state.totalTrades++;
        this.emit('trade_executed', data);
      });
      
      this.aiAgent.on('evolution_complete', (data) => {
        this.emit('ai_evolved', data);
      });
    }
    
    // Data Feed events
    if (this.dataFeed) {
      this.dataFeed.on('data', (data) => {
        // Check for anomalies
        if (this.anomalyDetector) {
          this.anomalyDetector.record('price', data.price);
          const anomaly = this.anomalyDetector.check('price', data.price);
          
          if (anomaly.isAnomaly) {
            this.state.anomaliesDetected++;
            this.emit('anomaly_detected', {
              ...anomaly,
              timestamp: Date.now()
            });
          }
        }
        
        // Update master control with latest data
        if (this.masterControl) {
          this.masterControl.updateSystemState({
            last_data_timestamp: data.timestamp
          });
        }
        
        this.emit('market_data', data);
      });
    }
  }

  /**
   * Execute trading cycle
   */
  async executeTradingCycle(marketData) {
    if (!this.state.active) {
      return { executed: false, reason: 'System not active' };
    }
    
    const cycleStart = Date.now();
    
    try {
      // STEP 1: AI makes decision
      let decision = null;
      if (this.aiAgent) {
        const aiState = this._buildAIState(marketData);
        decision = await this.aiAgent.decide(aiState);
      }
      
      const decisionLatency = Date.now() - cycleStart;
      
      // STEP 2: Master Control evaluates (Truth Layer)
      const evaluation = await this.masterControl.evaluate();
      
      // STEP 3: Check if trading allowed
      if (evaluation.verdict.verdict !== 'ALLOW') {
        return {
          executed: false,
          reason: `Truth verdict: ${evaluation.verdict.verdict}`,
          verdict: evaluation.verdict
        };
      }
      
      // STEP 4: Portfolio checks risk limits
      if (decision && decision.action === 'ENTER') {
        const strategyId = decision.strategy;
        const positionSize = 1000; // Example
        
        const canTrade = this.portfolio.canTrade(strategyId, positionSize);
        
        if (!canTrade.allowed) {
          return {
            executed: false,
            reason: canTrade.reason
          };
        }
        
        // STEP 5: Execute trade (simulated for now)
        const tradeResult = {
          pnl: (Math.random() - 0.4) * 20, // Slight positive bias
          positionChangeUsd: positionSize,
          outcome: Math.random() > 0.4 ? 'WIN' : 'LOSS',
          nextState: this._buildAIState(marketData),
          done: false
        };
        
        const executionLatency = Date.now() - cycleStart - decisionLatency;
        
        // STEP 6: Record trade in portfolio
        this.portfolio.recordTrade(strategyId, tradeResult);
        
        // STEP 7: AI learns from result
        if (this.aiAgent) {
          await this.aiAgent.executeTrade(decision, tradeResult);
        }
        
        // STEP 8: Update metrics
        const totalLatency = Date.now() - cycleStart;
        this._updateMetrics({
          decisionLatency,
          executionLatency,
          totalLatency,
          aiConfidence: decision.confidence,
          truthVerdict: evaluation.verdict.verdict
        });
        
        return {
          executed: true,
          decision,
          tradeResult,
          evaluation,
          latency: {
            decision: decisionLatency,
            execution: executionLatency,
            total: totalLatency
          }
        };
      }
      
      return {
        executed: false,
        reason: 'No trade signal',
        decision
      };
      
    } catch (err) {
      console.error('Trading cycle error:', err.message);
      return {
        executed: false,
        reason: `Error: ${err.message}`
      };
    }
  }

  /**
   * Build AI state from market data
   * @private
   */
  _buildAIState(marketData) {
    return {
      price: marketData.price || 50000,
      volume: marketData.volume || 1.0,
      trend: marketData.trend || 0,
      volatility: marketData.volatility || 0.1,
      position: 0, // Current position
      pnl: this.portfolio ? this.portfolio.portfolioState.dailyPnL : 0
    };
  }

  /**
   * Update performance metrics
   * @private
   */
  _updateMetrics(data) {
    // Latency
    this.metrics.latency.decision.push(data.decisionLatency);
    this.metrics.latency.execution.push(data.executionLatency);
    this.metrics.latency.total.push(data.totalLatency);
    
    // Keep only last 100
    if (this.metrics.latency.decision.length > 100) {
      this.metrics.latency.decision.shift();
      this.metrics.latency.execution.shift();
      this.metrics.latency.total.shift();
    }
    
    // Quality
    if (data.aiConfidence) {
      const confidences = [data.aiConfidence];
      this.metrics.quality.ai_confidence_avg = 
        confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }
    
    // Truth verdict distribution
    const verdict = data.truthVerdict;
    if (!this.metrics.quality.truth_verdict_distribution[verdict]) {
      this.metrics.quality.truth_verdict_distribution[verdict] = 0;
    }
    this.metrics.quality.truth_verdict_distribution[verdict]++;
  }

  /**
   * Get comprehensive system status
   */
  getStatus() {
    const uptime = this.state.startTime ? 
      Math.floor((Date.now() - this.state.startTime) / 1000) : 0;
    
    return {
      system: {
        name: this.options.name,
        active: this.state.active,
        mode: this.state.mode,
        uptime,
        totalTrades: this.state.totalTrades,
        aiDecisions: this.state.aiDecisions,
        anomaliesDetected: this.state.anomaliesDetected
      },
      masterControl: this.masterControl ? this.masterControl.getStatus() : null,
      aiAgent: this.aiAgent ? this.aiAgent.getStatus() : null,
      portfolio: this.portfolio ? this.portfolio.getStatus() : null,
      dataFeed: this.dataFeed ? this.dataFeed.getStats() : null,
      anomalyDetector: this.anomalyDetector ? this.anomalyDetector.getStats() : null,
      metrics: this._getMetricsSummary()
    };
  }

  /**
   * Get metrics summary
   * @private
   */
  _getMetricsSummary() {
    const avgLatency = this.metrics.latency.total.length > 0 ?
      this.metrics.latency.total.reduce((a, b) => a + b, 0) / this.metrics.latency.total.length : 0;
    
    const p95Latency = this.metrics.latency.total.length > 0 ?
      this._percentile(this.metrics.latency.total, 95) : 0;
    
    return {
      latency: {
        avg: avgLatency.toFixed(2) + 'ms',
        p95: p95Latency.toFixed(2) + 'ms',
        decision_avg: this._avg(this.metrics.latency.decision).toFixed(2) + 'ms',
        execution_avg: this._avg(this.metrics.latency.execution).toFixed(2) + 'ms'
      },
      quality: {
        ai_confidence: (this.metrics.quality.ai_confidence_avg * 100).toFixed(1) + '%',
        verdict_distribution: this.metrics.quality.truth_verdict_distribution
      }
    };
  }

  /**
   * Calculate average
   * @private
   */
  _avg(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  /**
   * Calculate percentile
   * @private
   */
  _percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Print ultimate dashboard
   */
  printDashboard() {
    const status = this.getStatus();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 ULTIMATE SYSTEM DASHBOARD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // System Status
    console.log('┌────────────────────────────────────────────────────┐');
    console.log('│ SYSTEM STATUS                                      │');
    console.log('├────────────────────────────────────────────────────┤');
    console.log(`│ Name: ${status.system.name.padEnd(43)} │`);
    console.log(`│ Active: ${(status.system.active ? 'YES ✓' : 'NO ✗').padEnd(42)} │`);
    console.log(`│ Mode: ${status.system.mode.padEnd(45)} │`);
    console.log(`│ Uptime: ${status.system.uptime}s${' '.repeat(42 - status.system.uptime.toString().length)} │`);
    console.log(`│ Total Trades: ${status.system.totalTrades.toString().padEnd(36)} │`);
    console.log(`│ AI Decisions: ${status.system.aiDecisions.toString().padEnd(36)} │`);
    console.log(`│ Anomalies: ${status.system.anomaliesDetected.toString().padEnd(39)} │`);
    console.log('└────────────────────────────────────────────────────┘');
    console.log('');
    
    // Performance Metrics
    console.log('┌────────────────────────────────────────────────────┐');
    console.log('│ PERFORMANCE METRICS                                │');
    console.log('├────────────────────────────────────────────────────┤');
    console.log(`│ Avg Latency: ${status.metrics.latency.avg.padEnd(37)} │`);
    console.log(`│ P95 Latency: ${status.metrics.latency.p95.padEnd(37)} │`);
    console.log(`│ Decision Latency: ${status.metrics.latency.decision_avg.padEnd(32)} │`);
    console.log(`│ Execution Latency: ${status.metrics.latency.execution_avg.padEnd(31)} │`);
    console.log(`│ AI Confidence: ${status.metrics.quality.ai_confidence.padEnd(35)} │`);
    console.log('└────────────────────────────────────────────────────┘');
    console.log('');
    
    // Sub-system statuses
    if (this.masterControl) {
      console.log('Master Control: OPERATIONAL ✓');
    }
    if (this.aiAgent) {
      console.log(`AI Agent: ${this.aiAgent.state.active ? 'ACTIVE ✓' : 'INACTIVE ✗'}`);
    }
    if (this.portfolio) {
      console.log(`Portfolio: ${this.portfolio.getActiveStrategies().length} active strategies`);
    }
    if (this.dataFeed) {
      console.log(`Data Feed: ${this.dataFeed.connected ? 'CONNECTED ✓' : 'DISCONNECTED ✗'}`);
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }

  /**
   * Shutdown system gracefully
   */
  async shutdown() {
    console.log('🛑 Shutting down Ultimate System...');
    
    this.state.active = false;
    
    // Shutdown components
    if (this.aiAgent) {
      await this.aiAgent.shutdown();
    }
    
    if (this.masterControl) {
      await this.masterControl.stop();
    }
    
    if (this.portfolio) {
      this.portfolio.close();
    }
    
    if (this.dataFeed) {
      await this.dataFeed.disconnect();
    }
    
    console.log('✓ Ultimate System: SHUTDOWN COMPLETE');
    
    this.emit('shutdown');
  }
}

export default UltimateSystem;
