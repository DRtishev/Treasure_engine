#!/usr/bin/env node
// core/ai/cognitive_brain.mjs
// EPOCH-09: Cognitive Architecture - The Thinking Core
// Autonomous decision-making with memory, reasoning, and planning

import { EventEmitter } from 'events';

/**
 * Memory System - Short-term and Long-term memory
 */
export class MemorySystem {
  constructor() {
    // Short-term memory (working memory, last 100 items)
    this.shortTerm = [];
    this.shortTermLimit = 100;
    
    // Long-term memory (episodic memory, unlimited with decay)
    this.longTerm = new Map(); // key -> { data, timestamp, accessCount, importance }
    
    // Semantic memory (knowledge, facts, patterns)
    this.semantic = new Map(); // concept -> knowledge
    
    // Statistics
    this.stats = {
      shortTermWrites: 0,
      longTermWrites: 0,
      semanticWrites: 0,
      retrievals: 0,
      consolidations: 0
    };
  }

  /**
   * Store in short-term memory
   */
  storeShortTerm(item) {
    this.shortTerm.push({
      data: item,
      timestamp: Date.now()
    });
    
    // Keep only last N items
    if (this.shortTerm.length > this.shortTermLimit) {
      this.shortTerm.shift();
    }
    
    this.stats.shortTermWrites++;
  }

  /**
   * Store in long-term memory
   */
  storeLongTerm(key, data, importance = 0.5) {
    this.longTerm.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      importance,
      lastAccess: Date.now()
    });
    
    this.stats.longTermWrites++;
  }

  /**
   * Store semantic knowledge
   */
  storeSemantic(concept, knowledge) {
    if (!this.semantic.has(concept)) {
      this.semantic.set(concept, []);
    }
    
    this.semantic.get(concept).push({
      knowledge,
      timestamp: Date.now(),
      confidence: 1.0
    });
    
    this.stats.semanticWrites++;
  }

  /**
   * Retrieve from memory (checks all types)
   */
  retrieve(query) {
    this.stats.retrievals++;
    
    // Check short-term first
    const shortTermResults = this.shortTerm
      .filter(item => this._matches(item.data, query))
      .slice(-5); // Last 5 matches
    
    // Check long-term
    const longTermResults = [];
    for (const [key, value] of this.longTerm) {
      if (this._matches(value.data, query) || this._matches(key, query)) {
        // Update access count
        value.accessCount++;
        value.lastAccess = Date.now();
        
        longTermResults.push({
          key,
          ...value
        });
      }
    }
    
    // Sort by importance and recency
    longTermResults.sort((a, b) => {
      const scoreA = a.importance * 0.7 + (1 / (Date.now() - a.lastAccess + 1)) * 0.3;
      const scoreB = b.importance * 0.7 + (1 / (Date.now() - b.lastAccess + 1)) * 0.3;
      return scoreB - scoreA;
    });
    
    return {
      shortTerm: shortTermResults,
      longTerm: longTermResults.slice(0, 10), // Top 10
      semantic: this._retrieveSemantic(query)
    };
  }

  /**
   * Consolidate short-term to long-term (like sleep consolidation)
   */
  consolidate() {
    // Move important items from short-term to long-term
    const importantItems = this.shortTerm.filter(item => {
      return this._calculateImportance(item.data) > 0.6;
    });
    
    for (const item of importantItems) {
      const key = `consolidated_${Date.now()}_${Math.random()}`;
      this.storeLongTerm(key, item.data, this._calculateImportance(item.data));
    }
    
    this.stats.consolidations++;
    
    return {
      consolidated: importantItems.length,
      total: this.shortTerm.length
    };
  }

  /**
   * Calculate importance of memory item
   * @private
   */
  _calculateImportance(data) {
    let score = 0.5; // Base importance
    
    // High PnL changes are important
    if (data.pnl && Math.abs(data.pnl) > 50) score += 0.3;
    
    // Anomalies are important
    if (data.anomaly) score += 0.2;
    
    // Errors are important
    if (data.error) score += 0.3;
    
    // HALT events are very important
    if (data.verdict === 'HALT') score += 0.5;
    
    return Math.min(score, 1.0);
  }

  /**
   * Simple matching function
   * @private
   */
  _matches(data, query) {
    if (typeof query === 'string') {
      const dataStr = JSON.stringify(data).toLowerCase();
      return dataStr.includes(query.toLowerCase());
    }
    
    if (typeof query === 'object') {
      return Object.keys(query).every(key => {
        return data[key] === query[key];
      });
    }
    
    return false;
  }

  /**
   * Retrieve semantic knowledge
   * @private
   */
  _retrieveSemantic(query) {
    const results = [];
    
    for (const [concept, knowledge] of this.semantic) {
      if (concept.toLowerCase().includes(query.toLowerCase())) {
        results.push({ concept, knowledge });
      }
    }
    
    return results;
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      ...this.stats,
      shortTermSize: this.shortTerm.length,
      longTermSize: this.longTerm.size,
      semanticConcepts: this.semantic.size
    };
  }
}

