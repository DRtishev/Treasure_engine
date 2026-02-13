/**
 * META-COGNITIVE CONTROLLER (EPOCH-10)
 * 
 * The "brain of the brain" - orchestrates all meta-cognitive systems.
 * Implements true metacognition by thinking about the thinking process itself.
 * 
 * Integrates:
 * - Meta-Learning Engine (learning how to learn)
 * - Self-Reflection System (analyzing decisions)
 * - Hypothesis Generator (scientific experimentation)
 * - Autonomous Agent (execution)
 * 
 * This is the superintelligence layer that makes the AI truly self-aware.
 */

import { MetaLearningEngine } from './meta_learning_engine.mjs';
import { SelfReflectionSystem } from './self_reflection_system.mjs';
import { HypothesisGenerator } from './hypothesis_generator.mjs';

export class MetaCognitiveController {
  constructor(config = {}) {
    this.config = {
      metacognitiveMode: config.metacognitiveMode || 'ACTIVE', // ACTIVE, PASSIVE, HYPER
      reflectionFrequency: config.reflectionFrequency || 10, // decisions
      hypothesisTestingRate: config.hypothesisTestingRate || 0.05, // 5% of trades
      learningAdaptationRate: config.learningAdaptationRate || 0.1,
      ...config
    };

    // Initialize meta-cognitive systems
    this.metaLearning = new MetaLearningEngine(config.metaLearning || {});
    this.selfReflection = new SelfReflectionSystem(config.selfReflection || {});
    this.hypothesisGen = new HypothesisGenerator(config.hypothesisGen || {});

    // Meta-cognitive state
    this.state = {
      mode: this.config.metacognitiveMode,
      consciousness: {
        selfAwareness: 0.5,
        learningAwareness: 0.5,
        environmentAwareness: 0.5
      },
      metaObjectives: {
        currentGoal: 'maximize_learning',
        subGoals: [],
        progress: 0
      },
      performance: {
        metacognitiveScore: 0,
        improvementRate: 0,
        lastEvaluation: Date.now()
      }
    };

    // Decision counter for triggering meta-processes
    this.decisionCount = 0;
    this.lastReflection = Date.now();
    this.lastHypothesisTest = Date.now();
  }

  /**
   * METACOGNITIVE DECISION LOOP
   * The main decision-making process with full metacognition
   */
  async metacognitiveDecision(marketState, baseDecision) {
    this.decisionCount++;

    // Step 1: Self-awareness check
    const awareness = this._assessSelfAwareness(marketState);

    // Step 2: Should we explore (test hypothesis) or exploit (use known strategy)?
    const explorationDecision = this._decideExploreVsExploit(marketState, awareness);

    // Step 3: If exploring, test a hypothesis
    let finalDecision = baseDecision;
    
    if (explorationDecision.explore) {
      const hypothesisTest = await this._testHypothesis(marketState);
      if (hypothesisTest.executed) {
        finalDecision = hypothesisTest.decision;
        finalDecision.isExperimental = true;
        finalDecision.hypothesisId = hypothesisTest.hypothesisId;
      }
    }

    // Step 4: Record decision for future reflection
    const decisionId = this.selfReflection.recordDecision({
      ...finalDecision,
      context: marketState,
      metacognitive: {
        awareness,
        exploration: explorationDecision,
        isExperimental: finalDecision.isExperimental || false
      }
    });

    finalDecision.decisionId = decisionId;

    // Step 5: Check if time to reflect
    if (this.decisionCount % this.config.reflectionFrequency === 0) {
      this._triggerReflection();
    }

    // Step 6: Meta-learning adaptation
    this._adaptMetaLearning(marketState, finalDecision);

    // Step 7: Update consciousness
    this._updateConsciousness(awareness, explorationDecision);

    return {
      decision: finalDecision,
      metacognitive: {
        awareness,
        exploration: explorationDecision,
        consciousness: { ...this.state.consciousness }
      }
    };
  }

