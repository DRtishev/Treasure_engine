#!/usr/bin/env node
// core/ai/strategy_generator.mjs
// EPOCH-09: Strategy Generator - Automatic Strategy Creation & Evolution
// Generates and evolves trading strategies using genetic algorithms

import { EventEmitter } from 'events';

/**
 * Strategy DNA - Genetic representation of a trading strategy
 */
export class StrategyDNA {
  constructor(genes = null) {
    if (genes) {
      this.genes = genes;
    } else {
      // Random initialization
      this.genes = {
        // Entry conditions
        entry_trend_threshold: Math.random() * 0.4 - 0.2, // -0.2 to 0.2
        entry_volume_multiplier: 1 + Math.random() * 2, // 1 to 3
        entry_volatility_max: Math.random() * 0.5, // 0 to 0.5
        
        // Exit conditions
        exit_profit_target: 0.01 + Math.random() * 0.04, // 1% to 5%
        exit_stop_loss: -0.005 - Math.random() * 0.02, // -0.5% to -2.5%
        exit_time_limit: 300 + Math.random() * 1200, // 5-25 minutes
        
        // Position sizing
        position_size_base: 0.1 + Math.random() * 0.3, // 10% to 40%
        position_size_volatility_adj: Math.random() * 2 - 1, // -1 to 1
        
        // Risk management
        max_concurrent_positions: Math.floor(1 + Math.random() * 3), // 1-3
        risk_per_trade: 0.01 + Math.random() * 0.02, // 1% to 3%
        
        // Timing
        min_time_between_trades: 60 + Math.random() * 240, // 1-5 minutes
        trade_during_high_volatility: Math.random() > 0.5
      };
    }
    
    // Performance metrics
    this.fitness = 0;
    this.trades = 0;
    this.wins = 0;
    this.totalPnL = 0;
    this.sharpeRatio = 0;
    
    // Metadata
    this.generation = 0;
    this.id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.parentIds = [];
  }

  /**
   * Mutate genes
   */
  mutate(mutationRate = 0.1) {
    const mutated = { ...this.genes };
    
    for (const key in mutated) {
      if (Math.random() < mutationRate) {
        // Mutate this gene
        const currentValue = mutated[key];
        
        if (typeof currentValue === 'number') {
          // Gaussian mutation
          const mutation = (Math.random() - 0.5) * 0.2 * Math.abs(currentValue);
          mutated[key] = currentValue + mutation;
          
          // Clamp to reasonable ranges
          if (key.includes('threshold') || key.includes('ratio')) {
            mutated[key] = Math.max(-1, Math.min(1, mutated[key]));
          } else if (key.includes('size') || key.includes('risk')) {
            mutated[key] = Math.max(0, Math.min(1, mutated[key]));
          }
        } else if (typeof currentValue === 'boolean') {
          mutated[key] = Math.random() > 0.5;
        }
      }
    }
    
    return new StrategyDNA(mutated);
  }

  /**
   * Crossover with another strategy
   */
  crossover(other) {
    const child1Genes = {};
    const child2Genes = {};
    
    for (const key in this.genes) {
      // Uniform crossover
      if (Math.random() > 0.5) {
        child1Genes[key] = this.genes[key];
        child2Genes[key] = other.genes[key];
      } else {
        child1Genes[key] = other.genes[key];
        child2Genes[key] = this.genes[key];
      }
    }
    
    const child1 = new StrategyDNA(child1Genes);
    const child2 = new StrategyDNA(child2Genes);
    
    child1.parentIds = [this.id, other.id];
    child2.parentIds = [this.id, other.id];
    child1.generation = Math.max(this.generation, other.generation) + 1;
    child2.generation = Math.max(this.generation, other.generation) + 1;
    
    return [child1, child2];
  }

  /**
   * Calculate fitness based on performance
   */
  calculateFitness() {
    if (this.trades === 0) {
      this.fitness = 0;
      return 0;
    }
    
    const winRate = this.wins / this.trades;
    const avgPnL = this.totalPnL / this.trades;
    
    // Fitness = weighted combination of metrics
    this.fitness = (
      winRate * 0.3 +                    // Win rate (30%)
      Math.max(0, avgPnL) * 0.4 +        // Avg PnL (40%)
      Math.max(0, this.sharpeRatio) * 0.3 // Sharpe (30%)
    );
    
    return this.fitness;
  }

  /**
   * Update performance metrics
   */
  updatePerformance(trade) {
    this.trades++;
    if (trade.pnl > 0) this.wins++;
    this.totalPnL += trade.pnl;
    
    // Simple Sharpe approximation
    if (this.trades > 10) {
      const returns = []; // Would track all returns
      // this.sharpeRatio = mean(returns) / std(returns)
      // Simplified for now
      this.sharpeRatio = (this.totalPnL / this.trades) / Math.max(Math.abs(this.totalPnL / this.trades), 1);
    }
    
    this.calculateFitness();
  }