/**
 * Reasoning Engine - Logical reasoning and decision-making
 */
export class ReasoningEngine {
  constructor() {
    this.rules = new Map(); // rule_id -> rule
    this.inferences = []; // History of inferences
  }

  /**
   * Add reasoning rule
   */
  addRule(id, rule) {
    this.rules.set(id, {
      id,
      condition: rule.condition,
      action: rule.action,
      priority: rule.priority || 5,
      enabled: rule.enabled !== false
    });
  }

  /**
   * Reason about current state
   */
  reason(state, context = {}) {
    const applicableRules = [];
    
    // Find applicable rules
    for (const [id, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      if (this._evaluateCondition(rule.condition, state, context)) {
        applicableRules.push(rule);
      }
    }
    
    // Sort by priority
    applicableRules.sort((a, b) => b.priority - a.priority);
    
    // Execute actions
    const actions = applicableRules.map(rule => {
      const inference = {
        rule_id: rule.id,
        timestamp: Date.now(),
        state,
        action: rule.action
      };
      
      this.inferences.push(inference);
      
      return rule.action;
    });
    
    return {
      actions,
      rulesApplied: applicableRules.length,
      reasoning: applicableRules.map(r => ({
        rule: r.id,
        priority: r.priority
      }))
    };
  }

  /**
   * Evaluate condition
   * @private
   */
  _evaluateCondition(condition, state, context) {
    if (typeof condition === 'function') {
      return condition(state, context);
    }
    
    // Simple object matching
    if (typeof condition === 'object') {
      return Object.keys(condition).every(key => {
        return state[key] === condition[key];
      });
    }
    
    return false;
  }

  /**
   * Learn from outcome (update rule priorities)
   */
  learnFromOutcome(ruleId, outcome) {
    const rule = this.rules.get(ruleId);
    if (!rule) return;
    
    // Adjust priority based on outcome
    if (outcome > 0) {
      // Good outcome, increase priority
      rule.priority = Math.min(rule.priority + 0.1, 10);
    } else {
      // Bad outcome, decrease priority
      rule.priority = Math.max(rule.priority - 0.1, 1);
    }
  }
}

/**
 * Planning System - Goal-oriented planning
 */
export class PlanningSystem {
  constructor() {
    this.goals = []; // Active goals
    this.plans = new Map(); // goal_id -> plan
  }

  /**
   * Set goal
   */
  setGoal(goal) {
    this.goals.push({
      id: `goal_${Date.now()}`,
      description: goal.description,
      target: goal.target,
      deadline: goal.deadline,
      priority: goal.priority || 5,
      status: 'ACTIVE',
      progress: 0
    });
  }

  /**
   * Create plan for goal
   */
  createPlan(goalId, currentState) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return null;
    