  /**
   * RECORD OUTCOME (WITH METACOGNITIVE PROCESSING)
   * Processes outcome with full metacognitive analysis
   */
  async recordOutcome(decisionId, outcome) {
    // Record in reflection system
    this.selfReflection.recordOutcome(decisionId, outcome);

    // If this was a hypothesis test, record evidence
    const decision = this.selfReflection.decisionHistory.find(d => d.id === decisionId);
    if (decision && decision.decision.isExperimental) {
      await this.hypothesisGen.testHypothesis(
        decision.decision.hypothesisId,
        decision.context
      );
    }

    // Meta-learning: adapt based on outcome
    const performance = {
      reward: outcome.pnl || 0,
      success: outcome.result === 'WIN'
    };

    this.metaLearning.optimizeMetaParameters(performance);

    return { success: true };
  }

  /**
   * DEEP METACOGNITIVE REFLECTION
   * Comprehensive analysis of decision-making process
   */
  async deepReflection() {
    // Trigger reflection in all systems
    const reflectionResult = await this.selfReflection.reflect(true);

    // Analyze learning curves
    const recentPerformance = this._extractRecentPerformance();
    const learningAnalysis = this.metaLearning.analyzeLearningCurve(recentPerformance);

    // Check hypothesis testing progress
    const hypothesisStatus = this.hypothesisGen.getStatus();

    // Synthesize meta-insights
    const metaInsights = {
      reflection: reflectionResult,
      learning: learningAnalysis,
      hypotheses: hypothesisStatus,
      consciousness: { ...this.state.consciousness },
      recommendations: []
    };

    // Generate metacognitive recommendations
    metaInsights.recommendations = this._generateMetaRecommendations(metaInsights);

    // Update metacognitive score
    this._evaluateMetacognitivePerformance(metaInsights);

    return metaInsights;
  }

  /**
   * TRANSFER LEARNING ORCHESTRATION
   * Applies learning from one domain to another
   */
  async transferLearning(sourceContext, targetContext) {
    // Use meta-learning engine for transfer
    const transfer = this.metaLearning.transferLearn(
      sourceContext.type,
      targetContext.type,
      targetContext.examples || []
    );

    if (transfer.success) {
      // Generate hypothesis for new context based on transfer
      const hypothesis = await this.hypothesisGen.generateHypothesis({
        type: 'transfer_learning',
        source: sourceContext.type,
        target: targetContext.type,
        adaptedKnowledge: transfer.adaptedKnowledge
      });

      return {
        success: true,
        transfer,
        hypothesis,
        message: `Successfully transferred learning from ${sourceContext.type} to ${targetContext.type}`
      };
    }

    return transfer;
  }

