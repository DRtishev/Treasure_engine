/**
 * SELF-REFLECTION SYSTEM (EPOCH-10)
 * 
 * Revolutionary AI component that analyzes its own decisions and learns from mistakes.
 * Implements true metacognition - thinking about thinking.
 * 
 * Capabilities:
 * - Decision post-mortem analysis
 * - Mistake pattern recognition
 * - Success factor identification
 * - Confidence calibration
 * - Bias detection and correction
 * 
 * This enables the AI to become self-aware of its decision-making process.
 */

export class SelfReflectionSystem {
  constructor(config = {}) {
    this.config = {
      reflectionDepth: config.reflectionDepth || 3,
      minReflectionInterval: config.minReflectionInterval || 10, // decisions
      confidenceCalibrationWindow: config.confidenceCalibrationWindow || 50,
      ...config
    };

    // Decision history for reflection
    this.decisionHistory = [];

    // Reflection insights
    this.insights = {
      mistakes: [],           // Analyzed mistakes
      successes: [],          // Analyzed successes
      patterns: new Map(),    // Recurring patterns
      biases: new Map(),      // Detected biases
      calibration: {          // Confidence vs actual performance
        overconfident: 0,
        underconfident: 0,
        calibrated: 0
      }
    };

    // Meta-awareness state
    this.awareness = {
      confidenceLevel: 0.5,
      knownLimitations: [],
      strengthAreas: [],
      improvementAreas: []
    };

    this.lastReflection = Date.now();
    this.reflectionCount = 0;
  }

  /**
   * RECORD DECISION
   * Stores a decision for future reflection
   */
  recordDecision(decision) {
    const record = {
      id: this._generateId(),
      timestamp: Date.now(),
      decision: { ...decision },
      context: decision.context || {},
      confidence: decision.confidence || 0.5,
      reasoning: decision.reasoning || [],
      outcome: null, // To be filled later
      reflection: null // To be filled after reflection
    };

    this.decisionHistory.push(record);

    // Keep last 1000 decisions
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory.shift();
    }