    // Simple planning: decompose goal into steps
    const steps = this._decompose(goal, currentState);
    
    const plan = {
      goal_id: goalId,
      steps,
      currentStep: 0,
      status: 'ACTIVE',
      created: Date.now()
    };
    
    this.plans.set(goalId, plan);
    
    return plan;
  }

  /**
   * Execute next step of plan
   */
  executeNextStep(goalId) {
    const plan = this.plans.get(goalId);
    if (!plan || plan.status !== 'ACTIVE') return null;
    
    const step = plan.steps[plan.currentStep];
    if (!step) {
      plan.status = 'COMPLETED';
      return null;
    }
    
    // Execute step
    plan.currentStep++;
    
    return {
      action: step.action,
      parameters: step.parameters
    };
  }

  /**
   * Decompose goal into steps
   * @private
   */
  _decompose(goal, currentState) {
    // Simple heuristic decomposition
    const steps = [];
    
    if (goal.target.pnl) {
      steps.push({
        action: 'ANALYZE_MARKET',
        parameters: {}
      });
      steps.push({
        action: 'IDENTIFY_OPPORTUNITY',
        parameters: { target_pnl: goal.target.pnl }
      });
      steps.push({
        action: 'EXECUTE_TRADE',
        parameters: { risk_limit: 0.02 }
      });
      steps.push({
        action: 'MONITOR_POSITION',
        parameters: { check_interval: 60000 }
      });
    }
    
    return steps;
  }

  /**
   * Update goal progress
   */
  updateProgress(goalId, progress) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = progress;
      if (progress >= 1.0) {
        goal.status = 'COMPLETED';
      }
    }
  }
}

/**
 * Cognitive Brain - Main cognitive architecture
 * Integrates memory, reasoning, and planning
 */
