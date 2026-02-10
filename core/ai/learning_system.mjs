#!/usr/bin/env node
// core/ai/learning_system.mjs
// EPOCH-09: Learning System - Reinforcement Learning & Adaptation
// The system that learns from every trade and continuously improves

import { EventEmitter } from 'events';

/**
 * Experience Replay Buffer
 * Stores past experiences for learning
 */
export class ExperienceBuffer {
  constructor(maxSize = 10000) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.stats = {
      added: 0,
      sampled: 0
    };
  }

  /**
   * Add experience to buffer
   */
  add(experience) {
    this.buffer.push({
      ...experience,
      timestamp: Date.now()
    });
    
    // Keep only last N experiences
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
    
    this.stats.added++;
  }

  /**
   * Sample random batch for training
   */
  sample(batchSize = 32) {
    if (this.buffer.length < batchSize) {
      return this.buffer.slice();
    }
    
    const batch = [];
    const indices = new Set();
    
    while (batch.length < batchSize) {
      const idx = Math.floor(Math.random() * this.buffer.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        batch.push(this.buffer[idx]);
      }
    }
    
    this.stats.sampled += batch.length;
    
    return batch;
  }

  /**
   * Get recent experiences
   */
  getRecent(count = 100) {
    return this.buffer.slice(-count);
  }

  /**
   * Clear buffer
   */
  clear() {
    this.buffer = [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.buffer.length,
      maxSize: this.maxSize,
      utilization: (this.buffer.length / this.maxSize * 100).toFixed(1) + '%'
    };
  }
}

/**
 * Q-Learning Agent
 * Learns optimal actions using Q-learning algorithm
 */
export class QLearningAgent {
  constructor(options = {}) {
    this.options = {
      learningRate: options.learningRate || 0.1,
      discountFactor: options.discountFactor || 0.95,
      epsilon: options.epsilon || 0.1, // Exploration rate
      epsilonDecay: options.epsilonDecay || 0.995,
      epsilonMin: options.epsilonMin || 0.01
    };
    
    // Q-table: state -> action -> Q-value
    this.qTable = new Map();
    
    // Statistics
    this.stats = {
      updates: 0,
      explorations: 0,
      exploitations: 0
    };
  }

  /**
   * Get Q-value for state-action pair
   */
  getQValue(state, action) {
    const stateKey = this._stateToKey(state);
    
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    
    const actionValues = this.qTable.get(stateKey);
    
    if (!actionValues.has(action)) {
      actionValues.set(action, 0); // Initialize to 0
    }
    
    return actionValues.get(action);
  }

  /**
   * Update Q-value using Q-learning update rule
   */
  updateQValue(state, action, reward, nextState) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = this._getMaxQValue(nextState);
    
    // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
    const newQ = currentQ + this.options.learningRate * 
                 (reward + this.options.discountFactor * maxNextQ - currentQ);
    
    // Store updated Q-value
    const stateKey = this._stateToKey(state);
    this.qTable.get(stateKey).set(action, newQ);
    
    this.stats.updates++;
  }

  /**
   * Choose action (epsilon-greedy)
   */
  chooseAction(state, availableActions) {
    // Exploration vs Exploitation
    if (Math.random() < this.options.epsilon) {
      // Explore: random action
      this.stats.explorations++;
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // Exploit: best known action
      this.stats.exploitations++;
      return this._getBestAction(state, availableActions);
    }
  }

  /**
   * Get best action for state
   * @private
   */
  _getBestAction(state, availableActions) {
    let bestAction = availableActions[0];
    let bestQ = this.getQValue(state, bestAction);
    
    for (const action of availableActions) {
      const q = this.getQValue(state, action);
      if (q > bestQ) {
        bestQ = q;
        bestAction = action;
      }
    }
    
    return bestAction;
  }

  /**
   * Get maximum Q-value for state
   * @private
   */
  _getMaxQValue(state) {
    const stateKey = this._stateToKey(state);
    
    if (!this.qTable.has(stateKey)) {
      return 0;
    }
    
    const actionValues = this.qTable.get(stateKey);
    if (actionValues.size === 0) {
      return 0;
    }
    
    return Math.max(...actionValues.values());
  }

  /**
   * Convert state to string key
   * @private
   */
  _stateToKey(state) {
    // Simple hash: round numerical values and concatenate
    const features = [];
    
    if (state.market_trend) features.push(state.market_trend);
    if (state.volatility) features.push(Math.round(state.volatility * 10));
    if (state.position !== undefined) features.push(state.position);
    
    return features.join('_');
  }

  /**
   * Decay epsilon (reduce exploration over time)
   */
  decayEpsilon() {
    this.options.epsilon = Math.max(
      this.options.epsilonMin,
      this.options.epsilon * this.options.epsilonDecay
    );
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      qTableSize: this.qTable.size,
      epsilon: this.options.epsilon.toFixed(4),
      explorationRate: this.options.epsilon * 100 + '%'
    };
  }
}

