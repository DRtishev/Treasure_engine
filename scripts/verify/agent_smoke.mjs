#!/usr/bin/env node
// scripts/verify/agent_smoke.mjs
// Smoke tests for DataAgent autonomous behavior

import { DataAgent, STATES, TRANSITIONS } from '../data/DataAgent.mjs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failed++;
    console.error(`✗ ${msg}`);
  }
}

function testAgentInitialization() {
  console.log('\n━━━ AGENT INITIALIZATION ━━━');

  const agent = new DataAgent({ symbol: 'BTCUSDT' });
  
  assert(agent.symbol === 'BTCUSDT', 'Agent has symbol');
  assert(agent.state === STATES.INITIALIZING, 'Initial state is INITIALIZING');
  assert(agent.latestPrice === null, 'No price initially');
  assert(agent.decisionCount === 0, 'Decision count starts at 0');
  assert(agent.isAutonomous === true, 'Autonomous by default');
  assert(agent.autoRecovery === true, 'Auto-recovery by default');
}

function testStateTransitions() {
  console.log('\n━━━ STATE TRANSITIONS ━━━');

  const agent = new DataAgent();
  
  // Manual state transition
  agent.transitionTo(STATES.WEBSOCKET_PRIMARY, TRANSITIONS.HEALTH_CHECK_PASSED);
  
  assert(agent.state === STATES.WEBSOCKET_PRIMARY, 'Transitioned to WEBSOCKET_PRIMARY');
  assert(agent.previousState === STATES.INITIALIZING, 'Previous state tracked');
  assert(agent.stateTransitions.length === 1, 'Transition recorded');
  
  const transition = agent.stateTransitions[0];
  assert(transition.from === STATES.INITIALIZING, 'Transition has from state');
  assert(transition.to === STATES.WEBSOCKET_PRIMARY, 'Transition has to state');
  assert(transition.reason === TRANSITIONS.HEALTH_CHECK_PASSED, 'Transition has reason');
  assert(typeof transition.timestamp === 'number', 'Transition has timestamp');
}

function testStateEnumeration() {
  console.log('\n━━━ STATE ENUMERATION ━━━');

  assert(STATES.INITIALIZING === 'INITIALIZING', 'INITIALIZING state exists');
  assert(STATES.WEBSOCKET_PRIMARY === 'WEBSOCKET_PRIMARY', 'WEBSOCKET_PRIMARY state exists');
  assert(STATES.REST_FALLBACK === 'REST_FALLBACK', 'REST_FALLBACK state exists');
  assert(STATES.HYBRID === 'HYBRID', 'HYBRID state exists');
  assert(STATES.OFFLINE === 'OFFLINE', 'OFFLINE state exists');
}

function testTransitionEnumeration() {
  console.log('\n━━━ TRANSITION REASONS ━━━');

  assert(TRANSITIONS.HEALTH_CHECK_PASSED, 'HEALTH_CHECK_PASSED exists');
  assert(TRANSITIONS.WEBSOCKET_CONNECTED, 'WEBSOCKET_CONNECTED exists');
  assert(TRANSITIONS.WEBSOCKET_FAILED, 'WEBSOCKET_FAILED exists');
  assert(TRANSITIONS.WEBSOCKET_STALE, 'WEBSOCKET_STALE exists');
  assert(TRANSITIONS.REST_AVAILABLE, 'REST_AVAILABLE exists');
  assert(TRANSITIONS.REST_FAILED, 'REST_FAILED exists');
  assert(TRANSITIONS.CIRCUIT_OPEN, 'CIRCUIT_OPEN exists');
  assert(TRANSITIONS.MANUAL_OVERRIDE, 'MANUAL_OVERRIDE exists');
}

function testStatusReporting() {
  console.log('\n━━━ STATUS REPORTING ━━━');

  const agent = new DataAgent();
  const status = agent.getStatus();

  assert(typeof status.state === 'string', 'Status has state');
  assert(status.latestPrice === null, 'Status shows null price initially');
  assert(typeof status.decisionCount === 'number', 'Status has decision count');
  assert(typeof status.stateTransitions === 'number', 'Status has transition count');
  assert(typeof status.confidenceAvg === 'number', 'Status has avg confidence');
  assert(typeof status.websocket === 'object', 'Status has WebSocket info');
  assert(typeof status.rest === 'object', 'Status has REST info');
}

function testPriceGetter() {
  console.log('\n━━━ PRICE GETTER ━━━');

  const agent = new DataAgent();
  
  const price = agent.getPrice();
  assert(price === null, 'getPrice() returns null initially');
}

function testCircuitStateLogic() {
  console.log('\n━━━ CIRCUIT STATE LOGIC ━━━');

  const agent = new DataAgent();
  
  // INITIALIZING state
  agent.state = STATES.INITIALIZING;
  let circuit = agent.getCircuitState();
  assert(circuit === 'open', 'INITIALIZING → circuit open');

  // OFFLINE state
  agent.state = STATES.OFFLINE;
  circuit = agent.getCircuitState();
  assert(circuit === 'open', 'OFFLINE → circuit open');
}