  /**
   * Generate strategy code (for execution)
   */
  toCode() {
    return {
      id: this.id,
      name: `Generated Strategy ${this.generation}`,
      genes: { ...this.genes },
      
      // Entry signal function
      shouldEnter: (marketState) => {
        const { trend, volume, volatility } = marketState;
        
        if (volatility > this.genes.entry_volatility_max) return false;
        if (!this.genes.trade_during_high_volatility && volatility > 0.3) return false;
        if (Math.abs(trend) < Math.abs(this.genes.entry_trend_threshold)) return false;
        if (volume < this.genes.entry_volume_multiplier) return false;
        
        return true;
      },
      
      // Exit signal function
      shouldExit: (position, currentPrice, entryTime) => {
        const pnlPct = (currentPrice - position.entryPrice) / position.entryPrice;
        const timeElapsed = Date.now() - entryTime;
        
        // Take profit
        if (pnlPct >= this.genes.exit_profit_target) return { exit: true, reason: 'PROFIT_TARGET' };
        
        // Stop loss
        if (pnlPct <= this.genes.exit_stop_loss) return { exit: true, reason: 'STOP_LOSS' };
        
        // Time limit
        if (timeElapsed >= this.genes.exit_time_limit * 1000) return { exit: true, reason: 'TIME_LIMIT' };
        
        return { exit: false };
      },
      
      // Position sizing
      calculatePositionSize: (capital, volatility) => {
        let size = this.genes.position_size_base;
        
        // Adjust for volatility
        size += volatility * this.genes.position_size_volatility_adj;
        
        // Clamp
        size = Math.max(0.05, Math.min(0.5, size));
        
        return capital * size;
      },
      
      // Risk per trade
      riskPerTrade: this.genes.risk_per_trade
    };
  }

  /**
   * Get summary
   */
  getSummary() {
    return {
      id: this.id,
      generation: this.generation,
      fitness: this.fitness.toFixed(4),
      trades: this.trades,
      winRate: this.trades > 0 ? (this.wins / this.trades * 100).toFixed(1) + '%' : '0%',
      totalPnL: this.totalPnL.toFixed(2),
      sharpeRatio: this.sharpeRatio.toFixed(2)
    };
  }
}

/**
 * Population Manager - Manages population of strategies
 */
export class Population {
  constructor(size = 50) {
    this.size = size;
    this.strategies = [];
    this.generation = 0;
    this.bestEver = null;
    
    // Initialize population
    for (let i = 0; i < size; i++) {
      this.strategies.push(new StrategyDNA());
    }
  }

  /**
   * Evaluate all strategies
   */
  evaluate() {
    for (const strategy of this.strategies) {
      strategy.calculateFitness();
    }
    
    // Sort by fitness
    this.strategies.sort((a, b) => b.fitness - a.fitness);
    
    // Track best ever
    if (!this.bestEver || this.strategies[0].fitness > this.bestEver.fitness) {
      this.bestEver = this.strategies[0];
    }
  }

  /**
   * Select parents using tournament selection
   */
  selectParents(tournamentSize = 5) {
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.strategies.length);
      tournament.push(this.strategies[idx]);
    }
    
    tournament.sort((a, b) => b.fitness - a.fitness);
    
    return tournament[0];
  }

  /**
   * Evolve to next generation
   */
  evolve(eliteCount = 5, mutationRate = 0.1) {
    this.evaluate();
    
    const newPopulation = [];
    
    // Elitism: Keep best strategies
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(this.strategies[i]);
    }
    
    // Create offspring
    while (newPopulation.length < this.size) {
      const parent1 = this.selectParents();
      const parent2 = this.selectParents();
      
      const [child1, child2] = parent1.crossover(parent2);
      
      // Mutate children
      const mutatedChild1 = child1.mutate(mutationRate);
      const mutatedChild2 = child2.mutate(mutationRate);
      
      newPopulation.push(mutatedChild1);
      if (newPopulation.length < this.size) {
        newPopulation.push(mutatedChild2);
      }
    }
    
    this.strategies = newPopulation;
    this.generation++;
  }

  /**
   * Get top strategies
   */
  getTop(count = 10) {
    return this.strategies.slice(0, count);
  }

  /**
   * Get statistics
   */
  getStats() {
    const fitnesses = this.strategies.map(s => s.fitness);
    
    return {
      generation: this.generation,
      size: this.size,
      avgFitness: (fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length).toFixed(4),
      maxFitness: Math.max(...fitnesses).toFixed(4),
      minFitness: Math.min(...fitnesses).toFixed(4),
      bestEver: this.bestEver ? this.bestEver.getSummary() : null
    };
  }
}

