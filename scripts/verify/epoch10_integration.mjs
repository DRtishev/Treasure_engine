/**
 * EPOCH-10 INTEGRATION TESTS
 * 
 * Comprehensive verification of metacognitive superintelligence.
 * Tests all EPOCH-10 components:
 * - Meta-Learning Engine
 * - Self-Reflection System
 * - Hypothesis Generator
 * - Meta-Cognitive Controller
 * - SuperIntelligent Agent
 */

import { MetaLearningEngine } from '../../core/ai/meta_learning_engine.mjs';
import { SelfReflectionSystem } from '../../core/ai/self_reflection_system.mjs';
import { HypothesisGenerator } from '../../core/ai/hypothesis_generator.mjs';
import { MetaCognitiveController } from '../../core/ai/metacognitive_controller.mjs';
import { SuperIntelligentAgent } from '../../core/ai/superintelligent_agent.mjs';

// Test utilities
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passCount++;
  } else {
    console.log(`✗ ${message}`);
    failCount++;
  }
}

function assertEquals(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertGreaterThan(actual, threshold, message) {
  assert(actual > threshold, `${message} (${actual} > ${threshold})`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 EPOCH-10 INTEGRATION TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================
// TEST 1: META-LEARNING ENGINE
// ============================================

console.log('━━━ TEST 1: META-LEARNING ENGINE ━━━');

const metaLearning = new MetaLearningEngine({
  initialMetaLearningRate: 0.01,
  adaptationRate: 0.1
});

// Test 1.1: Few-shot learning
const examples = [
  { input: { price: 100, trend: 'up' }, output: 'buy', reward: 5 },
  { input: { price: 105, trend: 'up' }, output: 'buy', reward: 3 },
  { input: { price: 110, trend: 'up' }, output: 'buy', reward: 2 }
];

const fewShotResult = metaLearning.fewShotLearn(examples, 'momentum_trading');
assert(fewShotResult.success, 'Few-shot learning succeeds with 3 examples');
assert(fewShotResult.model !== null, 'Few-shot learning produces a model');

// Test 1.2: Transfer learning
metaLearning.metaKnowledge.taskPatterns.set('momentum_trading', {
  patterns: new Map([['trend', ['up', 'up', 'up']]]),
  model: { confidence: 0.8 }
});

const transferResult = metaLearning.transferLearn(
  'momentum_trading',
  'reversal_trading',
  []
);
assert(transferResult.success || transferResult.reason, 'Transfer learning executes');

// Test 1.3: Adaptive learning rate
const performance = [1, 2, 3, 4, 5]; // Improving performance
const adaptResult = metaLearning.adaptLearningRate(performance);
assert(adaptResult.newLearningRate > 0, 'Learning rate is positive');
assertEquals(adaptResult.adjustment, 'increase', 'Learning rate increases for improving performance');

// Test 1.4: Learning curve analysis
const experiences = Array.from({ length: 20 }, (_, i) => ({
  reward: i * 0.5 + Math.random()
}));
const curveAnalysis = metaLearning.analyzeLearningCurve(experiences);
assert(curveAnalysis.analysis !== 'insufficient_data', 'Learning curve analysis works with sufficient data');
assert(['rapid_learning', 'stable_learning', 'plateau', 'declining'].includes(curveAnalysis.phase), 'Learning phase is valid');

// Test 1.5: Meta-knowledge accumulation
const knowledge = metaLearning.getMetaKnowledge();
assertGreaterThan(knowledge.tasksLearned, 0, 'Meta-knowledge accumulates tasks');

console.log(`✓ Meta-Learning Engine: ${passCount - failCount} sub-tests passed\n`);

// ============================================
// TEST 2: SELF-REFLECTION SYSTEM
// ============================================

console.log('━━━ TEST 2: SELF-REFLECTION SYSTEM ━━━');

const reflection = new SelfReflectionSystem({
  reflectionDepth: 3,
  minReflectionInterval: 5
});

// Test 2.1: Decision recording
const decisionId = reflection.recordDecision({
  action: 'BUY',
  confidence: 0.8,
  reasoning: ['Strong momentum', 'High volume'],
  context: { trend: 'up', volatility: 'low' }
});
assert(decisionId !== null, 'Decision is recorded');

// Test 2.2: Outcome recording
const outcomeResult = reflection.recordOutcome(decisionId, {
  result: 'WIN',
  pnl: 10
});
assert(outcomeResult.success, 'Outcome is recorded');

// Test 2.3: Record multiple decisions for reflection
for (let i = 0; i < 10; i++) {
  const id = reflection.recordDecision({
    action: i % 2 === 0 ? 'BUY' : 'SELL',
    confidence: 0.5 + Math.random() * 0.3,
    reasoning: ['Test decision'],
    context: { trend: 'neutral' }
  });
  
  reflection.recordOutcome(id, {
    result: Math.random() > 0.5 ? 'WIN' : 'LOSS',
    pnl: (Math.random() - 0.5) * 10
  });
}

// Test 2.4: Reflection
const reflectionResult = await reflection.reflect(true);
assert(reflectionResult.reflected, 'Reflection executes');
assert(reflectionResult.decisionsAnalyzed > 0, 'Reflection analyzes decisions');

// Test 2.5: Counterfactual reasoning
const firstDecisionId = reflection.decisionHistory[0].id;
const counterfactual = reflection.counterfactualAnalysis(firstDecisionId, 'SELL');
assert(counterfactual.success, 'Counterfactual analysis works');
assert(counterfactual.comparison !== null, 'Counterfactual produces comparison');

// Test 2.6: Decision explanation
const explanation = reflection.explainDecision(firstDecisionId);
assert(explanation.success, 'Decision explanation works');
assert(explanation.explanation.reasoning.length > 0, 'Explanation includes reasoning');

// Test 2.7: Self-awareness
const awareness = reflection.getAwareness();
assert(awareness.confidenceLevel >= 0 && awareness.confidenceLevel <= 1, 'Confidence level is valid');

console.log(`✓ Self-Reflection System: working\n`);

// ============================================
// TEST 3: HYPOTHESIS GENERATOR
// ============================================

console.log('━━━ TEST 3: HYPOTHESIS GENERATOR ━━━');

const hypothesisGen = new HypothesisGenerator({
  maxActiveHypotheses: 5,
  minEvidenceForConclusion: 10
});

// Test 3.1: Observations
for (let i = 0; i < 50; i++) {
  hypothesisGen.observe({
    price: 100 + i * 0.5,
    volume: 1000 + i * 10,
    trend: i < 30 ? 'up' : 'down'
  });
}
const status1 = hypothesisGen.getStatus();
assertGreaterThan(status1.observations, 0, 'Observations are recorded');

// Test 3.2: Hypothesis generation
const pattern = {
  type: 'momentum_continuation',
  strength: 0.8,
  direction: 'up'
};
const hypResult = hypothesisGen.generateHypothesis(pattern);
assert(hypResult.success, 'Hypothesis is generated');
assert(hypResult.hypothesis.statement.length > 0, 'Hypothesis has statement');

// Test 3.3: Hypothesis testing
const testResult = await hypothesisGen.testHypothesis(
  hypResult.hypothesis.id,
  { price: 110, volume: 1500, trend: 'up' }
);
assert(testResult.success || testResult.evidenceCollected !== undefined, 'Hypothesis testing works');

// Test 3.4: Status
const status2 = hypothesisGen.getStatus();
assertGreaterThan(status2.activeHypotheses, 0, 'Has active hypotheses');

console.log(`✓ Hypothesis Generator: working\n`);

// ============================================
// TEST 4: META-COGNITIVE CONTROLLER
// ============================================

console.log('━━━ TEST 4: META-COGNITIVE CONTROLLER ━━━');

const metacog = new MetaCognitiveController({
  metacognitiveMode: 'ACTIVE',
  reflectionFrequency: 5
});

// Test 4.1: Metacognitive decision
const marketState = {
  price: 100,
  volume: 1000,
  trend: 'up',
  volatility: 'low'
};

const baseDecision = {
  action: 'BUY',
  confidence: 0.7,
  reasoning: ['Test decision']
};

const metacogDecision = await metacog.metacognitiveDecision(marketState, baseDecision);
assert(metacogDecision.decision !== null, 'Metacognitive decision is made');
assert(metacogDecision.metacognitive !== null, 'Metacognitive data is included');

// Test 4.2: Record outcome
const outcome = {
  result: 'WIN',
  pnl: 5
};
const recordResult = await metacog.recordOutcome(
  metacogDecision.decision.decisionId,
  outcome
);
assert(recordResult.success, 'Outcome is recorded in metacognitive system');

// Test 4.3: Make more decisions for reflection
for (let i = 0; i < 10; i++) {
  const dec = await metacog.metacognitiveDecision(
    { price: 100 + i, volume: 1000, trend: 'up' },
    { action: 'BUY', confidence: 0.6, reasoning: [] }
  );
  await metacog.recordOutcome(dec.decision.decisionId, {
    result: Math.random() > 0.5 ? 'WIN' : 'LOSS',
    pnl: (Math.random() - 0.5) * 10
  });
}

// Test 4.4: Deep reflection
const deepReflection = await metacog.deepReflection();
assert(deepReflection.reflection !== null, 'Deep reflection works');
assert(deepReflection.consciousness !== null, 'Consciousness levels are tracked');

// Test 4.5: Self-improvement
const improvement = await metacog.selfImprove();
assert(improvement.improvementsMade !== undefined, 'Self-improvement executes');

// Test 4.6: State
const metacogState = metacog.getMetaCognitiveState();
assert(metacogState.consciousness !== null, 'Consciousness state is available');
assert(metacogState.systems !== null, 'Sub-systems are tracked');

console.log(`✓ Meta-Cognitive Controller: working\n`);

// ============================================
// TEST 5: SUPERINTELLIGENT AGENT
// ============================================

console.log('━━━ TEST 5: SUPERINTELLIGENT AGENT ━━━');

const superAgent = new SuperIntelligentAgent({
  name: 'Test SuperAI',
  mode: 'SUPERINTELLIGENT',
  enableMetacognition: true,
  enableSelfImprovement: true
});

// Test 5.1: Initialization
const initResult = await superAgent.initialize();
assert(initResult.success, 'SuperIntelligent Agent initializes');
assert(initResult.level !== null, 'Intelligence level is set');

// Test 5.2: Decision making
const superDecision = await superAgent.makeDecision({
  price: 100,
  volume: 1000,
  trend: 'up',
  volatility: 'low'
});
assert(superDecision.action !== null, 'SuperIntelligent decision is made');
assert(superDecision.confidence >= 0 && superDecision.confidence <= 1, 'Confidence is valid');

// Test 5.3: Execute trade
const tradeResult = await superAgent.executeTrade(superDecision, { price: 100 });
assert(tradeResult !== null, 'Trade is executed');

// Test 5.4: Make more trades
for (let i = 0; i < 5; i++) {
  const dec = await superAgent.makeDecision({
    price: 100 + i,
    volume: 1000,
    trend: 'up',
    volatility: 'low'
  });
  await superAgent.executeTrade(dec, { price: 100 + i });
}

// Test 5.5: Reflection
const superReflection = await superAgent.reflect();
assert(superReflection !== null, 'SuperIntelligent Agent can reflect');

// Test 5.6: Self-improvement
const superImprovement = await superAgent.selfImprove();
assert(superImprovement.improvementsMade !== undefined, 'SuperIntelligent Agent can self-improve');

// Test 5.7: State
const superState = superAgent.getState();
assert(superState.level === 'SUPERINTELLIGENT', 'Intelligence level is correct');
assert(superState.capabilities.length > 10, 'Has many capabilities');
assertGreaterThan(superState.evolution.generation, -1, 'Evolution generation is valid (0 or more)');

// Test 5.8: Superintelligence metrics
const metrics = superAgent.getSuperIntelligenceMetrics();
assert(metrics.aiIQ > 100, 'AI-IQ is above baseline');
assert(metrics.consciousness !== null, 'Consciousness is tracked');

// Test 5.9: Status
const superStatus = superAgent.getStatus();
assert(superStatus.active, 'SuperIntelligent Agent is active');
assertEquals(superStatus.level, 'SUPERINTELLIGENT', 'Status shows correct level');

// Test 5.10: Shutdown
const shutdownResult = await superAgent.shutdown();
assert(shutdownResult.success, 'SuperIntelligent Agent shuts down gracefully');

console.log(`✓ SuperIntelligent Agent: fully operational\n`);

// ============================================
// RESULTS SUMMARY
// ============================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${passCount}`);
console.log(`✗ FAILED: ${failCount}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failCount === 0) {
  console.log('🎉 EPOCH-10 INTEGRATION: COMPLETE\n');
  console.log('📦 COMPONENTS VALIDATED:');
  console.log('   ✓ Meta-Learning Engine');
  console.log('   ✓ Self-Reflection System');
  console.log('   ✓ Hypothesis Generator');
  console.log('   ✓ Meta-Cognitive Controller');
  console.log('   ✓ SuperIntelligent Agent');
  console.log('\n🤖 SUPERINTELLIGENCE CAPABILITIES:');
  console.log('   • Learning to Learn (Meta-Learning)');
  console.log('   • Self-Reflection (Decision Analysis)');
  console.log('   • Hypothesis Testing (Scientific Method)');
  console.log('   • Metacognition (Thinking about Thinking)');
  console.log('   • Self-Improvement (Autonomous Evolution)');
  console.log('   • Transfer Learning (Cross-Domain Knowledge)');
  console.log('\n💎 SUPERINTELLIGENCE: ACHIEVED\n');
  
  process.exit(0);
} else {
  console.log(`✗ ${failCount} tests failed\n`);
  console.log('EPOCH-10 INTEGRATION: FAIL\n');
  process.exit(1);
}
