#!/usr/bin/env node
// scripts/verify/confidence_score.test.mjs
// Smoke tests for Price Confidence Score calculation

import { PriceConfidence } from '../data/PriceConfidence.mjs';

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

function testWebSocketScoring() {
  console.log('\n━━━ WEBSOCKET CONFIDENCE SCORING ━━━');

  // Perfect: <1s
  let conf = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: 500,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf === 1.0, '<1s WebSocket = 1.0 (PERFECT)');

  // Excellent: 1-3s
  conf = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: 2000,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf === 0.9, '1-3s WebSocket = 0.9 (EXCELLENT)');

  // Good: 3-5s
  conf = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: 4000,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf === 0.7, '3-5s WebSocket = 0.7 (GOOD)');

  // Stale: >=5s
  conf = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: 6000,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf === 0.5, '>=5s WebSocket = 0.5 (STALE)');
}

function testRestScoring() {
  console.log('\n━━━ REST CONFIDENCE SCORING ━━━');

  const conf = PriceConfidence.calculate({
    source: 'rest',
    age_ms: 1000,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf === 0.6, 'REST = 0.6 (ACCEPTABLE)');
}

function testCacheScoring() {
  console.log('\n━━━ CACHE CONFIDENCE SCORING ━━━');

  // Fresh cache (1s old)
  let conf = PriceConfidence.calculate({
    source: 'cache',
    age_ms: 1000,
    connected: false,
    circuit_state: 'open'
  });
  // 0.3 * (1 - 1000/60000) = 0.3 * 0.9833 = 0.295
  assert(conf > 0.29 && conf < 0.30, 'Fresh cache (1s) degrades slightly (~0.295)');

  // Old cache (30s)
  conf = PriceConfidence.calculate({
    source: 'cache',
    age_ms: 30000,
    connected: false,
    circuit_state: 'open'
  });
  // 0.3 * (1 - 30000/60000) = 0.3 * 0.5 = 0.15
  assert(conf >= 0.14 && conf <= 0.16, 'Old cache (30s) degrades to ~0.15');

  // Very old cache (60s)
  conf = PriceConfidence.calculate({
    source: 'cache',
    age_ms: 60000,
    connected: false,
    circuit_state: 'open'
  });
  assert(conf === 0.0, 'Very old cache (60s) = 0.0');
}

function testCircuitBreakerOpen() {
  console.log('\n━━━ CIRCUIT BREAKER SCENARIOS ━━━');

  // Circuit open = no confidence
  const conf = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: 100,
    connected: true,
    circuit_state: 'open'
  });
  assert(conf === 0.0, 'Circuit open = 0.0 (OFFLINE)');

  // Not connected = no confidence
  const conf2 = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: 100,
    connected: false,
    circuit_state: 'closed'
  });
  assert(conf2 === 0.0, 'Not connected = 0.0');
}

function testTradeableThreshold() {
  console.log('\n━━━ TRADEABLE THRESHOLD ━━━');

  assert(PriceConfidence.isTradeable(1.0) === true, '1.0 is tradeable');
  assert(PriceConfidence.isTradeable(0.9) === true, '0.9 is tradeable');
  assert(PriceConfidence.isTradeable(0.8) === true, '0.8 is tradeable (threshold)');
  assert(PriceConfidence.isTradeable(0.7) === false, '0.7 is NOT tradeable');
  assert(PriceConfidence.isTradeable(0.0) === false, '0.0 is NOT tradeable');
}

function testConfidenceLevels() {
  console.log('\n━━━ CONFIDENCE LEVEL DESCRIPTIONS ━━━');

  assert(PriceConfidence.getLevel(1.0) === 'PERFECT', '1.0 = PERFECT');
  assert(PriceConfidence.getLevel(0.9) === 'EXCELLENT', '0.9 = EXCELLENT');
  assert(PriceConfidence.getLevel(0.8) === 'GOOD', '0.8 = GOOD');
  assert(PriceConfidence.getLevel(0.7) === 'ACCEPTABLE', '0.7 = ACCEPTABLE');
  assert(PriceConfidence.getLevel(0.5) === 'DEGRADED', '0.5 = DEGRADED');
  assert(PriceConfidence.getLevel(0.1) === 'POOR', '0.1 = POOR');
  assert(PriceConfidence.getLevel(0.0) === 'OFFLINE', '0.0 = OFFLINE');
}