/**
 * Policy Network
 * Neural network approximation for complex state spaces
 */
export class PolicyNetwork {
  constructor(options = {}) {
    this.options = {
      inputSize: options.inputSize || 10,
      hiddenSize: options.hiddenSize || 64,
      outputSize: options.outputSize || 5,
      learningRate: options.learningRate || 0.001
    };
    
    // Weights (simplified neural network)
    this.weights = {
      input_hidden: this._initializeWeights(this.options.inputSize, this.options.hiddenSize),
      hidden_output: this._initializeWeights(this.options.hiddenSize, this.options.outputSize)
    };
    
    this.stats = {
      forwardPasses: 0,
      updates: 0
    };
  }

  /**
   * Initialize weights with Xavier initialization
   * @private
   */
  _initializeWeights(inputSize, outputSize) {
    const scale = Math.sqrt(2 / (inputSize + outputSize));
    const weights = [];
    
    for (let i = 0; i < outputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < inputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    
    return weights;
  }

  /**
   * Forward pass
   */
  forward(state) {
    this.stats.forwardPasses++;
    
    // Convert state to input vector
    const input = this._stateToVector(state);
    
    // Input to hidden
    const hidden = this._matmul(input, this.weights.input_hidden);
    const hiddenActivation = hidden.map(x => Math.max(0, x)); // ReLU
    
    // Hidden to output
    const output = this._matmul(hiddenActivation, this.weights.hidden_output);
    const outputActivation = this._softmax(output); // Softmax for probabilities
    
    return {
      probabilities: outputActivation,
      hidden: hiddenActivation
    };
  }

  /**
   * Sample action from policy
   */
  sampleAction(state, availableActions) {
    const { probabilities } = this.forward(state);
    
    // Sample from probability distribution
    const rand = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (rand < cumulative && i < availableActions.length) {
        return availableActions[i];
      }
    }
    
    // Fallback
    return availableActions[0];
  }

  /**
   * Matrix multiplication helper
   * @private
   */
  _matmul(vector, matrix) {
    const result = new Array(matrix.length).fill(0);
    
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < vector.length; j++) {
        result[i] += vector[j] * matrix[i][j];
      }
    }
    
    return result;
  }

  /**
   * Softmax activation
   * @private
   */
  _softmax(vector) {
    const max = Math.max(...vector);
    const exps = vector.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }

  /**
   * Convert state to vector
   * @private
   */
  _stateToVector(state) {
    const vector = new Array(this.options.inputSize).fill(0);
    
    // Extract features
    let idx = 0;
    if (state.price !== undefined) vector[idx++] = state.price / 100000; // Normalize
    if (state.volume !== undefined) vector[idx++] = state.volume / 1000;
    if (state.volatility !== undefined) vector[idx++] = state.volatility;
    if (state.trend !== undefined) vector[idx++] = state.trend;
    if (state.position !== undefined) vector[idx++] = state.position;
    if (state.pnl !== undefined) vector[idx++] = state.pnl / 1000;
    
    return vector;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      inputSize: this.options.inputSize,
      hiddenSize: this.options.hiddenSize,
      outputSize: this.options.outputSize
    };
  }
}

/**
 * Adaptive Learning System
 * Main learning system integrating multiple learning approaches
 */