export class CognitiveBrain extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = options;
    
    // Subsystems
    this.memory = new MemorySystem();
    this.reasoning = new ReasoningEngine();
    this.planning = new PlanningSystem();
    
    // State
    this.currentState = {
      mode: 'LEARNING',
      attention: null,
      activeGoals: [],
      cognitiveLoad: 0
    };
    
    // Statistics
    this.stats = {
      decisions: 0,
      thoughtCycles: 0,
      goalsAchieved: 0,
      learningEvents: 0
    };
    
    console.log('🧠 Cognitive Brain initialized');
  }

  /**
   * Think - Main cognitive cycle
   */
  async think(input) {
    this.stats.thoughtCycles++;
    
    // STEP 1: Perceive - Store in short-term memory
    this.memory.storeShortTerm(input);
    
    // STEP 2: Retrieve relevant memories
    const memories = this.memory.retrieve(input.context || 'current');
    
    // STEP 3: Reason about situation
    const reasoning = this.reasoning.reason(input, {
      memories: memories.longTerm,
      goals: this.planning.goals
    });
    
    // STEP 4: Make decision
    const decision = this._makeDecision(input, memories, reasoning);
    
    // STEP 5: Update state
    this._updateState(decision);
    
    // Emit thought event
    this.emit('thought', {
      input,
      memories,
      reasoning,
      decision,
      timestamp: Date.now()
    });
    
    this.stats.decisions++;
    
    return decision;
  }

  /**
   * Make decision based on reasoning
   * @private
   */
  _makeDecision(input, memories, reasoning) {
    // If reasoning suggests actions, use them
    if (reasoning.actions.length > 0) {
      return {
        action: reasoning.actions[0],
        confidence: 0.8,
        reasoning: reasoning.reasoning
      };
    }
    
    // No clear action from rules, use heuristic
    return {
      action: 'OBSERVE',
      confidence: 0.3,
      reasoning: [{ rule: 'default', priority: 1 }]
    };
  }

  /**
   * Update internal state
   * @private
   */
  _updateState(decision) {
    // Update cognitive load based on decision complexity
    const complexity = decision.reasoning.length;
    this.currentState.cognitiveLoad = Math.min(complexity / 10, 1.0);
    
    // Update attention
    if (decision.action !== 'OBSERVE') {
      this.currentState.attention = decision.action;
    }
  }

  /**
   * Learn from experience
   */
  learn(experience) {
    this.stats.learningEvents++;
    
    // Store in long-term memory with importance
    const importance = this._calculateLearningImportance(experience);
    this.memory.storeLongTerm(
      `experience_${Date.now()}`,
      experience,
      importance
    );
    
    // Update reasoning rules based on outcome
    if (experience.rule_id && experience.outcome !== undefined) {
      this.reasoning.learnFromOutcome(experience.rule_id, experience.outcome);
    }
    
    // Extract patterns and store as semantic knowledge
    const patterns = this._extractPatterns(experience);
    for (const pattern of patterns) {
      this.memory.storeSemantic(pattern.concept, pattern.knowledge);
    }
    
    this.emit('learned', {
      experience,
      importance,
      patterns,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate learning importance
   * @private
   */
  _calculateLearningImportance(experience) {
    let importance = 0.5;
    
    // High reward/punishment is important
    if (experience.outcome) {
      importance += Math.min(Math.abs(experience.outcome) / 100, 0.4);
    }
    
    // Rare events are important
    if (experience.rare) importance += 0.2;
    
    // Unexpected outcomes are important
    if (experience.unexpected) importance += 0.3;
    
    return Math.min(importance, 1.0);
  }

  /**
   * Extract patterns from experience
   * @private
   */
  _extractPatterns(experience) {
    const patterns = [];
    
    // Pattern: If X then Y
    if (experience.condition && experience.outcome) {
      patterns.push({
        concept: 'causation',
        knowledge: {
          condition: experience.condition,
          outcome: experience.outcome,
          confidence: 0.7
        }
      });
    }
    
    return patterns;
  }

  /**
   * Set goal
   */
  setGoal(goal) {
    this.planning.setGoal(goal);
    this.currentState.activeGoals.push(goal);
  }

  /**
   * Sleep - Consolidate memories
   */
  async sleep() {
    console.log('🧠 Cognitive Brain: Consolidating memories...');
    
    const result = this.memory.consolidate();
    
    console.log(`   Consolidated ${result.consolidated} memories`);
    
    this.emit('sleep', {
      consolidated: result.consolidated,
      timestamp: Date.now()
    });
    
    return result;
  }

  /**
   * Get cognitive status
   */
  getStatus() {
    return {
      state: { ...this.currentState },
      stats: { ...this.stats },
      memory: this.memory.getStats(),
      activeGoals: this.planning.goals.filter(g => g.status === 'ACTIVE').length,
      rulesActive: Array.from(this.reasoning.rules.values()).filter(r => r.enabled).length
    };
  }

  /**
   * Print cognitive report
   */
  printReport() {
    const status = this.getStatus();
    
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ 🧠 COGNITIVE BRAIN STATUS               │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Mode: ${status.state.mode.padEnd(32)} │`);
    console.log(`│ Cognitive Load: ${(status.state.cognitiveLoad * 100).toFixed(0)}%${' '.repeat(24)} │`);
    console.log(`│ Active Goals: ${status.activeGoals.toString().padEnd(26)} │`);
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Thought Cycles: ${status.stats.thoughtCycles.toString().padEnd(24)} │`);
    console.log(`│ Decisions Made: ${status.stats.decisions.toString().padEnd(24)} │`);
    console.log(`│ Learning Events: ${status.stats.learningEvents.toString().padEnd(23)} │`);
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Short-term Memory: ${status.memory.shortTermSize.toString().padEnd(19)} │`);
    console.log(`│ Long-term Memory: ${status.memory.longTermSize.toString().padEnd(20)} │`);
    console.log(`│ Semantic Concepts: ${status.memory.semanticConcepts.toString().padEnd(19)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');
  }
}

export default CognitiveBrain;
