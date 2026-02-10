#!/usr/bin/env node
// core/portfolio/multi_strategy.mjs
// EPOCH-08: Multi-Strategy Support Framework
// Manages multiple trading strategies with allocation and risk management

import { EventLog } from '../obs/event_log.mjs';

/**
 * Strategy Configuration
 */
export class StrategyConfig {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.allocation_pct = config.allocation_pct || 0; // % of total capital
    this.max_position_usd = config.max_position_usd || 1000;
    this.max_daily_loss_usd = config.max_daily_loss_usd || 100;
    this.enabled = config.enabled !== false;
    this.priority = config.priority || 5; // 1-10 (10 = highest)
  }
}

/**
 * Strategy Runtime State
 */
export class StrategyState {
  constructor(strategyId) {
    this.strategyId = strategyId;
    this.active = false;
    this.currentPositionUsd = 0;
    this.dailyPnL = 0;
    this.totalPnL = 0;
    this.tradeCount = 0;
    this.winCount = 0;
    this.lossCount = 0;
    this.lastTradeTimestamp = null;
    this.errors = [];
  }

  updatePnL(pnl) {
    this.dailyPnL += pnl;
    this.totalPnL += pnl;
    
    if (pnl > 0) {
      this.winCount++;
    } else if (pnl < 0) {
      this.lossCount++;
    }
    
    this.tradeCount++;
    this.lastTradeTimestamp = Date.now();
  }

  getWinRate() {
    if (this.tradeCount === 0) return 0;
    return this.winCount / this.tradeCount;
  }

  reset() {
    this.currentPositionUsd = 0;
    this.dailyPnL = 0;
    this.errors = [];
  }
}

/**
 * Multi-Strategy Portfolio Manager
 * 
 * Features:
 * - Multiple strategy execution
 * - Dynamic allocation
 * - Per-strategy risk limits
 * - Portfolio-level risk management
 * - Strategy priority system
 * - Performance tracking
 */
export class MultiStrategyPortfolio {
  constructor(options = {}) {
    this.options = options;
    
    // Initialize event log
    this.eventLog = new EventLog({
      run_id: options.run_id || 'multi_strategy',
      log_dir: options.log_dir || 'logs/events'
    });
    
    // Portfolio configuration
    this.totalCapitalUsd = options.totalCapitalUsd || 10000;
    this.maxPortfolioDrawdownPct = options.maxPortfolioDrawdownPct || 0.20;
    this.maxDailyLossUsd = options.maxDailyLossUsd || 500;
    
    // Strategies
    this.strategies = new Map(); // id -> StrategyConfig
    this.strategyStates = new Map(); // id -> StrategyState
    
    // Portfolio state
    this.portfolioState = {
      totalPositionUsd: 0,
      dailyPnL: 0,
      totalPnL: 0,
      peakEquity: this.totalCapitalUsd,
      currentDrawdownPct: 0,
      activeStrategies: 0
    };
    
    // Statistics
    this.stats = {
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      startTime: Date.now()
    };
  }

  /**
   * Register a strategy
   */
  registerStrategy(config) {
    const strategy = new StrategyConfig(config);
    
    // Validate allocation
    const totalAllocation = this._getTotalAllocation() + strategy.allocation_pct;
    if (totalAllocation > 100) {
      throw new Error(`Total allocation would exceed 100% (current: ${totalAllocation}%)`);
    }
    
    this.strategies.set(strategy.id, strategy);
    this.strategyStates.set(strategy.id, new StrategyState(strategy.id));
    
    console.log(`📊 Registered strategy: ${strategy.name}`);
    console.log(`   Allocation: ${strategy.allocation_pct}%`);
    console.log(`   Max Position: $${strategy.max_position_usd}`);
    console.log(`   Priority: ${strategy.priority}/10`);
    console.log('');
    
    this.eventLog.sys('strategy_registered', {
      strategy_id: strategy.id,
      name: strategy.name,
      allocation_pct: strategy.allocation_pct
    });
    
    return strategy;
  }

