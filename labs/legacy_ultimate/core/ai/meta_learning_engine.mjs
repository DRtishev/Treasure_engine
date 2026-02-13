/**
 * META-LEARNING ENGINE (EPOCH-10)
 * 
 * Revolutionary AI component that learns HOW to learn.
 * Implements:
 * - Few-shot learning (learns from minimal examples)
 * - Transfer learning (applies knowledge across domains)
 * - Learning rate adaptation (optimizes learning speed)
 * - Meta-parameters optimization (tunes hyperparameters)
 * 
 * This is the "learning to learn" system - true meta-intelligence.
 */

export class MetaLearningEngine {
  constructor(config = {}) {
    // Meta-learning configuration
    this.config = {
      initialMetaLearningRate: config.initialMetaLearningRate || 0.001,
      adaptationRate: config.adaptationRate || 0.1,
      minExamplesForTransfer: config.minExamplesForTransfer || 5,
      transferThreshold: config.transferThreshold || 0.7,
      ...config
    };

    // Meta-knowledge base: stores patterns across different learning tasks
    this.metaKnowledge = {
      taskPatterns: new Map(),           // Task type → learning patterns
      successfulStrategies: new Map(),   // Context → successful approaches
      learningCurves: [],                // Historical learning performance
      transferMatrix: new Map()          // Source task → target task effectiveness
    };

    // Current meta-parameters being optimized
    this.metaParameters = {
      learningRate: this.config.initialMetaLearningRate,
      explorationRate: 0.1,
      memoryRetention: 0.9,
      adaptationSpeed: 0.1
    };

    // Performance tracking for meta-optimization
    this.performanceHistory = [];
    this.lastOptimization = Date.now();
  }

  /**
   * FEW-SHOT LEARNING
   * Learn from minimal examples by leveraging meta-knowledge
   */
  fewShotLearn(examples, taskType) {
    if (examples.length < 1) {
      return { success: false, reason: 'No examples provided' };
    }

    // Extract patterns from few examples
    const patterns = this._extractPatterns(examples);

    // Check if we have meta-knowledge about similar tasks
    const similarTasks = this._findSimilarTasks(taskType);
    
    // Apply meta-knowledge to bootstrap learning
    const priorKnowledge = this._aggregateMetaKnowledge(similarTasks);

    // Combine few examples with meta-knowledge
    const learnedModel = this._synthesizeModel(patterns, priorKnowledge);

    // Store this learning experience for future meta-learning
    this._updateMetaKnowledge(taskType, patterns, learnedModel);

    return {
      success: true,
      model: learnedModel,
      confidence: this._calculateConfidence(examples.length, similarTasks.length),
      metaKnowledgeUsed: similarTasks.length > 0
    };
  }

  /**
   * TRANSFER LEARNING
   * Apply knowledge from one domain to another
   */
  transferLearn(sourceTask, targetTask, targetExamples = []) {
    // Check if transfer is viable
    const transferability = this._assessTransferability(sourceTask, targetTask);

    if (transferability < this.config.transferThreshold) {
      return {
        success: false,
        reason: `Transfer score ${transferability.toFixed(2)} below threshold ${this.config.transferThreshold}`
      };
    }

    // Get knowledge from source task
    const sourceKnowledge = this.metaKnowledge.taskPatterns.get(sourceTask);
    
    if (!sourceKnowledge) {
      return { success: false, reason: 'No knowledge about source task' };
    }

    // Adapt source knowledge to target task
    const adaptedKnowledge = this._adaptKnowledge(
      sourceKnowledge,
      targetTask,
      targetExamples
    );

    // Store transfer learning result
    this._recordTransfer(sourceTask, targetTask, transferability);

    return {
      success: true,
      adaptedKnowledge,
      transferability,
      sourceTask,
      targetTask
    };
  }

  /**
   * ADAPTIVE LEARNING RATE
   * Dynamically adjusts learning rate based on performance
   */
  adaptLearningRate(recentPerformance) {
    // Calculate performance gradient
    const gradient = this._calculatePerformanceGradient(recentPerformance);

    // Adjust learning rate based on gradient
    if (gradient > 0) {
      // Improving: can afford to learn faster
      this.metaParameters.learningRate *= (1 + this.config.adaptationRate);
    } else if (gradient < -0.1) {
      // Deteriorating: slow down learning
      this.metaParameters.learningRate *= (1 - this.config.adaptationRate);
    }

    // Clamp learning rate
    this.metaParameters.learningRate = Math.max(
      0.0001,
      Math.min(0.1, this.metaParameters.learningRate)
    );

    return {
      newLearningRate: this.metaParameters.learningRate,
      gradient,
      adjustment: gradient > 0 ? 'increase' : gradient < -0.1 ? 'decrease' : 'stable'
    };
  }

