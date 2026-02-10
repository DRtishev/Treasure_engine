/**
 * SWARM TRADING DEMONSTRATION
 * 
 * Live example showing the Master Orchestrator managing a swarm of
 * SuperIntelligent AI agents in a simulated trading session.
 */

import { MasterOrchestrator } from '../core/ai/master_orchestrator.mjs';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🌟 SWARM TRADING DEMONSTRATION 🌟                        ║');
console.log('║  Ultimate AI Multi-Agent Trading System                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Initialize Master Orchestrator with 5 agents
const orchestrator = new MasterOrchestrator({
  agentCount: 5,
  orchestrationMode: 'COLLABORATIVE'
});

await orchestrator.initialize();

// Simulated market state
let marketState = {
  price: 50000,
  volume: 1000,
  trend: 0.5,
  volatility: 0.2
};

// Trading session: 30 decisions
for (let i = 0; i < 30; i++) {
  console.log(`\n📊 DECISION ${i + 1}/30`);
  
  const decision = await orchestrator.collectiveDecision(marketState);
  const result = await orchestrator.executeCollectiveTrade(decision, marketState);
  
  console.log(`   Action: ${decision.action}, Outcome: ${result.outcome}`);
  
  marketState.price += (Math.random() - 0.5) * 200;
  
  if ((i + 1) % 10 === 0) {
    await orchestrator.knowledgeTransfer();
  }
}

await orchestrator.swarmReflection();
await orchestrator.evolve();
await orchestrator.shutdown();

console.log('\n✅ DEMO COMPLETE\n');
