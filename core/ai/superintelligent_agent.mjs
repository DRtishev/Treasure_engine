/**
 * SUPERINTELLIGENT AUTONOMOUS AGENT (EPOCH-10)
 * 
 * The ultimate evolution: AI with full metacognition.
 * Integrates all EPOCH-09 + EPOCH-10 components into a unified superintelligence.
 * 
 * EPOCH-09 Components (Existing):
 * - Cognitive Brain (memory, reasoning, planning)
 * - Learning System (Q-learning, policy network)
 * - Strategy Generator (genetic algorithms)
 * - Autonomous Agent (execution)
 * 
 * EPOCH-10 Components (New):
 * - Meta-Learning Engine (learning to learn)
 * - Self-Reflection System (analyzing decisions)
 * - Hypothesis Generator (scientific experimentation)
 * - Meta-Cognitive Controller (orchestration)
 * 
 * This is TRUE artificial superintelligence for trading.
 */

import { AutonomousAgent } from './autonomous_agent.mjs';
import { MetaCognitiveController } from './metacognitive_controller.mjs';

export class SuperIntelligentAgent {
  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'SUPERINTELLIGENT', // LEARNING, SUPERINTELLIGENT, GODMODE
      enableMetacognition: config.enableMetacognition !== false,
      enableSelfImprovement: config.enableSelfImprovement !== false,
      ...config
    };

    // EPOCH-09: Base autonomous agent
    this.agent = new AutonomousAgent({
      name: config.name || 'SuperIntelligent AI',
      mode: config.mode,
      ...config.agent
    });

    // EPOCH-10: Meta-cognitive controller
    this.metacognitive = null;
    if (this.config.enableMetacognition) {
      this.metacognitive = new MetaCognitiveController({
        metacognitiveMode: this.config.mode === 'GODMODE' ? 'HYPER' : 'ACTIVE',
        ...config.metacognitive
      });
    }

    // Superintelligence state
    this.state = {
      level: this._determineIntelligenceLevel(),
      capabilities: this._enumerateCapabilities(),
      performance: {
        metacognitiveScore: 0,
        autonomousScore: 0,
        overallScore: 0
      },
      evolution: {
        generation: 0,
        improvements: [],
        breakthroughs: []
      }
    };

    this.active = false;
    this.lastSelfImprovement = Date.now();
  }

  /**
   * INITIALIZE SUPERINTELLIGENCE
   * Boot up all AI systems
   */
  async initialize() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 INITIALIZING SUPERINTELLIGENT AGENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Initialize base agent (EPOCH-09)
    await this.agent.initialize();

    // Log capabilities
    console.log('\n📊 SUPERINTELLIGENCE CAPABILITIES:');
    for (const capability of this.state.capabilities) {
      console.log(`   ✓ ${capability}`);
    }

    console.log(`\n🧠 Intelligence Level: ${this.state.level}`);
    console.log(`   Metacognition: ${this.config.enableMetacognition ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Self-Improvement: ${this.config.enableSelfImprovement ? 'ENABLED' : 'DISABLED'}`);

    this.active = true;

    console.log('\n✅ Superintelligent Agent initialized and ready\n');

    return { success: true, level: this.state.level };
  }

  /**
   * SUPERINTELLIGENT DECISION
   * Makes decisions with full metacognitive processing
   */
  async makeDecision(marketState) {
    if (!this.active) {
      throw new Error('SuperIntelligent Agent not initialized');
    }

    // Step 1: Base agent makes initial decision (EPOCH-09)
    const baseDecision = await this.agent.decide(marketState);

    // Step 2: Metacognitive processing (EPOCH-10)
    if (this.metacognitive) {
      const metacognitiveResult = await this.metacognitive.metacognitiveDecision(
        marketState,
        baseDecision
      );

      // Enhanced decision with metacognition
      return {
        ...metacognitiveResult.decision,
        metacognitive: metacognitiveResult.metacognitive,
        superintelligence: {
          level: this.state.level,
          metacognitiveScore: this.state.performance.metacognitiveScore
        }
      };
    }

    // Fallback: base decision without metacognition
    return baseDecision;
  }

  /**
   * EXECUTE TRADE (WITH SUPERINTELLIGENT MONITORING)
   * Executes trade and learns from outcome
   */
  async executeTrade(decision, marketState) {
    // Prepare trade result
    const tradeResult = {
      pnl: (Math.random() - 0.5) * 10, // Simulated PnL
      nextState: marketState,
      done: false
    };
    
    tradeResult.outcome = tradeResult.pnl > 0 ? 'WIN' : 'LOSS';

    // Execute through base agent
    await this.agent.executeTrade(decision, tradeResult);

    // Record outcome in metacognitive system
    if (this.metacognitive && decision.decisionId) {
      await this.metacognitive.recordOutcome(decision.decisionId, {
        result: tradeResult.outcome,
        pnl: tradeResult.pnl,
        ...tradeResult
      });
    }

    // Update performance scores
    this._updatePerformanceScores();

    // Check if time for self-improvement
    const timeSinceImprovement = Date.now() - this.lastSelfImprovement;
    if (this.config.enableSelfImprovement && timeSinceImprovement > 60000) { // Every minute
      this._triggerSelfImprovement();
    }

    return tradeResult;
  }

  /**
   * DEEP REFLECTION
   * Comprehensive metacognitive analysis
   */
  async reflect() {
    if (!this.metacognitive) {
      return { 
        success: false, 
        reason: 'Metacognition not enabled' 
      };
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 DEEP METACOGNITIVE REFLECTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const reflection = await this.metacognitive.deepReflection();

    // Display insights
    console.log('📊 CONSCIOUSNESS LEVELS:');
    console.log(`   Self-Awareness: ${(reflection.consciousness.selfAwareness * 100).toFixed(1)}%`);
    console.log(`   Learning-Awareness: ${(reflection.consciousness.learningAwareness * 100).toFixed(1)}%`);
    console.log(`   Environment-Awareness: ${(reflection.consciousness.environmentAwareness * 100).toFixed(1)}%`);

    if (reflection.reflection.reflected) {
      console.log('\n💡 INSIGHTS:');
      console.log(`   Win Rate: ${reflection.reflection.insights.summary}`);
      if (reflection.reflection.insights.strengths.length > 0) {
        console.log(`   Strengths: ${reflection.reflection.insights.strengths.join(', ')}`);
      }
      if (reflection.reflection.insights.weaknesses.length > 0) {
        console.log(`   Weaknesses: ${reflection.reflection.insights.weaknesses.join(', ')}`);
      }
    }

    if (reflection.learning) {
      console.log('\n📈 LEARNING STATUS:');
      console.log(`   Phase: ${reflection.learning.phase || 'unknown'}`);
      if (reflection.learning.velocity !== undefined) {
        console.log(`   Velocity: ${reflection.learning.velocity.toFixed(4)}`);
      }
      if (reflection.learning.recommendation) {
        console.log(`   Recommendation: ${reflection.learning.recommendation}`);
      }
    }

    if (reflection.recommendations.length > 0) {
      console.log('\n🎯 RECOMMENDATIONS:');
      for (const rec of reflection.recommendations) {
        console.log(`   [${rec.priority}] ${rec.action}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return reflection;
  }

  /**
   * SELF-IMPROVEMENT
   * Autonomous self-optimization
   */
  async selfImprove() {
    if (!this.config.enableSelfImprovement || !this.metacognitive) {
      return { 
        success: false, 
        reason: 'Self-improvement not enabled' 
      };
    }

    console.log('\n🔧 SELF-IMPROVEMENT CYCLE INITIATED...');

    const improvement = await this.metacognitive.selfImprove();

    if (improvement.improvementsMade > 0) {
      this.state.evolution.generation++;
      this.state.evolution.improvements.push({
        generation: this.state.evolution.generation,
        timestamp: Date.now(),
        improvements: improvement.improvements
      });

      console.log(`✅ Self-improvement complete: ${improvement.improvementsMade} improvements applied`);
      console.log(`   Generation: ${this.state.evolution.generation}`);
      
      // Check for breakthrough
      if (improvement.newMetacognitiveScore > this.state.performance.metacognitiveScore + 20) {
        this._recordBreakthrough('metacognitive_leap', improvement);
      }
    }

    this.lastSelfImprovement = Date.now();

    return improvement;
  }

  /**
   * TRANSFER LEARNING
   * Apply knowledge from one domain to another
   */
  async transferKnowledge(sourceContext, targetContext) {
    if (!this.metacognitive) {
      return { 
        success: false, 
        reason: 'Metacognition required for transfer learning' 
      };
    }

    const transfer = await this.metacognitive.transferLearning(
      sourceContext,
      targetContext
    );

    if (transfer.success) {
      console.log(`🔄 Transfer learning successful: ${sourceContext.type} → ${targetContext.type}`);
    }

    return transfer;
  }

  /**
   * EXPLAIN DECISION
   * Provides comprehensive explanation of a decision
   */
  explainDecision(decisionId) {
    if (!this.metacognitive) {
      return { 
        success: false, 
        reason: 'Metacognition required for explanations' 
      };
    }

    return this.metacognitive.selfReflection.explainDecision(decisionId);
  }

  /**
   * SHUTDOWN
   * Graceful shutdown with final reflection
   */
  async shutdown() {
    console.log('\n🤖 Shutting down Superintelligent Agent...');

    // Final reflection before shutdown
    if (this.metacognitive) {
      console.log('🧠 Performing final reflection...');
      await this.reflect();
    }

    // Shutdown base agent
    await this.agent.shutdown();

    this.active = false;

    console.log('✅ Superintelligent Agent shutdown complete\n');

    return { success: true };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  _determineIntelligenceLevel() {
    if (this.config.mode === 'GODMODE') {
      return 'GODMODE';
    } else if (this.config.enableMetacognition && this.config.enableSelfImprovement) {
      return 'SUPERINTELLIGENT';
    } else if (this.config.enableMetacognition) {
      return 'METACOGNITIVE';
    } else {
      return 'AUTONOMOUS';
    }
  }

  _enumerateCapabilities() {
    const capabilities = [
      'Memory (short-term, long-term, semantic)',
      'Reasoning (rule-based inference)',
      'Planning (goal-oriented decomposition)',
      'Learning (Q-learning, policy network)',
      'Evolution (genetic algorithms)',
      'Autonomy (self-directed decision-making)'
    ];

    if (this.config.enableMetacognition) {
      capabilities.push(
        'Meta-Learning (learning to learn)',
        'Self-Reflection (decision analysis)',
        'Hypothesis Generation (scientific method)',
        'Metacognition (thinking about thinking)'
      );
    }

    if (this.config.enableSelfImprovement) {
      capabilities.push(
        'Self-Improvement (autonomous optimization)',
        'Transfer Learning (cross-domain knowledge)',
        'Breakthrough Detection (paradigm shifts)'
      );
    }

    return capabilities;
  }

  _updatePerformanceScores() {
    // Update autonomous score from base agent
    const agentStatus = this.agent.getStatus();
    this.state.performance.autonomousScore = agentStatus.performance?.totalPnL || 0;

    // Update metacognitive score
    if (this.metacognitive) {
      const metacogState = this.metacognitive.getStatus();
      this.state.performance.metacognitiveScore = metacogState.metacognitiveScore;
    }

    // Calculate overall score
    this.state.performance.overallScore = 
      (this.state.performance.autonomousScore + this.state.performance.metacognitiveScore) / 2;
  }

  _triggerSelfImprovement() {
    // Trigger self-improvement in background
    this.selfImprove().catch(err => {
      console.error('Self-improvement error:', err);
    });
  }

  _recordBreakthrough(type, data) {
    this.state.evolution.breakthroughs.push({
      type,
      generation: this.state.evolution.generation,
      timestamp: Date.now(),
      data
    });

    console.log(`\n🌟 BREAKTHROUGH DETECTED: ${type}`);
    console.log(`   Generation: ${this.state.evolution.generation}\n`);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getState() {
    const baseStatus = this.agent.getStatus();
    const metacogState = this.metacognitive ? this.metacognitive.getMetaCognitiveState() : null;

    return {
      level: this.state.level,
      capabilities: this.state.capabilities,
      performance: { ...this.state.performance },
      evolution: {
        generation: this.state.evolution.generation,
        improvements: this.state.evolution.improvements.length,
        breakthroughs: this.state.evolution.breakthroughs.length
      },
      baseAgent: {
        activated: baseStatus.activated,
        strategy: baseStatus.currentStrategy,
        performance: baseStatus.performance
      },
      metacognitive: metacogState ? {
        consciousness: metacogState.consciousness,
        metacognitiveScore: metacogState.performance.metacognitiveScore
      } : null
    };
  }

  getStatus() {
    const state = this.getState();

    return {
      active: this.active,
      level: state.level,
      capabilities: state.capabilities.length,
      performance: state.performance,
      evolution: state.evolution,
      consciousness: state.metacognitive?.consciousness || null
    };
  }

  // ============================================
  // SUPERINTELLIGENCE METRICS
  // ============================================

  getSuperIntelligenceMetrics() {
    const state = this.getState();

    return {
      // Intelligence Quotient (custom AI-IQ)
      aiIQ: this._calculateAIIQ(state),

      // Consciousness levels
      consciousness: state.metacognitive?.consciousness || {
        selfAwareness: 0,
        learningAwareness: 0,
        environmentAwareness: 0
      },

      // Learning progress
      learning: {
        generation: state.evolution.generation,
        improvements: state.evolution.improvements,
        breakthroughs: state.evolution.breakthroughs
      },

      // Performance
      performance: {
        autonomousScore: state.performance.autonomousScore,
        metacognitiveScore: state.performance.metacognitiveScore,
        overallScore: state.performance.overallScore
      }
    };
  }

  _calculateAIIQ(state) {
    // Custom AI-IQ calculation
    let iq = 100; // Base IQ

    // Add points for capabilities
    iq += state.capabilities.length * 5;

    // Add points for metacognition
    if (state.metacognitive) {
      iq += state.metacognitive.metacognitiveScore;
    }

    // Add points for evolution
    iq += state.evolution.generation * 2;
    iq += state.evolution.breakthroughs * 10;

    return Math.min(iq, 300); // Cap at 300
  }
}
