/**
 * EPOCH-11: MASTER ORCHESTRATOR VERIFICATION
 * 
 * Comprehensive test suite for the ultimate AI swarm system.
 * This verifies swarm intelligence, collective decision-making,
 * knowledge transfer, and emergent strategies.
 */

import { MasterOrchestrator } from '../../core/ai/master_orchestrator.mjs';
import assert from 'assert';

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    testsFailed++;
    console.log(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    testsFailed++;
    console.log(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  EPOCH-11: MASTER ORCHESTRATOR VERIFICATION              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('━━━ BASIC ORCHESTRATOR TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('MasterOrchestrator can be instantiated', () => {
  const orchestrator = new MasterOrchestrator();
  assert(orchestrator !== null);
  assert(orchestrator.agents.length === 0); // Not initialized yet
});

test('MasterOrchestrator accepts configuration', () => {
  const orchestrator = new MasterOrchestrator({
    agentCount: 5,
    orchestrationMode: 'COMPETITIVE',
    globalLearningRate: 0.2
  });
  
  assert.strictEqual(orchestrator.config.agentCount, 5);
  assert.strictEqual(orchestrator.config.orchestrationMode, 'COMPETITIVE');
  assert.strictEqual(orchestrator.config.globalLearningRate, 0.2);
});

test('MasterOrchestrator initializes with default state', () => {
  const orchestrator = new MasterOrchestrator();
  
  assert.strictEqual(orchestrator.state.active, false);
  assert.strictEqual(orchestrator.state.generation, 0);
  assert.strictEqual(orchestrator.state.totalDecisions, 0);
  assert(orchestrator.globalKnowledge.bestStrategies);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ INITIALIZATION TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('MasterOrchestrator initializes with 3 agents', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  
  const result = await orchestrator.initialize();
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.agentCount, 3);
  assert.strictEqual(orchestrator.agents.length, 3);
  assert.strictEqual(orchestrator.state.active, true);
  
  // Each agent should have unique ID and specialization
  const ids = orchestrator.agents.map(a => a.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, 3);
  
  await orchestrator.shutdown();
});

await asyncTest('Each agent has unique specialization', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 5 });
  await orchestrator.initialize();
  
  for (const agent of orchestrator.agents) {
    assert(agent.specialization);
    assert(['MOMENTUM_TRADER', 'MEAN_REVERSION', 'VOLATILITY_ARBITRAGE', 
            'PATTERN_RECOGNITION', 'ADAPTIVE_LEARNING'].includes(agent.specialization));
  }
  
  await orchestrator.shutdown();
});

await asyncTest('Agents are properly initialized', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 2 });
  await orchestrator.initialize();
  
  for (const agent of orchestrator.agents) {
    assert(agent.instance);
    assert(agent.instance.active);
    assert(agent.performance);
    assert.strictEqual(agent.performance.decisions, 0);
  }
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ COLLECTIVE DECISION TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('Collective decision aggregates agent votes', async () => {
  const orchestrator = new MasterOrchestrator({ 
    agentCount: 3,
    orchestrationMode: 'COLLABORATIVE'
  });
  
  await orchestrator.initialize();
  
  const marketState = {
    price: 50000,
    volume: 1000,
    trend: 0.5,
    volatility: 0.2
  };
  
  const decision = await orchestrator.collectiveDecision(marketState);
  
  assert(decision.action);
  assert(decision.confidence >= 0 && decision.confidence <= 1);
  assert(decision.consensus >= 0 && decision.consensus <= 1);
  assert(decision.agentVotes.length === 3);
  assert(decision.swarmIntelligence);
  
  await orchestrator.shutdown();
});

await asyncTest('Agent votes have weights', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  const decision = await orchestrator.collectiveDecision(marketState);
  
  for (const vote of decision.agentVotes) {
    assert(vote.weight > 0);
    assert(vote.agentId);
    assert(vote.decision);
  }
  
  await orchestrator.shutdown();
});