function testRecommendations() {
  console.log('\n━━━ ACTION RECOMMENDATIONS ━━━');

  assert(PriceConfidence.getRecommendation(1.0) === 'TRADE', '1.0 → TRADE');
  assert(PriceConfidence.getRecommendation(0.9) === 'TRADE', '0.9 → TRADE');
  assert(PriceConfidence.getRecommendation(0.8) === 'TRADE', '0.8 → TRADE');
  assert(PriceConfidence.getRecommendation(0.7) === 'OBSERVE', '0.7 → OBSERVE');
  assert(PriceConfidence.getRecommendation(0.5) === 'OBSERVE', '0.5 → OBSERVE');
  assert(PriceConfidence.getRecommendation(0.3) === 'SKIP', '0.3 → SKIP');
  assert(PriceConfidence.getRecommendation(0.0) === 'SKIP', '0.0 → SKIP');
}

function testPriceDataCreation() {
  console.log('\n━━━ PRICE DATA OBJECT CREATION ━━━');

  const priceData = PriceConfidence.createPriceData({
    symbol: 'BTCUSDT',
    price: 43250.5,
    source: 'websocket',
    age_ms: 500,
    connected: true,
    circuit_state: 'closed',
    timestamp: Date.now()
  });

  assert(priceData.symbol === 'BTCUSDT', 'Price data has symbol');
  assert(priceData.price === 43250.5, 'Price data has price');
  assert(priceData.confidence === 1.0, 'Price data has correct confidence');
  assert(priceData.confidence_level === 'PERFECT', 'Price data has level');
  assert(priceData.tradeable === true, 'Price data has tradeable flag');
  assert(priceData.recommendation === 'TRADE', 'Price data has recommendation');
  assert(priceData.metadata.source === 'websocket', 'Price data has metadata');
}

function testEdgeCases() {
  console.log('\n━━━ EDGE CASES ━━━');

  // Unknown source
  const conf1 = PriceConfidence.calculate({
    source: 'unknown',
    age_ms: 100,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf1 === 0.0, 'Unknown source = 0.0');

  // Negative age (should not happen, but handle gracefully)
  const conf2 = PriceConfidence.calculate({
    source: 'websocket',
    age_ms: -100,
    connected: true,
    circuit_state: 'closed'
  });
  assert(conf2 === 1.0, 'Negative age treated as fresh');

  // Very large age
  const conf3 = PriceConfidence.calculate({
    source: 'cache',
    age_ms: 999999999,
    connected: false,
    circuit_state: 'open'
  });
  assert(conf3 === 0.0, 'Very large cache age = 0.0');
}

function testThresholds() {
  console.log('\n━━━ THRESHOLD VALUES ━━━');

  const thresholds = PriceConfidence.getThresholds();
  
  assert(thresholds.WEBSOCKET_PERFECT === 1000, 'Perfect threshold = 1000ms');
  assert(thresholds.WEBSOCKET_EXCELLENT === 3000, 'Excellent threshold = 3000ms');
  assert(thresholds.WEBSOCKET_GOOD === 5000, 'Good threshold = 5000ms');
  assert(thresholds.REST_BASE === 0.6, 'REST baseline = 0.6');
  assert(thresholds.CACHE_BASE === 0.3, 'Cache baseline = 0.3');
  assert(thresholds.TRADING_THRESHOLD === 0.8, 'Trading threshold = 0.8');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PRICE CONFIDENCE SCORE TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    testWebSocketScoring();
    testRestScoring();
    testCacheScoring();
    testCircuitBreakerOpen();
    testTradeableThreshold();
    testConfidenceLevels();
    testRecommendations();
    testPriceDataCreation();
    testEdgeCases();
    testThresholds();

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

    console.log('\n✓ All confidence score tests passed');
    console.log('\n💡 CONFIDENCE SCORE SUMMARY:');
    console.log('   1.0 = PERFECT    (WebSocket <1s)');
    console.log('   0.9 = EXCELLENT  (WebSocket 1-3s)');
    console.log('   0.7 = GOOD       (WebSocket 3-5s)');
    console.log('   0.6 = ACCEPTABLE (REST API)');
    console.log('   0.5 = DEGRADED   (WebSocket >5s)');
    console.log('   0.3 = POOR       (Cache)');
    console.log('   0.0 = OFFLINE    (Circuit open)');
    console.log('');
    console.log('   Tradeable threshold: ≥0.8');
    console.log('');
    
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Unexpected error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