  /**
   * Get total allocation across all strategies
   * @private
   */
  _getTotalAllocation() {
    let total = 0;
    for (const [_, strategy] of this.strategies) {
      total += strategy.allocation_pct;
    }
    return total;
  }

  /**
   * Enable strategy
   */
  enableStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    strategy.enabled = true;
    console.log(`✓ Strategy enabled: ${strategy.name}`);
    
    this.eventLog.sys('strategy_enabled', { strategy_id: strategyId });
  }

  /**
   * Disable strategy
   */
  disableStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    strategy.enabled = false;
    console.log(`✗ Strategy disabled: ${strategy.name}`);
    
    this.eventLog.sys('strategy_disabled', { strategy_id: strategyId });
  }

  /**
   * Check if strategy can trade
   */
  canTrade(strategyId, positionSizeUsd) {
    const strategy = this.strategies.get(strategyId);
    const state = this.strategyStates.get(strategyId);
    
    if (!strategy || !state) {
      return { allowed: false, reason: 'Strategy not found' };
    }
    
    // Check if strategy enabled
    if (!strategy.enabled) {
      return { allowed: false, reason: 'Strategy disabled' };
    }
    
    // Check strategy position limit
    if (state.currentPositionUsd + positionSizeUsd > strategy.max_position_usd) {
      return {
        allowed: false,
        reason: `Strategy position limit: ${state.currentPositionUsd + positionSizeUsd} > ${strategy.max_position_usd}`
      };
    }
    
    // Check strategy daily loss limit
    if (state.dailyPnL < -strategy.max_daily_loss_usd) {
      return {
        allowed: false,
        reason: `Strategy daily loss limit: ${state.dailyPnL} < -${strategy.max_daily_loss_usd}`
      };
    }
    
    // Check portfolio position limit (total capital)
    if (this.portfolioState.totalPositionUsd + positionSizeUsd > this.totalCapitalUsd) {
      return {
        allowed: false,
        reason: 'Portfolio capital limit exceeded'
      };
    }
    
    // Check portfolio daily loss limit
    if (this.portfolioState.dailyPnL < -this.maxDailyLossUsd) {
      return {
        allowed: false,
        reason: `Portfolio daily loss limit: ${this.portfolioState.dailyPnL} < -${this.maxDailyLossUsd}`
      };
    }
    
    // Check portfolio drawdown limit
    if (this.portfolioState.currentDrawdownPct > this.maxPortfolioDrawdownPct) {
      return {
        allowed: false,
        reason: `Portfolio drawdown limit: ${(this.portfolioState.currentDrawdownPct * 100).toFixed(1)}% > ${(this.maxPortfolioDrawdownPct * 100).toFixed(1)}%`
      };
    }
    
    return { allowed: true };
  }

  /**
   * Record strategy trade
   */
  recordTrade(strategyId, trade) {
    const state = this.strategyStates.get(strategyId);
    if (!state) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    // Update strategy state
    state.updatePnL(trade.pnl);
    state.currentPositionUsd += trade.positionChangeUsd || 0;
    
    // Update portfolio state
    this.portfolioState.dailyPnL += trade.pnl;
    this.portfolioState.totalPnL += trade.pnl;
    this.portfolioState.totalPositionUsd += trade.positionChangeUsd || 0;
    
    // Update peak equity and drawdown
    const currentEquity = this.totalCapitalUsd + this.portfolioState.totalPnL;
    if (currentEquity > this.portfolioState.peakEquity) {
      this.portfolioState.peakEquity = currentEquity;
    }
    
    const drawdown = (this.portfolioState.peakEquity - currentEquity) / this.portfolioState.peakEquity;
    this.portfolioState.currentDrawdownPct = Math.max(0, drawdown);
    
    // Update statistics
    this.stats.totalTrades++;
    if (trade.pnl > 0) this.stats.totalWins++;
    if (trade.pnl < 0) this.stats.totalLosses++;
    
    // Log trade
    this.eventLog.sys('strategy_trade', {
      strategy_id: strategyId,
      pnl: trade.pnl,
      position_change: trade.positionChangeUsd,
      portfolio_pnl: this.portfolioState.dailyPnL,
      portfolio_drawdown: this.portfolioState.currentDrawdownPct
    });
  }

  /**
   * Get strategy allocation in USD
   */
  getStrategyCapital(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return 0;
    
    return (this.totalCapitalUsd * strategy.allocation_pct) / 100;
  }

  /**
   * Get active strategies (sorted by priority)
   */
  getActiveStrategies() {
    const active = [];
    
    for (const [id, strategy] of this.strategies) {
      if (strategy.enabled) {
        const state = this.strategyStates.get(id);
        active.push({
          config: strategy,
          state: state,
          capitalUsd: this.getStrategyCapital(id)
        });
      }
    }
    
    // Sort by priority (highest first)
    active.sort((a, b) => b.config.priority - a.config.priority);
    
    return active;
  }

  /**
   * Get portfolio status
   */
  getStatus() {
    const activeStrategies = this.getActiveStrategies();
    
    return {
      totalCapitalUsd: this.totalCapitalUsd,
      portfolioState: { ...this.portfolioState },
      stats: { ...this.stats },
      strategies: {
        total: this.strategies.size,
        active: activeStrategies.length,
        list: activeStrategies.map(s => ({
          id: s.config.id,
          name: s.config.name,
          allocation_pct: s.config.allocation_pct,
          capitalUsd: s.capitalUsd,
          dailyPnL: s.state.dailyPnL,
          totalPnL: s.state.totalPnL,
          tradeCount: s.state.tradeCount,
          winRate: s.state.getWinRate()
        }))
      },
      timestamp: Date.now()
    };
  }

  /**
   * Print portfolio dashboard
   */
  printDashboard() {
    const status = this.getStatus();
    
    console.log('┌───────────────────────────────────────────────────────┐');
    console.log('│ 📊 MULTI-STRATEGY PORTFOLIO                           │');
    console.log('├───────────────────────────────────────────────────────┤');
    console.log(`│ Total Capital: $${status.totalCapitalUsd.toFixed(0)}${' '.repeat(38 - status.totalCapitalUsd.toFixed(0).length)} │`);
    console.log(`│ Daily PnL: $${status.portfolioState.dailyPnL.toFixed(2)}${' '.repeat(42 - status.portfolioState.dailyPnL.toFixed(2).length)} │`);
    console.log(`│ Total PnL: $${status.portfolioState.totalPnL.toFixed(2)}${' '.repeat(42 - status.portfolioState.totalPnL.toFixed(2).length)} │`);
    console.log(`│ Drawdown: ${(status.portfolioState.currentDrawdownPct * 100).toFixed(1)}%${' '.repeat(45 - (status.portfolioState.currentDrawdownPct * 100).toFixed(1).length)} │`);
    console.log(`│ Active Strategies: ${status.strategies.active}/${status.strategies.total}${' '.repeat(31)} │`);
    console.log('├───────────────────────────────────────────────────────┤');
    
    for (const strategy of status.strategies.list) {
      console.log(`│ ${strategy.name.padEnd(20)} ${strategy.allocation_pct}% $${strategy.dailyPnL.toFixed(2).padStart(8)} ${strategy.tradeCount} trades │`);
    }
    
    console.log('└───────────────────────────────────────────────────────┘');
    console.log('');
  }

  /**
   * Reset daily statistics
   */
  resetDaily() {
    // Reset portfolio daily PnL
    this.portfolioState.dailyPnL = 0;
    
    // Reset strategy daily PnL
    for (const [_, state] of this.strategyStates) {
      state.dailyPnL = 0;
    }
    
    console.log('🔄 Daily reset completed');
    
    this.eventLog.sys('daily_reset', {
      timestamp: Date.now()
    });
  }

  /**
   * Close event log
   */
  close() {
    if (this.eventLog) {
      this.eventLog.close();
    }
  }
}

export default MultiStrategyPortfolio;