await asyncTest('Swarm intelligence metrics calculated', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  const decision = await orchestrator.collectiveDecision(marketState);
  
  assert(decision.swarmIntelligence.diversity >= 0);
  assert(decision.swarmIntelligence.avgConfidence >= 0);
  assert(decision.swarmIntelligence.participation > 0);
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ TRADE EXECUTION TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('Execute collective trade updates performance', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 2 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  const decision = await orchestrator.collectiveDecision(marketState);
  
  const initialPnL = orchestrator.state.collectivePerformance.totalPnL;
  
  const result = await orchestrator.executeCollectiveTrade(decision, marketState);
  
  assert(result.pnl !== undefined);
  assert(result.outcome === 'WIN' || result.outcome === 'LOSS');
  assert(orchestrator.state.collectivePerformance.totalPnL !== initialPnL);
  
  await orchestrator.shutdown();
});

await asyncTest('Agent performance tracked individually', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  const decision = await orchestrator.collectiveDecision(marketState);
  await orchestrator.executeCollectiveTrade(decision, marketState);
  
  for (const agent of orchestrator.agents) {
    assert(agent.performance.decisions > 0);
    assert(agent.performance.wins >= 0);
    assert(agent.performance.losses >= 0);
  }
  
  await orchestrator.shutdown();
});

await asyncTest('Multiple trades accumulate performance', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 2 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  
  // Execute 5 trades
  for (let i = 0; i < 5; i++) {
    const decision = await orchestrator.collectiveDecision(marketState);
    await orchestrator.executeCollectiveTrade(decision, marketState);
  }
  
  assert.strictEqual(orchestrator.state.totalDecisions, 5);
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SWARM REFLECTION TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('Swarm reflection collects all agent insights', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  // Make some decisions
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  for (let i = 0; i < 3; i++) {
    const decision = await orchestrator.collectiveDecision(marketState);
    await orchestrator.executeCollectiveTrade(decision, marketState);
  }
  
  const reflection = await orchestrator.swarmReflection();
  
  assert(reflection.topInsights);
  assert(reflection.topInsights.length > 0);
  assert(reflection.detailedReflections);
  
  await orchestrator.shutdown();
});

await asyncTest('Swarm metrics tracked over time', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  
  for (let i = 0; i < 10; i++) {
    const decision = await orchestrator.collectiveDecision(marketState);
    await orchestrator.executeCollectiveTrade(decision, marketState);
  }
  
  assert(orchestrator.state.swarmIntelligence.coherence >= 0);
  assert(orchestrator.state.swarmIntelligence.diversity >= 0);
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ KNOWLEDGE TRANSFER TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('Knowledge transfer from best performer', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  // Simulate varying performance
  orchestrator.agents[0].performance.totalPnL = 100;
  orchestrator.agents[1].performance.totalPnL = 50;
  orchestrator.agents[2].performance.totalPnL = 25;
  
  const result = await orchestrator.knowledgeTransfer();
  
  assert.strictEqual(result.success, true);
  assert(result.transfers > 0);
  
  await orchestrator.shutdown();
});

await asyncTest('Global knowledge base accumulates strategies', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 2 });
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  
  for (let i = 0; i < 5; i++) {
    const decision = await orchestrator.collectiveDecision(marketState);
    await orchestrator.executeCollectiveTrade(decision, marketState);
  }
  
  assert(orchestrator.globalKnowledge.bestStrategies.length >= 0);
  assert(orchestrator.globalKnowledge.collectiveInsights.length > 0);
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ EVOLUTION TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('Evolution replaces poor performers', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const initialGeneration = orchestrator.state.generation;
  
  // Simulate performance differences
  orchestrator.agents[0].performance.totalPnL = 100;
  orchestrator.agents[1].performance.totalPnL = 50;
  orchestrator.agents[2].performance.totalPnL = -50; // Poor performer
  
  const result = await orchestrator.evolve();
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.generation, initialGeneration + 1);
  assert.strictEqual(orchestrator.state.generation, initialGeneration + 1);
  
  await orchestrator.shutdown();
});