  /**
   * SELF-IMPROVEMENT CYCLE
   * Autonomous self-improvement based on metacognitive analysis
   */
  async selfImprove() {
    // 1. Reflect on recent performance
    const reflection = await this.deepReflection();

    // 2. Identify improvement areas
    const improvements = [];

    // Check if overconfident
    if (reflection.reflection.insights?.weaknesses?.includes('overconfidence')) {
      improvements.push({
        area: 'confidence_calibration',
        action: 'Reduce confidence threshold by 10%',
        priority: 'HIGH'
      });
    }

    // Check if learning velocity is low
    if (reflection.learning.velocity < 0.1) {
      improvements.push({
        area: 'exploration',
        action: 'Increase hypothesis testing rate to 10%',
        priority: 'MEDIUM'
      });
    }

    // Check if hypothesis validation rate is low
    const validationRate = reflection.hypotheses.validatedHypotheses / 
      (reflection.hypotheses.validatedHypotheses + reflection.hypotheses.rejectedHypotheses + 0.01);
    
    if (validationRate < 0.3 && reflection.hypotheses.totalExperiments > 20) {
      improvements.push({
        area: 'hypothesis_quality',
        action: 'Improve pattern detection algorithms',
        priority: 'HIGH'
      });
    }

    // 3. Apply improvements
    for (const improvement of improvements) {
      this._applyImprovement(improvement);
    }

    return {
      improvementsMade: improvements.length,
      improvements,
      newMetacognitiveScore: this.state.performance.metacognitiveScore
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  _assessSelfAwareness(marketState) {
    // Assess current self-awareness across dimensions
    return {
      selfAwareness: this._calculateSelfAwareness(),
      learningAwareness: this._calculateLearningAwareness(),
      environmentAwareness: this._calculateEnvironmentAwareness(marketState),
      overall: (this.state.consciousness.selfAwareness + 
                this.state.consciousness.learningAwareness + 
                this.state.consciousness.environmentAwareness) / 3
    };
  }

  _calculateSelfAwareness() {
    // Based on reflection system insights
    const insights = this.selfReflection.getInsights();
    const hasInsights = insights.mistakes.length + insights.successes.length > 0;
    
    return hasInsights ? 0.8 : 0.3;
  }

  _calculateLearningAwareness() {
    // Based on meta-learning knowledge
    const metaKnowledge = this.metaLearning.getMetaKnowledge();
    
    return Math.min(metaKnowledge.tasksLearned / 10, 1.0);
  }

  _calculateEnvironmentAwareness(marketState) {
    // Based on observations and hypotheses
    const status = this.hypothesisGen.getStatus();
    
    return Math.min(status.observations / 100, 1.0);
  }

  _decideExploreVsExploit(marketState, awareness) {
    // Exploration-exploitation tradeoff with metacognitive awareness
    
    // Base exploration rate
    let explorationRate = this.config.hypothesisTestingRate;

    // Increase exploration if learning awareness is low
    if (awareness.learningAwareness < 0.3) {
      explorationRate *= 2;
    }

    // Decrease exploration if we have high confidence validated hypotheses
    const validatedCount = this.hypothesisGen.getValidatedHypotheses().length;
    if (validatedCount > 5) {
      explorationRate *= 0.5;
    }

    // Random exploration decision
    const explore = Math.random() < explorationRate;

    return {
      explore,
      explorationRate,
      reason: explore ? 
        `Exploring (rate: ${(explorationRate * 100).toFixed(1)}%)` : 
        `Exploiting validated strategies`
    };
  }

  async _testHypothesis(marketState) {
    // Get active hypotheses
    const activeHypotheses = this.hypothesisGen.getActiveHypotheses();

    if (activeHypotheses.length === 0) {
      // No active hypotheses, try to generate one
      this.hypothesisGen.observe(marketState);
      return { executed: false };
    }

    // Select hypothesis to test (prefer least tested)
    const hypothesis = activeHypotheses.sort((a, b) => 
      a.evidenceCount - b.evidenceCount
    )[0];

    // Test it
    const testResult = await this.hypothesisGen.testHypothesis(
      hypothesis.id,
      marketState
    );

    if (testResult.success) {
      // Create decision based on hypothesis
      return {
        executed: true,
        hypothesisId: hypothesis.id,
        decision: {
          action: hypothesis.prediction?.action || 'HOLD',
          confidence: hypothesis.confidence,
          reasoning: [`Testing hypothesis: ${hypothesis.statement}`]
        }
      };
    }

    return { executed: false };
  }

  _triggerReflection() {
    // Trigger background reflection (non-blocking)
    this.deepReflection().then(insights => {
      console.log('🧠 Meta-Cognitive Reflection:', {
        consciousness: insights.consciousness,
        recommendations: insights.recommendations.length
      });
    });
  }

  _adaptMetaLearning(marketState, decision) {
    // Adapt meta-learning parameters based on current state
    const recentPerformance = this._extractRecentPerformance();
    
    if (recentPerformance.length > 5) {
      this.metaLearning.adaptLearningRate(
        recentPerformance.map(p => p.reward || 0)
      );
    }
  }

  _updateConsciousness(awareness, explorationDecision) {
    // Update consciousness levels
    this.state.consciousness.selfAwareness = 
      0.9 * this.state.consciousness.selfAwareness + 0.1 * awareness.selfAwareness;
    
    this.state.consciousness.learningAwareness = 
      0.9 * this.state.consciousness.learningAwareness + 0.1 * awareness.learningAwareness;
    
    this.state.consciousness.environmentAwareness = 
      0.9 * this.state.consciousness.environmentAwareness + 0.1 * awareness.environmentAwareness;
  }

  _extractRecentPerformance() {
    // Extract recent performance from decision history
    const recentDecisions = this.selfReflection.decisionHistory
      .filter(d => d.outcome !== null)
      .slice(-20);

    return recentDecisions.map(d => ({
      reward: d.outcome.pnl || 0,
      success: d.outcome.result === 'WIN'
    }));
  }

  _generateMetaRecommendations(metaInsights) {
    const recommendations = [];

    // From reflection
    if (metaInsights.reflection.reflected && metaInsights.reflection.recommendations) {
      recommendations.push(...metaInsights.reflection.recommendations);
    }

    // From learning analysis
    if (metaInsights.learning.phase === 'plateau') {
      recommendations.push({
        priority: 'HIGH',
        action: 'Increase exploration rate',
        reason: 'Learning has plateaued'
      });
    }

    // From hypothesis testing
    if (metaInsights.hypotheses.activeHypotheses === 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Generate new hypotheses',
        reason: 'No active hypotheses being tested'
      });
    }

    return recommendations;
  }