/**
 * Strategy Generator - Main system for generating and evolving strategies
 */
export class StrategyGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      populationSize: options.populationSize || 50,
      eliteCount: options.eliteCount || 5,
      mutationRate: options.mutationRate || 0.1,
      generationsPerEpoch: options.generationsPerEpoch || 10
    };
    
    // Population
    this.population = new Population(this.options.populationSize);
    
    // Active strategies (deployed for trading)
    this.activeStrategies = new Map(); // id -> strategy
    
    // History
    this.evolutionHistory = [];
    
    console.log('🔬 Strategy Generator initialized');
    console.log(`   Population: ${this.options.populationSize}`);
    console.log(`   Mutation Rate: ${this.options.mutationRate}`);
  }

  /**
   * Generate initial population
   */
  generateInitialPopulation() {
    console.log('🔬 Generating initial population...');
    
    this.population.evaluate();
    
    const stats = this.population.getStats();
    console.log(`   Generation: ${stats.generation}`);
    console.log(`   Avg Fitness: ${stats.avgFitness}`);
    console.log('');
    
    this.emit('population_generated', {
      generation: stats.generation,
      stats
    });
  }

  /**
   * Evolve population for N generations
   */
  async evolve(generations = 10) {
    console.log(`🔬 Evolving for ${generations} generations...`);
    
    for (let i = 0; i < generations; i++) {
      this.population.evolve(this.options.eliteCount, this.options.mutationRate);
      
      const stats = this.population.getStats();
      this.evolutionHistory.push({
        generation: stats.generation,
        stats,
        timestamp: Date.now()
      });
      
      console.log(`   Gen ${stats.generation}: Avg Fitness ${stats.avgFitness}, Max ${stats.maxFitness}`);
    }
    
    console.log('✓ Evolution complete');
    console.log('');
    
    this.emit('evolution_complete', {
      generations,
      finalStats: this.population.getStats()
    });
  }

  /**
   * Deploy best strategies for trading
   */
  deployTopStrategies(count = 3) {
    console.log(`🚀 Deploying top ${count} strategies...`);
    
    const top = this.population.getTop(count);
    
    for (const strategy of top) {
      const code = strategy.toCode();
      this.activeStrategies.set(strategy.id, {
        dna: strategy,
        code,
        deployed: Date.now()
      });
      
      console.log(`   Deployed: ${strategy.id} (fitness: ${strategy.fitness.toFixed(4)})`);
    }
    
    console.log('');
    
    this.emit('strategies_deployed', {
      count: top.length,
      strategies: top.map(s => s.getSummary())
    });
  }

  /**
   * Update strategy performance
   */
  updateStrategyPerformance(strategyId, trade) {
    const activeStrategy = this.activeStrategies.get(strategyId);
    if (!activeStrategy) return;
    
    activeStrategy.dna.updatePerformance(trade);
    
    // Find in population and update
    const popStrategy = this.population.strategies.find(s => s.id === strategyId);
    if (popStrategy) {
      popStrategy.updatePerformance(trade);
    }
  }

  /**
   * Get best strategy
   */
  getBestStrategy() {
    return this.population.bestEver;
  }

  /**
   * Get active strategies
   */
  getActiveStrategies() {
    return Array.from(this.activeStrategies.values()).map(s => ({
      id: s.dna.id,
      summary: s.dna.getSummary(),
      deployed: s.deployed
    }));
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      population: this.population.getStats(),
      activeStrategies: this.activeStrategies.size,
      evolutionHistory: this.evolutionHistory.length,
      bestEver: this.population.bestEver ? this.population.bestEver.getSummary() : null
    };
  }

  /**
   * Print report
   */
  printReport() {
    const status = this.getStatus();
    
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ 🔬 STRATEGY GENERATOR STATUS            │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Generation: ${status.population.generation.toString().padEnd(28)} │`);
    console.log(`│ Population: ${status.population.size.toString().padEnd(28)} │`);
    console.log(`│ Active Strategies: ${status.activeStrategies.toString().padEnd(19)} │`);
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Avg Fitness: ${status.population.avgFitness.padEnd(27)} │`);
    console.log(`│ Max Fitness: ${status.population.maxFitness.padEnd(27)} │`);
    
    if (status.bestEver) {
      console.log('├─────────────────────────────────────────┤');
      console.log('│ BEST EVER                               │');
      console.log(`│   Fitness: ${status.bestEver.fitness.padEnd(30)} │`);
      console.log(`│   Win Rate: ${status.bestEver.winRate.padEnd(29)} │`);
      console.log(`│   Total PnL: $${status.bestEver.totalPnL.padEnd(27)} │`);
    }
    
    console.log('└─────────────────────────────────────────┘');
    console.log('');
  }
}

export default StrategyGenerator;