    return record.id;
  }

  /**
   * RECORD OUTCOME
   * Records the actual outcome of a decision
   */
  recordOutcome(decisionId, outcome) {
    const record = this.decisionHistory.find(r => r.id === decisionId);
    
    if (!record) {
      return { success: false, reason: 'Decision not found' };
    }

    record.outcome = {
      ...outcome,
      recordedAt: Date.now()
    };

    // Trigger reflection if conditions met
    this._maybeReflect();

    return { success: true, decisionId };
  }

  /**
   * DEEP REFLECTION
   * Analyzes recent decisions to extract insights
   */
  async reflect(forceful = false) {
    const timeSinceLastReflection = Date.now() - this.lastReflection;
    const decisionsSinceReflection = this.decisionHistory.filter(
      d => d.timestamp > this.lastReflection
    ).length;

    // Check if reflection is needed
    if (!forceful && decisionsSinceReflection < this.config.minReflectionInterval) {
      return { 
        reflected: false, 
        reason: `Only ${decisionsSinceReflection} decisions since last reflection` 
      };
    }

    this.reflectionCount++;
    this.lastReflection = Date.now();

    // Analyze decisions with outcomes
    const completedDecisions = this.decisionHistory.filter(d => d.outcome !== null);
    
    if (completedDecisions.length === 0) {
      return { reflected: false, reason: 'No completed decisions to reflect on' };
    }

    // Perform multi-level reflection
    const reflectionResults = {
      level1: this._reflectOnMistakes(completedDecisions),
      level2: this._reflectOnSuccesses(completedDecisions),
      level3: this._reflectOnPatterns(completedDecisions),
      level4: this._reflectOnBiases(completedDecisions),
      level5: this._calibrateConfidence(completedDecisions)
    };

    // Update meta-awareness
    this._updateAwareness(reflectionResults);

    // Generate insights
    const insights = this._synthesizeInsights(reflectionResults);

    return {
      reflected: true,
      reflectionCount: this.reflectionCount,
      decisionsAnalyzed: completedDecisions.length,
      insights,
      awareness: { ...this.awareness },
      recommendations: this._generateRecommendations(insights)
    };
  }

  /**
   * COUNTERFACTUAL REASONING
   * "What if I had made a different decision?"
   */
  counterfactualAnalysis(decisionId, alternativeAction) {
    const record = this.decisionHistory.find(r => r.id === decisionId);
    
    if (!record || !record.outcome) {
      return { success: false, reason: 'Decision not found or no outcome' };
    }

    // Simulate what would have happened with alternative action
    const actualOutcome = record.outcome;
    const hypotheticalOutcome = this._simulateAlternativeOutcome(
      record.context,
      alternativeAction
    );

    // Compare outcomes
    const comparison = {
      actualAction: record.decision.action,
      actualOutcome: actualOutcome.result,
      actualPnL: actualOutcome.pnl || 0,
      alternativeAction,
      hypotheticalOutcome: hypotheticalOutcome.result,
      hypotheticalPnL: hypotheticalOutcome.pnl || 0,
      better: hypotheticalOutcome.pnl > actualOutcome.pnl
    };

    // Learn from counterfactual
    if (comparison.better) {
      this.insights.mistakes.push({
        decisionId,
        type: 'suboptimal_action',
        actualAction: comparison.actualAction,
        betterAction: alternativeAction,
        missedGain: hypotheticalOutcome.pnl - actualOutcome.pnl,
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      comparison,
      learning: comparison.better ? 'Alternative would have been better' : 'Decision was optimal'
    };
  }

  /**
   * EXPLAIN DECISION
   * Provides detailed explanation of why a decision was made
   */
  explainDecision(decisionId) {
    const record = this.decisionHistory.find(r => r.id === decisionId);
    
    if (!record) {
      return { success: false, reason: 'Decision not found' };
    }

    // Build comprehensive explanation
    const explanation = {
      decision: record.decision.action,
      confidence: record.confidence,
      reasoning: record.reasoning || [],
      context: this._summarizeContext(record.context),
      factors: this._identifyDecisionFactors(record),
      alternatives: this._identifyAlternatives(record),
      outcome: record.outcome ? {
        result: record.outcome.result,
        pnl: record.outcome.pnl,
        retrospective: this._retrospectiveAnalysis(record)
      } : null
    };

    return {
      success: true,
      explanation
    };
  }

  // ============================================
  // PRIVATE REFLECTION METHODS
  // ============================================

  _maybeReflect() {
    const decisionsWithOutcomes = this.decisionHistory.filter(d => d.outcome !== null);
    
    if (decisionsWithOutcomes.length >= this.config.minReflectionInterval) {
      // Trigger automatic reflection
      this.reflect(false).then(result => {
        if (result.reflected) {
          console.log('🧠 Self-Reflection completed:', result.insights);
        }
      });
    }
  }

  _reflectOnMistakes(decisions) {
    // Identify mistakes (negative outcomes)
    const mistakes = decisions.filter(d => {
      const outcome = d.outcome.result === 'LOSS' || d.outcome.pnl < 0;
      return outcome;
    });

    if (mistakes.length === 0) {
      return { mistakes: 0, insights: [] };
    }

    // Analyze common factors in mistakes
    const insights = [];

    // High confidence mistakes (overconfident)
    const overconfidentMistakes = mistakes.filter(m => m.confidence > 0.8);
    if (overconfidentMistakes.length > mistakes.length * 0.3) {
      insights.push({
        type: 'overconfidence',
        severity: 'high',
        evidence: `${overconfidentMistakes.length}/${mistakes.length} mistakes had high confidence`,
        recommendation: 'Reduce confidence threshold or improve decision criteria'
      });
    }

    // Contextual patterns in mistakes
    const contextPatterns = this._findContextPatterns(mistakes);
    if (contextPatterns.length > 0) {
      insights.push({
        type: 'context_pattern',
        patterns: contextPatterns,
        recommendation: 'Avoid these contexts or add safety checks'
      });
    }

    return {
      mistakes: mistakes.length,
      rate: mistakes.length / decisions.length,
      insights
    };
  }

  _reflectOnSuccesses(decisions) {
    // Identify successes (positive outcomes)
    const successes = decisions.filter(d => {
      const outcome = d.outcome.result === 'WIN' || d.outcome.pnl > 0;
      return outcome;
    });

    if (successes.length === 0) {
      return { successes: 0, insights: [] };
    }

    // Analyze what made these decisions successful
    const insights = [];

    // Common factors in successes
    const successFactors = this._identifySuccessFactors(successes);
    if (successFactors.length > 0) {
      insights.push({
        type: 'success_factors',
        factors: successFactors,
        recommendation: 'Reinforce these patterns in future decisions'
      });
    }

    // Optimal confidence range
    const avgConfidence = successes.reduce((sum, s) => sum + s.confidence, 0) / successes.length;
    insights.push({
      type: 'optimal_confidence',
      value: avgConfidence,
      recommendation: `Target confidence around ${avgConfidence.toFixed(2)} for better outcomes`
    });

    return {
      successes: successes.length,
      rate: successes.length / decisions.length,
      insights
    };
  }

  _reflectOnPatterns(decisions) {
    // Find recurring decision patterns
    const patterns = new Map();

    for (const decision of decisions) {
      // Extract pattern signature
      const signature = this._extractPatternSignature(decision);
      
      if (!patterns.has(signature)) {
        patterns.set(signature, { count: 0, wins: 0, losses: 0, pnl: 0 });
      }

      const pattern = patterns.get(signature);
      pattern.count++;
      
      if (decision.outcome) {
        if (decision.outcome.result === 'WIN') pattern.wins++;
        if (decision.outcome.result === 'LOSS') pattern.losses++;
        pattern.pnl += decision.outcome.pnl || 0;
      }
    }

    // Identify significant patterns
    const significantPatterns = [];
    for (const [signature, stats] of patterns) {
      if (stats.count >= 3) { // Minimum 3 occurrences
        significantPatterns.push({
          signature,
          ...stats,
          winRate: stats.wins / (stats.wins + stats.losses),
          avgPnL: stats.pnl / stats.count
        });
      }
    }

    // Store patterns for future use
    for (const pattern of significantPatterns) {
      this.insights.patterns.set(pattern.signature, pattern);
    }

    return {
      patternsFound: significantPatterns.length,
      patterns: significantPatterns.sort((a, b) => b.avgPnL - a.avgPnL).slice(0, 5)
    };
  }

  _reflectOnBiases(decisions) {
    // Detect cognitive biases in decision-making
    const biases = [];

    // Recency bias: overweighting recent outcomes
    const recencyBias = this._detectRecencyBias(decisions);
    if (recencyBias.detected) {
      biases.push({
        type: 'recency_bias',
        severity: recencyBias.severity,
        evidence: recencyBias.evidence
      });
    }

    // Confirmation bias: favoring decisions that confirm prior beliefs
    const confirmationBias = this._detectConfirmationBias(decisions);
    if (confirmationBias.detected) {
      biases.push({
        type: 'confirmation_bias',
        severity: confirmationBias.severity,
        evidence: confirmationBias.evidence
      });
    }

    // Loss aversion: being too risk-averse after losses
    const lossAversion = this._detectLossAversion(decisions);
    if (lossAversion.detected) {
      biases.push({
        type: 'loss_aversion',
        severity: lossAversion.severity,
        evidence: lossAversion.evidence
      });
    }

    // Store detected biases
    for (const bias of biases) {
      this.insights.biases.set(bias.type, bias);
    }

    return {
      biasesDetected: biases.length,
      biases
    };
  }

  _calibrateConfidence(decisions) {
    // Analyze how well confidence predicts actual outcomes
    const bins = { overconfident: 0, underconfident: 0, calibrated: 0 };

    for (const decision of decisions) {
      if (!decision.outcome) continue;

      const success = decision.outcome.result === 'WIN' || decision.outcome.pnl > 0;
      const confidence = decision.confidence;

      // Compare confidence to outcome
      if (success && confidence < 0.5) {
        bins.underconfident++;
      } else if (!success && confidence > 0.7) {
        bins.overconfident++;
      } else {
        bins.calibrated++;
      }
    }

    // Update calibration stats
    this.insights.calibration = bins;

    return {
      calibrationScore: bins.calibrated / decisions.length,
      overconfidence: bins.overconfident / decisions.length,
      underconfidence: bins.underconfident / decisions.length,
      recommendation: bins.overconfident > bins.underconfident 
        ? 'Reduce confidence estimates' 
        : bins.underconfident > bins.overconfident 
          ? 'Increase confidence estimates' 
          : 'Confidence well-calibrated'
    };
  }

  _updateAwareness(reflectionResults) {
    // Update self-awareness based on reflection insights

    // Confidence level based on calibration
    if (reflectionResults.level5) {
      this.awareness.confidenceLevel = reflectionResults.level5.calibrationScore;
    }

    // Known limitations from mistakes
    if (reflectionResults.level1 && reflectionResults.level1.insights) {
      this.awareness.knownLimitations = reflectionResults.level1.insights.map(i => i.type);
    }

    // Strength areas from successes
    if (reflectionResults.level2 && reflectionResults.level2.insights) {
      this.awareness.strengthAreas = reflectionResults.level2.insights
        .filter(i => i.type === 'success_factors')
        .flatMap(i => i.factors || []);
    }

    // Improvement areas from biases
    if (reflectionResults.level4 && reflectionResults.level4.biases) {
      this.awareness.improvementAreas = reflectionResults.level4.biases.map(b => b.type);
    }
  }

  _synthesizeInsights(reflectionResults) {
    // Combine all reflection levels into actionable insights
    const insights = {
      summary: '',
      strengths: [],
      weaknesses: [],
      recommendations: []
    };

    // Overall performance
    const winRate = reflectionResults.level2.rate;
    const mistakeRate = reflectionResults.level1.rate;

    insights.summary = `Win rate: ${(winRate * 100).toFixed(1)}%, Mistake rate: ${(mistakeRate * 100).toFixed(1)}%`;

    // Strengths
    if (reflectionResults.level2.insights) {
      insights.strengths = reflectionResults.level2.insights
        .filter(i => i.type === 'success_factors')
        .flatMap(i => i.factors || []);
    }

    // Weaknesses
    if (reflectionResults.level1.insights) {
      insights.weaknesses = reflectionResults.level1.insights.map(i => i.type);
    }
    if (reflectionResults.level4.biases) {
      insights.weaknesses.push(...reflectionResults.level4.biases.map(b => b.type));
    }

    return insights;
  }

  _generateRecommendations(insights) {
    const recommendations = [];

    // Based on weaknesses
    for (const weakness of insights.weaknesses) {
      if (weakness === 'overconfidence') {
        recommendations.push({
          priority: 'HIGH',
          action: 'Reduce confidence threshold from 0.8 to 0.6',
          reason: 'Too many high-confidence mistakes'
        });
      }
      if (weakness === 'recency_bias') {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Increase memory window for decision-making',
          reason: 'Overweighting recent outcomes'
        });
      }
    }

    // Based on strengths
    if (insights.strengths.length > 0) {
      recommendations.push({
        priority: 'LOW',
        action: `Reinforce successful patterns: ${insights.strengths.slice(0, 3).join(', ')}`,
        reason: 'These factors correlate with success'
      });
    }

    return recommendations;
  }

  // Helper methods
  
  _generateId() {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _simulateAlternativeOutcome(context, alternativeAction) {
    // Simplified simulation (can be enhanced with actual simulation)
    return {
      result: Math.random() > 0.5 ? 'WIN' : 'LOSS',
      pnl: (Math.random() - 0.5) * 10
    };
  }

  _summarizeContext(context) {
    return {
      marketState: context.marketState || 'unknown',
      trend: context.trend || 'unknown',
      volatility: context.volatility || 'unknown'
    };
  }

  _identifyDecisionFactors(record) {
    // Extract key factors that influenced the decision
    return record.reasoning || [];
  }

  _identifyAlternatives(record) {
    // Identify alternative actions that were considered
    return ['HOLD', 'ENTER', 'EXIT'].filter(a => a !== record.decision.action);
  }

  _retrospectiveAnalysis(record) {
    // Analyze decision with hindsight
    if (!record.outcome) return 'No outcome recorded';

    const success = record.outcome.result === 'WIN';
    const highConfidence = record.confidence > 0.7;

    if (success && highConfidence) return 'Good decision, high confidence justified';
    if (success && !highConfidence) return 'Lucky outcome, low confidence';
    if (!success && highConfidence) return 'Overconfident, poor decision';
    return 'Appropriate confidence, outcome as expected';
  }

  _findContextPatterns(decisions) {
    // Find common context patterns in given decisions
    const patterns = [];
    
    // Example: high volatility → mistakes
    const highVolMistakes = decisions.filter(d => 
      d.context.volatility === 'high'
    );
    
    if (highVolMistakes.length > decisions.length * 0.5) {
      patterns.push('high_volatility');
    }

    return patterns;
  }

  _identifySuccessFactors(successes) {
    // Identify common factors in successful decisions
    const factors = [];

    // Example patterns
    const avgConfidence = successes.reduce((sum, s) => sum + s.confidence, 0) / successes.length;
    if (avgConfidence > 0.7) {
      factors.push('high_confidence');
    }

    return factors;
  }

  _extractPatternSignature(decision) {
    // Create a signature for pattern matching
    return `${decision.decision.action}_${decision.context.trend || 'unknown'}`;
  }

  _detectRecencyBias(decisions) {
    // Detect if recent outcomes are being overweighted
    const recent = decisions.slice(-10);
    const historical = decisions.slice(0, -10);

    if (historical.length < 10) {
      return { detected: false };
    }

    // Compare influence of recent vs historical
    const recentWins = recent.filter(d => d.outcome?.result === 'WIN').length;
    const historicalWins = historical.filter(d => d.outcome?.result === 'WIN').length;

    const recentWinRate = recentWins / recent.length;
    const historicalWinRate = historicalWins / historical.length;

    const bias = Math.abs(recentWinRate - historicalWinRate);

    return {
      detected: bias > 0.3,
      severity: bias > 0.5 ? 'high' : 'medium',
      evidence: `Recent win rate: ${(recentWinRate * 100).toFixed(1)}%, Historical: ${(historicalWinRate * 100).toFixed(1)}%`
    };
  }

  _detectConfirmationBias(decisions) {
    // Simplified detection
    return { detected: false };
  }

  _detectLossAversion(decisions) {
    // Detect if becoming too risk-averse after losses
    let consecutiveLosses = 0;
    let riskAfterLoss = [];

    for (let i = 0; i < decisions.length - 1; i++) {
      if (decisions[i].outcome?.result === 'LOSS') {
        consecutiveLosses++;
        // Check if next decision has lower confidence (risk aversion)
        if (decisions[i + 1].confidence < decisions[i].confidence) {
          riskAfterLoss.push(true);
        }
      } else {
        consecutiveLosses = 0;
      }
    }

    return {
      detected: riskAfterLoss.length > decisions.length * 0.3,
      severity: riskAfterLoss.length > decisions.length * 0.5 ? 'high' : 'medium',
      evidence: `${riskAfterLoss.length} instances of reduced risk after losses`
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getInsights() {
    return {
      mistakes: this.insights.mistakes.slice(-10),
      successes: this.insights.successes.slice(-10),
      patterns: Array.from(this.insights.patterns.values()),
      biases: Array.from(this.insights.biases.values()),
      calibration: { ...this.insights.calibration }
    };
  }

  getAwareness() {
    return { ...this.awareness };
  }

  getStatus() {
    return {
      decisionsTracked: this.decisionHistory.length,
      reflectionCount: this.reflectionCount,
      lastReflection: new Date(this.lastReflection).toISOString(),
      confidenceLevel: this.awareness.confidenceLevel,
      knownLimitations: this.awareness.knownLimitations.length,
      strengthAreas: this.awareness.strengthAreas.length
    };
  }
}