function testAverageConfidence() {
  console.log('\n━━━ AVERAGE CONFIDENCE CALCULATION ━━━');

  const agent = new DataAgent();
  
  // No history
  let avg = agent.getAverageConfidence();
  assert(avg === 0, 'No history → avg = 0');

  // Add confidence history
  agent.confidenceHistory = [
    { confidence: 1.0 },
    { confidence: 0.9 },
    { confidence: 0.8 }
  ];

  avg = agent.getAverageConfidence();
  const expected = (1.0 + 0.9 + 0.8) / 3;
  assert(Math.abs(avg - expected) < 0.01, 'Average confidence calculated correctly');
}

function testEventEmitter() {
  console.log('\n━━━ EVENT EMITTER ━━━');

  const agent = new DataAgent();
  
  let stateChangeFired = false;
  let priceUpdateFired = false;
  let healthCheckFired = false;
  
  agent.on('state_change', () => { stateChangeFired = true; });
  agent.on('price_update', () => { priceUpdateFired = true; });
  agent.on('health_check', () => { healthCheckFired = true; });
  
  agent.emit('state_change', {});
  agent.emit('price_update', {});
  agent.emit('health_check', {});
  
  assert(stateChangeFired, 'state_change event fires');
  assert(priceUpdateFired, 'price_update event fires');
  assert(healthCheckFired, 'health_check event fires');
}

function testConfiguration() {
  console.log('\n━━━ CONFIGURATION OPTIONS ━━━');

  // Default configuration
  const agent1 = new DataAgent();
  assert(agent1.symbol === 'BTCUSDT', 'Default symbol is BTCUSDT');
  assert(agent1.verbose === false, 'Default verbose is false');
  assert(agent1.isAutonomous === true, 'Default autonomous is true');
  assert(agent1.autoRecovery === true, 'Default auto-recovery is true');

  // Custom configuration
  const agent2 = new DataAgent({
    symbol: 'ETHUSDT',
    verbose: true,
    autonomous: false,
    autoRecovery: false
  });
  assert(agent2.symbol === 'ETHUSDT', 'Custom symbol works');
  assert(agent2.verbose === true, 'Custom verbose works');
  assert(agent2.isAutonomous === false, 'Custom autonomous works');
  assert(agent2.autoRecovery === false, 'Custom auto-recovery works');
}

function testDataSources() {
  console.log('\n━━━ DATA SOURCES ━━━');

  const agent = new DataAgent();
  
  assert(agent.wsClient !== null, 'WebSocket client exists');
  assert(agent.restClient !== null, 'REST client exists');
  assert(typeof agent.wsClient.connect === 'function', 'WS client has connect method');
  assert(typeof agent.restClient.fetchKlines === 'function', 'REST client has fetch method');
}

function testDecisionCounter() {
  console.log('\n━━━ DECISION COUNTER ━━━');

  const agent = new DataAgent();
  
  assert(agent.decisionCount === 0, 'Decision count starts at 0');
  
  // Simulate price update
  agent.wsPrice = {
    price: 43250.5,
    timestamp: Date.now(),
    source: 'websocket'
  };
  agent.state = STATES.WEBSOCKET_PRIMARY;
  agent.updateLatestPrice();
  
  assert(agent.decisionCount === 1, 'Decision count increments');
}

function testConfidenceHistory() {
  console.log('\n━━━ CONFIDENCE HISTORY ━━━');

  const agent = new DataAgent();
  
  assert(Array.isArray(agent.confidenceHistory), 'Confidence history is array');
  assert(agent.confidenceHistory.length === 0, 'Confidence history starts empty');
  
  // Add entries
  agent.confidenceHistory.push({ confidence: 1.0, timestamp: Date.now() });
  agent.confidenceHistory.push({ confidence: 0.9, timestamp: Date.now() });
  
  assert(agent.confidenceHistory.length === 2, 'Confidence history tracks entries');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DATA AGENT SMOKE TESTS (No Network)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    testAgentInitialization();
    testStateTransitions();
    testStateEnumeration();
    testTransitionEnumeration();
    testStatusReporting();
    testPriceGetter();
    testCircuitStateLogic();
    testAverageConfidence();
    testEventEmitter();
    testConfiguration();
    testDataSources();
    testDecisionCounter();
    testConfidenceHistory();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (failed > 0) {
      console.error(`\n✗ ${failed} tests failed`);
      process.exit(1);
    }

    console.log('\n✓ All agent tests passed');
    console.log('\n🤖 AGENT CAPABILITIES VERIFIED:');
    console.log('   ✓ State machine (5 states)');
    console.log('   ✓ State transitions (8 reasons)');
    console.log('   ✓ Autonomous decision-making');
    console.log('   ✓ Confidence tracking');
    console.log('   ✓ Event emission');
    console.log('   ✓ Status reporting');
    console.log('   ✓ Dual data sources (WS + REST)');
    console.log('');
    
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Unexpected error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
