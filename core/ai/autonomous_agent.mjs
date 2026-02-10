#!/usr/bin/env node
// core/ai/autonomous_agent.mjs
// EPOCH-09: Autonomous Agent - The Complete AI System
// Integrates Cognitive Brain, Learning System, and Strategy Generator

import { EventEmitter } from 'events';
import { CognitiveBrain } from './cognitive_brain.mjs';
import { LearningSystem } from './learning_system.mjs';
import { StrategyGenerator } from './strategy_generator.mjs';

/**
 * Autonomous Trading Agent
 * 
 * A fully autonomous AI agent that:
 * - Thinks (Cognitive Brain)
 * - Learns (Learning System)
 * - Evolves (Strategy Generator)
 * - Acts (Decision Execution)
 */
export class AutonomousAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      name: options.name || 'NEURO-AI',
      mode: options.mode || 'LEARNING', // 'LEARNING' | 'PRODUCTION'
      learningRate: options.learningRate || 0.1,
      populationSize: options.populationSize || 30,
      autoEvolve: options.autoEvolve !== false,
      evolutionInterval: options.evolutionInterval || 10 // trades
    };
    
    // Core AI systems
    this.brain = new CognitiveBrain({
      name: this.options.name
    });
    
    this.learning = new LearningSystem({
      learningMode: 'HYBRID',
      learningRate: this.options.learningRate,
      bufferSize: 10000
    });
    
    this.strategyGen = new StrategyGenerator({
      populationSize: this.options.populationSize,
      mutationRate: 0.1
    });
    
    // Agent state
    this.state = {
      active: false,
      mode: this.options.mode,
      currentStrategy: null,
      tradeCount: 0,
      decisionsMade: 0,
      learningCycles: 0,
      evolutionCycles: 0
    };
    
    // Performance tracking
    this.performance = {
      totalPnL: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      avgPnL: 0,
      winRate: 0,
      sharpeRatio: 0
    };
    
    // Decision history
    this.decisions = [];
    this.maxDecisionHistory = 1000;
    
    // Setup event listeners
    this._setupEventListeners();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AUTONOMOUS AGENT INITIALIZED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Name: ${this.options.name}`);
    console.log(`   Mode: ${this.options.mode}`);
    console.log(`   Learning Rate: ${this.options.learningRate}`);
    console.log(`   Population: ${this.options.populationSize} strategies`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Brain events
    this.brain.on('thought', (data) => {
      this.emit('brain_activity', data);
    });
    
    this.brain.on('learned', (data) => {
      this.emit('knowledge_acquired', data);
    });
    
    // Learning events
    this.learning.on('experience', (data) => {
      // Also store in brain's memory
      this.brain.learn({
        type: 'experience',
        ...data
      });
    });
    
    this.learning.on('trained', (data) => {
      this.state.learningCycles++;
      this.emit('training_complete', data);
    });
    
    // Strategy generator events
    this.strategyGen.on('evolution_complete', (data) => {
      this.state.evolutionCycles++;
      this.emit('evolution_complete', data);
    });
  }

  /**
   * Initialize agent
   */
  async initialize() {
    console.log('🤖 Initializing Autonomous Agent...');
    console.log('');
    
    // Add reasoning rules to brain
    this._setupReasoningRules();
    
    // Generate initial strategy population
    this.strategyGen.generateInitialPopulation();
    
    // Deploy top strategies
    this.strategyGen.deployTopStrategies(3);
    
    // Select initial strategy
    const strategies = this.strategyGen.getActiveStrategies();
    if (strategies.length > 0) {
      this.state.currentStrategy = strategies[0].id;
    }
    
    // Set initial goal
    this.brain.setGoal({
      description: 'Achieve positive PnL',
      target: { pnl: 100 },
      deadline: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      priority: 8
    });
    
    this.state.active = true;
    
    console.log('✓ Agent initialized and ready');
    console.log('');
    
    this.emit('initialized');
  }

  /**
   * Setup reasoning rules
   * @private
   */
  _setupReasoningRules() {
    // Rule: High risk → reduce position size
    this.brain.reasoning.addRule('reduce_risk_high_volatility', {
      condition: (state) => state.volatility > 0.5,
      action: 'REDUCE_POSITION_SIZE',
      priority: 9
    });
    
    // Rule: Losing streak → pause trading
    this.brain.reasoning.addRule('pause_on_losing_streak', {
      condition: (state, context) => {
        const recentTrades = context.memories?.longTerm?.slice(0, 5) || [];
        const losses = recentTrades.filter(t => t.data.pnl < 0).length;
        return losses >= 4;
      },
      action: 'PAUSE_TRADING',
      priority: 10
    });
    
    // Rule: Profit target reached → take profits
    this.brain.reasoning.addRule('take_profits_target', {
      condition: (state) => state.dailyPnL > 100,
      action: 'TAKE_PROFITS',
      priority: 8
    });
    
    // Rule: New market regime → evolve strategies
    this.brain.reasoning.addRule('evolve_new_regime', {
      condition: (state) => state.regimeChange === true,
      action: 'EVOLVE_STRATEGIES',
      priority: 7
    });
  }

  /**
   * Make trading decision
   */
  async decide(marketState) {
    if (!this.state.active) {
      return { action: 'NONE', reason: 'Agent not active' };
    }
    
    // STEP 1: Cognitive processing
    const thought = await this.brain.think({
      context: 'trading_decision',
      marketState,
      currentState: this.state,
      performance: this.performance
    });
    
    // STEP 2: Get current strategy
    const strategy = this._getCurrentStrategy();
    if (!strategy) {
      return { action: 'NONE', reason: 'No active strategy' };
    }
    
    // STEP 3: Check strategy entry conditions
    const shouldEnter = strategy.code.shouldEnter(marketState);
    
    // STEP 4: Use learning system to refine decision
    const availableActions = shouldEnter ? ['ENTER', 'WAIT'] : ['WAIT'];
    const learnedAction = this.learning.chooseAction(marketState, availableActions);
    
    // STEP 5: Final decision
    const decision = {
      action: learnedAction,
      strategy: strategy.dna.id,
      confidence: thought.confidence,
      reasoning: thought.reasoning,
      marketState,
      timestamp: Date.now()
    };
    
    // Store decision
    this.decisions.push(decision);
    if (this.decisions.length > this.maxDecisionHistory) {
      this.decisions.shift();
    }
    
    this.state.decisionsMade++;
    
    this.emit('decision', decision);
    
    return decision;
  }

  /**
   * Execute trade and learn from result
   */
  async executeTrade(decision, result) {
    this.state.tradeCount++;
    this.performance.totalTrades++;
    
    // Calculate reward for learning
    const reward = this._calculateReward(result);
    
    // Record experience in learning system
    this.learning.recordExperience(
      decision.marketState,
      decision.action,
      reward,
      result.nextState,
      result.done || false
    );
    
    // Update performance
    this._updatePerformance(result);
    
    // Update strategy performance
    if (decision.strategy) {
      this.strategyGen.updateStrategyPerformance(decision.strategy, {
        pnl: result.pnl,
        outcome: result.pnl > 0 ? 'WIN' : 'LOSS'
      });
    }
    
    // Learn in brain
    this.brain.learn({
      type: 'trade_result',
      decision,
      result,
      reward,
      timestamp: Date.now()
    });
    
    // Auto-evolution
    if (this.options.autoEvolve && this.state.tradeCount % this.options.evolutionInterval === 0) {
      await this.evolve();
    }
    
    // Periodic training
    if (this.state.tradeCount % 10 === 0) {
      await this.train();
    }
    
    // Periodic memory consolidation
    if (this.state.tradeCount % 50 === 0) {
      await this.brain.sleep();
    }
    
    this.emit('trade_executed', {
      decision,
      result,
      reward,
      performance: this.performance
    });
  }

  /**
   * Calculate reward for reinforcement learning
   * @private
   */
  _calculateReward(result) {
    let reward = 0;
    
    // PnL reward
    reward += result.pnl * 10; // Scale PnL
    
    // Win bonus
    if (result.pnl > 0) reward += 5;
    
    // Loss penalty
    if (result.pnl < 0) reward -= 5;
    
    // Large loss penalty
    if (result.pnl < -50) reward -= 20;
    
    // Sharpe bonus
    if (this.performance.sharpeRatio > 1.5) reward += 10;
    
    return reward;
  }

  /**
   * Update performance metrics
   * @private
   */
  _updatePerformance(result) {
    this.performance.totalPnL += result.pnl;
    
    if (result.pnl > 0) {
      this.performance.wins++;
    } else if (result.pnl < 0) {
      this.performance.losses++;
    }
    
    this.performance.avgPnL = this.performance.totalPnL / this.performance.totalTrades;
    this.performance.winRate = this.performance.wins / this.performance.totalTrades;
    
    // Simple Sharpe calculation
    if (this.performance.totalTrades > 10) {
      this.performance.sharpeRatio = this.performance.avgPnL / Math.max(Math.abs(this.performance.avgPnL), 1);
    }
  }

  /**
   * Train learning system
   */
  async train() {
    console.log('🧠 Agent: Training...');
    
    const result = await this.learning.train(32);
    
    if (result.trained) {
      console.log(`   ✓ Trained on ${result.batchSize} experiences`);
    }
    
    return result;
  }

  /**
   * Evolve strategies
   */
  async evolve() {
    console.log('🧬 Agent: Evolving strategies...');
    
    await this.strategyGen.evolve(5);
    
    // Deploy new top strategies
    this.strategyGen.deployTopStrategies(3);
    
    console.log('   ✓ Evolution complete');
  }

  /**
   * Get current strategy
   * @private
   */
  _getCurrentStrategy() {
    if (!this.state.currentStrategy) return null;
    
    const activeStrategy = this.strategyGen.activeStrategies.get(this.state.currentStrategy);
    return activeStrategy;
  }

  /**
   * Switch to best strategy
   */
  switchToBestStrategy() {
    const best = this.strategyGen.getBestStrategy();
    if (best) {
      this.state.currentStrategy = best.id;
      console.log(`🔄 Switched to best strategy: ${best.id}`);
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      state: { ...this.state },
      performance: { ...this.performance },
      brain: this.brain.getStatus(),
      learning: this.learning.getStatus(),
      strategyGen: this.strategyGen.getStatus(),
      currentStrategy: this._getCurrentStrategy()
    };
  }

  /**
   * Print comprehensive report
   */
  printReport() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AUTONOMOUS AGENT STATUS REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Agent status
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ AGENT STATUS                            │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Name: ${this.options.name.padEnd(32)} │`);
    console.log(`│ Mode: ${this.state.mode.padEnd(32)} │`);
    console.log(`│ Active: ${(this.state.active ? 'YES ✓' : 'NO ✗').padEnd(31)} │`);
    console.log(`│ Trades: ${this.state.tradeCount.toString().padEnd(31)} │`);
    console.log(`│ Decisions: ${this.state.decisionsMade.toString().padEnd(28)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');
    
    // Performance
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ PERFORMANCE                             │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Total PnL: $${this.performance.totalPnL.toFixed(2).padEnd(28)} │`);
    console.log(`│ Avg PnL: $${this.performance.avgPnL.toFixed(2).padEnd(30)} │`);
    console.log(`│ Win Rate: ${(this.performance.winRate * 100).toFixed(1)}%${' '.repeat(29)} │`);
    console.log(`│ Sharpe Ratio: ${this.performance.sharpeRatio.toFixed(2).padEnd(26)} │`);
    console.log(`│ Wins/Losses: ${this.performance.wins}/${this.performance.losses}${' '.repeat(24)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');
    
    // Subsystems
    this.brain.printReport();
    this.learning.printReport();
    this.strategyGen.printReport();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }

  /**
   * Shutdown agent
   */
  async shutdown() {
    console.log('🤖 Shutting down Autonomous Agent...');
    
    this.state.active = false;
    
    // Final memory consolidation
    await this.brain.sleep();
    
    console.log('✓ Agent shutdown complete');
    
    this.emit('shutdown');
  }
}

export default AutonomousAgent;