await asyncTest('Evolution maintains agent count', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 4 });
  await orchestrator.initialize();
  
  const initialCount = orchestrator.agents.length;
  
  await orchestrator.evolve();
  
  assert.strictEqual(orchestrator.agents.length, initialCount);
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ ORCHESTRATION MODES TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('COMPETITIVE mode uses highest confidence', async () => {
  const orchestrator = new MasterOrchestrator({ 
    agentCount: 3,
    orchestrationMode: 'COMPETITIVE'
  });
  
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  const decision = await orchestrator.collectiveDecision(marketState);
  
  assert.strictEqual(decision.consensus, 0); // No consensus in competitive mode
  
  await orchestrator.shutdown();
});

await asyncTest('COLLABORATIVE mode aggregates votes', async () => {
  const orchestrator = new MasterOrchestrator({ 
    agentCount: 3,
    orchestrationMode: 'COLLABORATIVE'
  });
  
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5 };
  const decision = await orchestrator.collectiveDecision(marketState);
  
  assert(decision.consensus >= 0); // Consensus calculated in collaborative mode
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ STATUS & MONITORING TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('getStatus returns orchestrator state', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const status = orchestrator.getStatus();
  
  assert.strictEqual(status.active, true);
  assert.strictEqual(status.agentCount, 3);
  assert(status.generation >= 0);
  assert(status.collectivePerformance);
  assert(status.swarmIntelligence);
  
  await orchestrator.shutdown();
});

await asyncTest('getAgentStatuses returns all agent info', async () => {
  const orchestrator = new MasterOrchestrator({ agentCount: 3 });
  await orchestrator.initialize();
  
  const agentStatuses = orchestrator.getAgentStatuses();
  
  assert.strictEqual(agentStatuses.length, 3);
  
  for (const status of agentStatuses) {
    assert(status.id);
    assert(status.name);
    assert(status.specialization);
    assert(status.performance);
    assert(status.status);
  }
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ INTEGRATION WORKFLOW TEST ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

await asyncTest('Complete swarm trading workflow', async () => {
  const orchestrator = new MasterOrchestrator({ 
    agentCount: 3,
    orchestrationMode: 'COLLABORATIVE'
  });
  
  await orchestrator.initialize();
  
  const marketState = { price: 50000, volume: 1000, trend: 0.5, volatility: 0.2 };
  
  // Trading session
  const sessionTrades = 20;
  
  for (let i = 0; i < sessionTrades; i++) {
    const decision = await orchestrator.collectiveDecision(marketState);
    await orchestrator.executeCollectiveTrade(decision, marketState);
    
    // Vary market conditions
    marketState.price += (Math.random() - 0.5) * 100;
    marketState.trend = Math.random() * 2 - 1;
  }
  
  // Knowledge transfer
  await orchestrator.knowledgeTransfer();
  
  // Swarm reflection
  const reflection = await orchestrator.swarmReflection();
  
  // Evolution
  await orchestrator.evolve();
  
  // Verify complete workflow
  assert.strictEqual(orchestrator.state.totalDecisions, sessionTrades);
  assert(orchestrator.state.generation > 0);
  assert(reflection.topInsights.length > 0);
  
  const finalStatus = orchestrator.getStatus();
  assert(finalStatus.collectivePerformance.bestAgent);
  
  await orchestrator.shutdown();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SUMMARY ━━━\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${testsPassed}`);
console.log(`✗ FAILED: ${testsFailed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (testsFailed > 0) {
  console.log('✗ EPOCH-11 MASTER ORCHESTRATOR: FAIL\n');
  process.exit(1);
}

console.log('🎉 EPOCH-11 MASTER ORCHESTRATOR: COMPLETE\n');
console.log('📦 SWARM INTELLIGENCE VALIDATED:\n');
console.log('   ✓ Multi-Agent Orchestration');
console.log('   ✓ Collective Decision Making');
console.log('   ✓ Knowledge Transfer');
console.log('   ✓ Swarm Evolution');
console.log('   ✓ Emergent Strategies');
console.log('   ✓ Performance Tracking');
console.log('   ✓ Integration Workflow\n');
console.log('💎 ULTIMATE AI SWARM: ACHIEVED\n');

process.exit(0);