export class LearningSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = options;
    
    // Learning components
    this.experienceBuffer = new ExperienceBuffer(options.bufferSize || 10000);
    this.qLearning = new QLearningAgent({
      learningRate: options.learningRate || 0.1,
      epsilon: options.epsilon || 0.1
    });
    this.policyNetwork = new PolicyNetwork({
      inputSize: options.inputSize || 10,
      outputSize: options.outputSize || 5
    });
    
    // Learning state
    this.learningMode = options.learningMode || 'Q_LEARNING'; // 'Q_LEARNING' | 'POLICY' | 'HYBRID'
    this.episodeCount = 0;
    this.totalReward = 0;
    
    // Performance tracking
    this.performance = {
      recentRewards: [],
      recentWinRate: [],
      avgReward: 0,
      avgWinRate: 0
    };
    
    console.log('📚 Learning System initialized');
    console.log(`   Mode: ${this.learningMode}`);
    console.log(`   Learning Rate: ${options.learningRate || 0.1}`);
  }

  /**
   * Record experience
   */
  recordExperience(state, action, reward, nextState, done = false) {
    this.experienceBuffer.add({
      state,
      action,
      reward,
      nextState,
      done
    });
    
    this.totalReward += reward;
    
    this.emit('experience', {
      state,
      action,
      reward,
      timestamp: Date.now()
    });
  }

  /**
   * Learn from experiences (training step)
   */
  async train(batchSize = 32) {
    if (this.experienceBuffer.buffer.length < batchSize) {
      return { trained: false, reason: 'Insufficient experiences' };
    }
    
    console.log('📚 Learning System: Training...');
    
    const batch = this.experienceBuffer.sample(batchSize);
    let updates = 0;
    
    for (const experience of batch) {
      if (this.learningMode === 'Q_LEARNING' || this.learningMode === 'HYBRID') {
        // Update Q-values
        this.qLearning.updateQValue(
          experience.state,
          experience.action,
          experience.reward,
          experience.nextState
        );
        updates++;
      }
      
      // TODO: Policy network training (gradient descent)
      // Would require proper backpropagation implementation
    }
    
    // Decay exploration rate
    this.qLearning.decayEpsilon();
    
    // Update performance metrics
    this._updatePerformanceMetrics(batch);
    
    console.log(`   Updated: ${updates} Q-values`);
    console.log(`   Epsilon: ${this.qLearning.options.epsilon.toFixed(4)}`);
    
    this.emit('trained', {
      batchSize: batch.length,
      updates,
      epsilon: this.qLearning.options.epsilon
    });
    
    return {
      trained: true,
      batchSize: batch.length,
      updates
    };
  }

  /**
   * Choose action using learned policy
   */
  chooseAction(state, availableActions) {
    if (this.learningMode === 'Q_LEARNING') {
      return this.qLearning.chooseAction(state, availableActions);
    } else if (this.learningMode === 'POLICY') {
      return this.policyNetwork.sampleAction(state, availableActions);
    } else {
      // HYBRID: Use both and blend
      const qAction = this.qLearning.chooseAction(state, availableActions);
      const policyAction = this.policyNetwork.sampleAction(state, availableActions);
      
      // Prefer Q-learning action with 70% probability
      return Math.random() < 0.7 ? qAction : policyAction;
    }
  }

  /**
   * Update performance metrics
   * @private
   */
  _updatePerformanceMetrics(batch) {
    // Calculate avg reward for this batch
    const avgReward = batch.reduce((sum, exp) => sum + exp.reward, 0) / batch.length;
    
    // Calculate win rate
    const wins = batch.filter(exp => exp.reward > 0).length;
    const winRate = wins / batch.length;
    
    // Store recent performance
    this.performance.recentRewards.push(avgReward);
    this.performance.recentWinRate.push(winRate);
    
    // Keep only last 100
    if (this.performance.recentRewards.length > 100) {
      this.performance.recentRewards.shift();
      this.performance.recentWinRate.shift();
    }
    
    // Update averages
    this.performance.avgReward = this.performance.recentRewards.reduce((a, b) => a + b, 0) / 
                                  this.performance.recentRewards.length;
    this.performance.avgWinRate = this.performance.recentWinRate.reduce((a, b) => a + b, 0) / 
                                   this.performance.recentWinRate.length;
  }

  /**
   * Start new episode
   */
  startEpisode() {
    this.episodeCount++;
    this.emit('episode_start', {
      episode: this.episodeCount,
      timestamp: Date.now()
    });
  }

  /**
   * End episode
   */
  endEpisode(totalReward) {
    this.emit('episode_end', {
      episode: this.episodeCount,
      totalReward,
      timestamp: Date.now()
    });
  }

  /**
   * Get learning status
   */
  getStatus() {
    return {
      learningMode: this.learningMode,
      episodeCount: this.episodeCount,
      totalReward: this.totalReward,
      performance: {
        avgReward: this.performance.avgReward.toFixed(4),
        avgWinRate: (this.performance.avgWinRate * 100).toFixed(1) + '%'
      },
      experienceBuffer: this.experienceBuffer.getStats(),
      qLearning: this.qLearning.getStats(),
      policyNetwork: this.policyNetwork.getStats()
    };
  }

  /**
   * Print learning report
   */
  printReport() {
    const status = this.getStatus();
    
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ 📚 LEARNING SYSTEM STATUS               │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Mode: ${status.learningMode.padEnd(32)} │`);
    console.log(`│ Episodes: ${status.episodeCount.toString().padEnd(30)} │`);
    console.log(`│ Total Reward: ${status.totalReward.toFixed(2).padEnd(26)} │`);
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Avg Reward: ${status.performance.avgReward.padEnd(28)} │`);
    console.log(`│ Avg Win Rate: ${status.performance.avgWinRate.padEnd(26)} │`);
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Experience Buffer: ${status.experienceBuffer.size}/${status.experienceBuffer.maxSize}${' '.repeat(12)} │`);
    console.log(`│ Q-Table Size: ${status.qLearning.qTableSize.toString().padEnd(24)} │`);
    console.log(`│ Exploration Rate: ${status.qLearning.explorationRate.padEnd(20)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');
  }
}

export default LearningSystem;
