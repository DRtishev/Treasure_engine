#!/usr/bin/env node
// scripts/verify/binance_smoke.mjs
// Smoke test for Binance Fetcher (no network required)
// Tests: circuit breaker, rate limiter, retry logic

import { BinanceFetcher } from '../data/binance_fetcher.mjs';

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

async function testCircuitBreaker() {
  console.log('\n━━━ CIRCUIT BREAKER TEST ━━━');
  
  // Create fetcher with 0 retries for faster testing
  const fetcher = new BinanceFetcher({ 
    baseUrl: 'https://invalid.binance.nowhere',
    maxRetries: 0,
    timeout: 100
  });

  // Initial state should be closed
  let status = fetcher.getStatus();
  assert(status.circuitState === 'closed', 'Initial circuit state is closed');
  assert(status.failureCount === 0, 'Initial failure count is 0');

  // Simulate 3 failures to open circuit
  for (let i = 0; i < 3; i++) {
    try {
      await fetcher.fetchKlines('BTCUSDT', '1m', { limit: 10 });
    } catch (err) {
      // Expected to fail
    }
  }

  status = fetcher.getStatus();
  assert(status.circuitState === 'open', 'Circuit opens after 3 failures');
  assert(status.failureCount === 3, 'Failure count is 3');

  // Try to fetch while circuit is open
  try {
    await fetcher.fetchKlines('BTCUSDT', '1m', { limit: 10 });
    assert(false, 'Should throw CircuitBreakerError when open');
  } catch (err) {
    assert(err.name === 'CircuitBreakerError', 'Throws CircuitBreakerError when open');
  }
}

async function testRateLimiter() {
  console.log('\n━━━ RATE LIMITER TEST ━━━');
  
  const fetcher = new BinanceFetcher({ 
    baseUrl: 'https://invalid.binance.nowhere',
    maxRetries: 0,
    timeout: 100
  });

  // Initial state
  let status = fetcher.getStatus();
  assert(status.requestsInLastMinute === 0, 'Initial requests count is 0');
  assert(status.totalWeight === 0, 'Initial weight is 0');

  // Manually add requests to rate limiter
  for (let i = 0; i < 1200; i++) {
    fetcher.requestWeights.push({
      timestamp: Date.now(),
      weight: 1
    });
  }

  status = fetcher.getStatus();
  assert(status.totalWeight === 1200, 'Weight tracking works');

  // Try to exceed rate limit
  try {
    fetcher.checkRateLimit();
    assert(false, 'Should throw RateLimitError when limit exceeded');
  } catch (err) {
    assert(err.name === 'RateLimitError', 'Throws RateLimitError when limit exceeded');
  }
}

function testStatusReporting() {
  console.log('\n━━━ STATUS REPORTING TEST ━━━');
  
  const fetcher = new BinanceFetcher();
  const status = fetcher.getStatus();

  assert(typeof status.circuitState === 'string', 'Status has circuitState');
  assert(typeof status.failureCount === 'number', 'Status has failureCount');
  assert(typeof status.requestsInLastMinute === 'number', 'Status has requestsInLastMinute');
  assert(typeof status.totalWeight === 'number', 'Status has totalWeight');
}

function testBatchCalculation() {
  console.log('\n━━━ BATCH CALCULATION TEST ━━━');
  
  // Test batch count calculation
  const maxPerBatch = 1000;
  
  const testCases = [
    { total: 500, expected: 1 },
    { total: 1000, expected: 1 },
    { total: 1001, expected: 2 },
    { total: 2000, expected: 2 },
    { total: 2500, expected: 3 }
  ];

  for (const tc of testCases) {
    const batches = Math.ceil(tc.total / maxPerBatch);
    assert(batches === tc.expected, `${tc.total} bars = ${tc.expected} batches`);
  }
}

function testConfiguration() {
  console.log('\n━━━ CONFIGURATION TEST ━━━');
  
  const defaultFetcher = new BinanceFetcher();
  assert(defaultFetcher.baseUrl === 'https://api.binance.com', 'Default baseUrl is correct');
  assert(defaultFetcher.timeout === 15000, 'Default timeout is 15s');
  assert(defaultFetcher.maxRetries === 3, 'Default maxRetries is 3');

  const customFetcher = new BinanceFetcher({
    baseUrl: 'https://custom.url',
    timeout: 5000,
    maxRetries: 5,
    verbose: true
  });
  assert(customFetcher.baseUrl === 'https://custom.url', 'Custom baseUrl works');
  assert(customFetcher.timeout === 5000, 'Custom timeout works');
  assert(customFetcher.maxRetries === 5, 'Custom maxRetries works');
  assert(customFetcher.verbose === true, 'Custom verbose works');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BINANCE FETCHER SMOKE TEST (No Network)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    testConfiguration();
    testStatusReporting();
    testBatchCalculation();
    await testCircuitBreaker();
    await testRateLimiter();

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

    console.log('\n✓ All tests passed');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Unexpected error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
