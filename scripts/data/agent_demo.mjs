#!/usr/bin/env node
// scripts/data/agent_demo.mjs
// Autonomous Data Agent Live Demonstration
// Shows intelligent decision-making, self-healing, and confidence scoring

import { DataAgent, STATES } from './DataAgent.mjs';

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_DURATION = 60; // seconds

function formatPrice(price) {
  return price ? parseFloat(price).toFixed(2) : 'N/A';
}

function formatConfidence(conf) {
  return conf ? (conf * 100).toFixed(1) + '%' : 'N/A';
}

function formatState(state) {
  const colors = {
    [STATES.INITIALIZING]: '\x1b[33m',      // Yellow
    [STATES.WEBSOCKET_PRIMARY]: '\x1b[32m', // Green
    [STATES.REST_FALLBACK]: '\x1b[36m',     // Cyan
    [STATES.HYBRID]: '\x1b[35m',            // Magenta
    [STATES.OFFLINE]: '\x1b[31m'            // Red
  };
  const reset = '\x1b[0m';
  const color = colors[state] || '';
  return `${color}${state}${reset}`;
}

function formatTimestamp() {
  return new Date().toISOString().split('T')[1].split('.')[0];
}

async function main() {
  const args = process.argv.slice(2);
  const symbol = (args[0] || DEFAULT_SYMBOL).toUpperCase();
  const duration = parseInt(args[1] || DEFAULT_DURATION, 10);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 AUTONOMOUS DATA AGENT DEMONSTRATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Symbol:      ${symbol}`);
  console.log(`Duration:    ${duration}s`);
  console.log(`Mode:        AUTONOMOUS (self-healing enabled)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🧠 AGENT FEATURES:');
  console.log('   ✓ Intelligent source selection');
  console.log('   ✓ Price confidence scoring');
  console.log('   ✓ Automatic fallback (WebSocket → REST)');
  console.log('   ✓ Self-healing on failures');
  console.log('   ✓ Real-time decision logging');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const agent = new DataAgent({
    symbol,
    verbose: process.env.AGENT_VERBOSE === '1',
    autonomous: true,
    autoRecovery: true
  });

  let priceUpdateCount = 0;
  let stateChangeCount = 0;
  let healthCheckCount = 0;
  const startTime = Date.now();

  // Event: Agent initialized
  agent.on('initialized', ({ state }) => {
    console.log(`✓ Agent initialized in ${formatState(state)} mode`);
    console.log('');
    console.log('Time       State              Price       Conf    Action      Source    Age');
    console.log('──────────────────────────────────────────────────────────────────────────────────');
  });

  // Event: State change (autonomous decision)
  agent.on('state_change', (transition) => {
    stateChangeCount++;
    const { from, to, reason } = transition;
    console.log('');
    console.log(`⚡ STATE TRANSITION: ${formatState(from)} → ${formatState(to)}`);
    console.log(`   Reason: ${reason}`);
    console.log('');
  });

  // Event: Price update (with confidence)
  agent.on('price_update', (priceData) => {
    priceUpdateCount++;

    const {
      price,
      confidence,
      confidence_level,
      recommendation,
      metadata
    } = priceData;

    const timestamp = formatTimestamp();
    const state = formatState(agent.state).padEnd(25);
    const priceStr = formatPrice(price).padStart(10);
    const confStr = formatConfidence(confidence).padStart(7);
    const action = recommendation.padEnd(11);
    const source = metadata.source.padEnd(9);
    const age = `${metadata.age_ms}ms`.padEnd(8);

    // Visual indicator for confidence level
    let indicator = '';
    if (confidence >= 0.9) indicator = '✓';
    else if (confidence >= 0.7) indicator = '~';
    else if (confidence >= 0.5) indicator = '⚠';
    else indicator = '✗';

    console.log(
      `${timestamp}  ${state} ${priceStr}  ${indicator} ${confStr}  ${action} ${source} ${age}`
    );
  });

  // Event: Health check
  agent.on('health_check', (health) => {
    healthCheckCount++;
    
    if (process.env.AGENT_VERBOSE === '1') {
      console.log('');
      console.log(`💓 Health Check #${healthCheckCount}`);
      console.log(`   WebSocket: connected=${health.websocket.connected}, stale=${health.websocket.stale}`);
      console.log(`   REST: circuit=${health.rest.circuitState}, failures=${health.rest.failureCount}`);
      console.log('');
    }
  });

  // Event: Initialization failed
  agent.on('initialization_failed', (err) => {
    console.error('');
    console.error('✗ Agent initialization failed:', err.message);
    console.error('   Entering degraded mode...');
    console.error('');
  });

  try {
    // Initialize autonomous agent
    console.log('🚀 Initializing autonomous agent...');
    console.log('');
    await agent.initialize();

    // Run for specified duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000));

    // Graceful shutdown
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 AGENT PERFORMANCE REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const status = agent.getStatus();
    const latestPrice = agent.getPrice();

    console.log(`Duration:           ${elapsed}s`);
    console.log(`Price updates:      ${priceUpdateCount}`);
    console.log(`State transitions:  ${stateChangeCount}`);
    console.log(`Health checks:      ${healthCheckCount}`);
    console.log(`Decisions made:     ${status.decisionCount}`);
    console.log(`Final state:        ${formatState(status.state)}`);
    console.log(`Avg confidence:     ${formatConfidence(status.confidenceAvg)}`);
    
    if (latestPrice) {
      console.log('');
      console.log('Latest Price Data:');
      console.log(`  Price:            ${formatPrice(latestPrice.price)}`);
      console.log(`  Confidence:       ${formatConfidence(latestPrice.confidence)} (${latestPrice.confidence_level})`);
      console.log(`  Tradeable:        ${latestPrice.tradeable ? 'YES' : 'NO'}`);
      console.log(`  Recommendation:   ${latestPrice.recommendation}`);
      console.log(`  Source:           ${latestPrice.metadata.source}`);
      console.log(`  Age:              ${latestPrice.metadata.age_ms}ms`);
    }

    console.log('');
    console.log('WebSocket Status:');
    console.log(`  Connected:        ${status.websocket.connected}`);
    console.log(`  Messages:         ${status.websocket.messageCount}`);
    console.log(`  Data stale:       ${status.websocket.isStale}`);

    console.log('');
    console.log('REST Status:');
    console.log(`  Circuit:          ${status.rest.circuitState}`);
    console.log(`  Failures:         ${status.rest.failureCount}`);
    console.log(`  Requests/min:     ${status.rest.requestsInLastMinute}`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await agent.shutdown();

    console.log('');
    console.log('✓ Agent demonstration complete');
    console.log('');
    console.log('💡 KEY INSIGHTS:');
    console.log('   - Autonomous decision-making (no human input)');
    console.log('   - Confidence-based source selection');
    console.log('   - Self-healing on failures');
    console.log('   - Real-time adaptability');
    console.log('   - Production-ready reliability');
    console.log('');

    process.exit(0);

  } catch (err) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ AGENT DEMO FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${err.message}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');

    if (err.message.includes('EAI_AGAIN') || err.message.includes('ENOTFOUND')) {
      console.error('⚠  Network access required for agent demo');
      console.error('⚠  This is expected in sandbox environments');
      console.error('⚠  Run this demo in an environment with network access');
      console.error('');
      console.error('📝 What the agent WOULD do with network:');
      console.error('   1. Connect to WebSocket (real-time prices)');
      console.error('   2. Calculate confidence scores');
      console.error('   3. Make autonomous decisions');
      console.error('   4. Self-heal on failures');
      console.error('   5. Fall back to REST if needed');
    }

    await agent.shutdown().catch(() => {});
    process.exit(1);
  }
}

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('');
  console.log('⚠  Interrupted. Shutting down agent...');
  process.exit(0);
});

main();