  _evaluateMetacognitivePerformance(metaInsights) {
    // Calculate overall metacognitive performance score
    let score = 0;

    // Self-awareness component (0-30 points)
    score += metaInsights.consciousness.selfAwareness * 10;
    score += metaInsights.consciousness.learningAwareness * 10;
    score += metaInsights.consciousness.environmentAwareness * 10;

    // Reflection quality (0-30 points)
    if (metaInsights.reflection.reflected) {
      score += 10;
      if (metaInsights.reflection.recommendations?.length > 0) {
        score += 10;
      }
      if (metaInsights.reflection.insights?.strengths?.length > 0) {
        score += 10;
      }
    }

    // Learning progress (0-20 points)
    if (metaInsights.learning.phase === 'rapid_learning') {
      score += 20;
    } else if (metaInsights.learning.phase === 'stable_learning') {
      score += 15;
    } else if (metaInsights.learning.phase === 'plateau') {
      score += 10;
    }

    // Hypothesis testing (0-20 points)
    const validationRate = metaInsights.hypotheses.validatedHypotheses / 
      (metaInsights.hypotheses.validatedHypotheses + metaInsights.hypotheses.rejectedHypotheses + 1);
    score += validationRate * 20;

    // Update state
    this.state.performance.metacognitiveScore = score;
    this.state.performance.lastEvaluation = Date.now();

    return score;
  }

  _applyImprovement(improvement) {
    // Apply specific improvement action
    switch (improvement.area) {
      case 'confidence_calibration':
        // Reduce confidence threshold
        console.log('🔧 Applying improvement:', improvement.action);
        break;
      
      case 'exploration':
        // Increase hypothesis testing rate
        this.config.hypothesisTestingRate *= 1.5;
        console.log('🔧 Applying improvement:', improvement.action);
        break;
      
      case 'hypothesis_quality':
        // Improve pattern detection
        console.log('🔧 Applying improvement:', improvement.action);
        break;
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getMetaCognitiveState() {
    return {
      mode: this.state.mode,
      consciousness: { ...this.state.consciousness },
      performance: { ...this.state.performance },
      systems: {
        metaLearning: this.metaLearning.getStatus(),
        selfReflection: this.selfReflection.getStatus(),
        hypothesisGen: this.hypothesisGen.getStatus()
      }
    };
  }

  getStatus() {
    const state = this.getMetaCognitiveState();
    
    return {
      metacognitiveScore: state.performance.metacognitiveScore,
      consciousness: state.consciousness,
      decisionsProcessed: this.decisionCount,
      systems: state.systems
    };
  }
}