  /**
   * META-PARAMETER OPTIMIZATION
   * Optimizes hyperparameters using meta-learning
   */
  optimizeMetaParameters(performanceMetrics) {
    // Record current performance
    this.performanceHistory.push({
      timestamp: Date.now(),
      metrics: performanceMetrics,
      parameters: { ...this.metaParameters }
    });

    // Keep last 100 performance records
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    // Only optimize every N minutes
    const timeSinceLastOptimization = Date.now() - this.lastOptimization;
    if (timeSinceLastOptimization < 5 * 60 * 1000) {
      return { optimized: false, reason: 'Too soon since last optimization' };
    }

    // Find best performing parameter configuration
    const bestConfig = this._findBestParameterConfiguration();

    if (bestConfig) {
      // Move towards best configuration
      this._updateMetaParameters(bestConfig);
      this.lastOptimization = Date.now();

      return {
        optimized: true,
        newParameters: { ...this.metaParameters },
        improvement: this._calculateImprovement(bestConfig)
      };
    }

    return { optimized: false, reason: 'No better configuration found' };
  }

  /**
   * LEARNING CURVE ANALYSIS
   * Analyzes how the agent learns over time
   */
  analyzeLearningCurve(recentExperiences) {
    if (recentExperiences.length < 10) {
      return { analysis: 'insufficient_data', samples: recentExperiences.length };
    }

    // Calculate learning velocity (rate of improvement)
    const velocity = this._calculateLearningVelocity(recentExperiences);

    // Detect learning phase
    const phase = this._detectLearningPhase(velocity);

    // Predict future performance
    const prediction = this._predictPerformance(recentExperiences);

    // Store learning curve data
    this.metaKnowledge.learningCurves.push({
      timestamp: Date.now(),
      velocity,
      phase,
      prediction,
      samples: recentExperiences.length
    });

    return {
      analysis: 'complete',
      velocity,
      phase, // 'rapid_learning', 'plateau', 'declining', 'stable'
      prediction,
      recommendation: this._generateLearningRecommendation(phase)
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  _extractPatterns(examples) {
    // Extract common patterns from examples
    const patterns = {
      features: new Map(),
      outcomes: new Map(),
      correlations: []
    };

    for (const example of examples) {
      // Extract features
      for (const [key, value] of Object.entries(example.input || {})) {
        if (!patterns.features.has(key)) {
          patterns.features.set(key, []);
        }
        patterns.features.get(key).push(value);
      }

      // Record outcomes
      const outcome = example.output || example.reward;
      if (!patterns.outcomes.has(outcome)) {
        patterns.outcomes.set(outcome, 0);
      }
      patterns.outcomes.set(outcome, patterns.outcomes.get(outcome) + 1);
    }

    return patterns;
  }

  _findSimilarTasks(taskType) {
    const similar = [];

    for (const [existingTask, knowledge] of this.metaKnowledge.taskPatterns) {
      const similarity = this._calculateTaskSimilarity(taskType, existingTask);
      if (similarity > 0.5) {
        similar.push({ task: existingTask, similarity, knowledge });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  _calculateTaskSimilarity(task1, task2) {
    // Simple string similarity for now (can be enhanced)
    const words1 = task1.toLowerCase().split(/\W+/);
    const words2 = task2.toLowerCase().split(/\W+/);
    
    const common = words1.filter(w => words2.includes(w)).length;
    const total = new Set([...words1, ...words2]).size;
    
    return common / total;
  }

  _aggregateMetaKnowledge(similarTasks) {
    if (similarTasks.length === 0) {
      return null;
    }

    // Weighted aggregation of knowledge from similar tasks
    const aggregated = {
      patterns: new Map(),
      strategies: [],
      confidence: 0
    };

    let totalWeight = 0;
    for (const { similarity, knowledge } of similarTasks) {
      totalWeight += similarity;
      
      // Aggregate patterns
      if (knowledge.patterns) {
        for (const [key, value] of knowledge.patterns.entries()) {
          if (!aggregated.patterns.has(key)) {
            aggregated.patterns.set(key, { values: [], weight: 0 });
          }
          aggregated.patterns.get(key).values.push(value);
          aggregated.patterns.get(key).weight += similarity;
        }
      }

      // Collect strategies
      if (knowledge.strategies) {
        aggregated.strategies.push(...knowledge.strategies);
      }
    }

    aggregated.confidence = totalWeight / similarTasks.length;

    return aggregated;
  }

  _synthesizeModel(patterns, priorKnowledge) {
    // Combine patterns from few examples with meta-knowledge
    const model = {
      patterns,
      priorKnowledge: priorKnowledge || {},
      confidence: priorKnowledge ? 0.7 : 0.3,
      createdAt: Date.now()
    };

    return model;
  }

  _calculateConfidence(exampleCount, similarTaskCount) {
    // Calculate confidence based on examples and meta-knowledge
    let confidence = Math.min(exampleCount / 10, 0.5); // Max 0.5 from examples
    
    // Add confidence from similar tasks
    if (similarTaskCount > 0) {
      confidence += Math.min(similarTaskCount / 10, 0.3); // Max 0.3 from meta-knowledge
    }
    
    return Math.min(confidence, 0.9); // Cap at 0.9
  }

  _updateMetaKnowledge(taskType, patterns, model) {
    this.metaKnowledge.taskPatterns.set(taskType, {
      patterns,
      model,
      updatedAt: Date.now()
    });
  }

  _assessTransferability(sourceTask, targetTask) {
    // Check transfer matrix for historical data
    const key = `${sourceTask}->${targetTask}`;
    
    if (this.metaKnowledge.transferMatrix.has(key)) {
      return this.metaKnowledge.transferMatrix.get(key);
    }

    // Calculate based on task similarity
    return this._calculateTaskSimilarity(sourceTask, targetTask);
  }

  _adaptKnowledge(sourceKnowledge, targetTask, targetExamples) {
    // Adapt source knowledge to target context
    const adapted = {
      source: sourceKnowledge,
      adaptations: [],
      confidence: 0.6
    };

    // If we have target examples, use them to fine-tune
    if (targetExamples.length > 0) {
      const targetPatterns = this._extractPatterns(targetExamples);
      adapted.targetPatterns = targetPatterns;
      adapted.confidence = 0.8;
    }

    return adapted;
  }

  _recordTransfer(sourceTask, targetTask, effectiveness) {
    const key = `${sourceTask}->${targetTask}`;
    this.metaKnowledge.transferMatrix.set(key, effectiveness);
  }

  _calculatePerformanceGradient(recentPerformance) {
    if (recentPerformance.length < 2) return 0;

    // Simple linear gradient
    const recent = recentPerformance.slice(-10);
    let sum = 0;
    for (let i = 1; i < recent.length; i++) {
      sum += recent[i] - recent[i - 1];
    }

    return sum / (recent.length - 1);
  }

  _findBestParameterConfiguration() {
    if (this.performanceHistory.length < 10) return null;

    // Find configuration with best average performance
    let best = null;
    let bestScore = -Infinity;

    for (const record of this.performanceHistory) {
      const score = record.metrics.reward || record.metrics.pnl || 0;
      if (score > bestScore) {
        bestScore = score;
        best = record.parameters;
      }
    }

    return best;
  }

  _updateMetaParameters(targetConfig) {
    // Gradually move towards target configuration
    const alpha = 0.1; // Smoothing factor

    for (const key of Object.keys(this.metaParameters)) {
      if (targetConfig[key] !== undefined) {
        this.metaParameters[key] = 
          alpha * targetConfig[key] + (1 - alpha) * this.metaParameters[key];
      }
    }
  }

  _calculateImprovement(bestConfig) {
    // Calculate expected improvement from adopting best config
    return 0.05; // 5% improvement (placeholder)
  }

  _calculateLearningVelocity(experiences) {
    if (experiences.length < 2) return 0;

    // Calculate rate of change in performance
    const values = experiences.map(e => e.reward || e.pnl || 0);
    
    let velocity = 0;
    for (let i = 1; i < values.length; i++) {
      velocity += (values[i] - values[i - 1]);
    }

    return velocity / (values.length - 1);
  }

  _detectLearningPhase(velocity) {
    if (velocity > 0.5) return 'rapid_learning';
    if (velocity > 0.1) return 'stable_learning';
    if (velocity > -0.1) return 'plateau';
    return 'declining';
  }

  _predictPerformance(experiences) {
    // Simple linear extrapolation
    const recent = experiences.slice(-5);
    if (recent.length < 2) return { prediction: 0, confidence: 0 };

    const velocity = this._calculateLearningVelocity(recent);
    const lastValue = recent[recent.length - 1].reward || 0;

    return {
      prediction: lastValue + velocity * 5, // Predict 5 steps ahead
      confidence: 0.6,
      horizon: 5
    };
  }

  _generateLearningRecommendation(phase) {
    const recommendations = {
      'rapid_learning': 'Continue current approach, learning is accelerating',
      'stable_learning': 'Maintain current strategy, steady progress',
      'plateau': 'Consider increasing exploration or trying new strategies',
      'declining': 'ALERT: Performance declining, recommend strategy reset'
    };

    return recommendations[phase] || 'Monitor closely';
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getMetaKnowledge() {
    return {
      tasksLearned: this.metaKnowledge.taskPatterns.size,
      successfulStrategies: this.metaKnowledge.successfulStrategies.size,
      transfersRecorded: this.metaKnowledge.transferMatrix.size,
      learningCurves: this.metaKnowledge.learningCurves.length,
      currentParameters: { ...this.metaParameters }
    };
  }

  getStatus() {
    return {
      metaLearningRate: this.metaParameters.learningRate,
      tasksLearned: this.metaKnowledge.taskPatterns.size,
      performanceHistory: this.performanceHistory.length,
      lastOptimization: new Date(this.lastOptimization).toISOString()
    };
  }
}
