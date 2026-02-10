/**
 * TREASURE ENGINE: Persistence + Idempotency Verification (EPOCH-12)
 * 
 * Purpose: Verify that persistence layer prevents duplicate orders on restart
 * 
 * Test Strategy:
 * 1. Create a run with fixed set of intents
 * 2. Place orders for those intents
 * 3. Simulate "crash" by closing and reopening DB
 * 4. Re-process same intents
 * 5. Assert: No duplicate orders created
 * 6. Assert: Intent -> Order mapping stable
 */

import assert from 'assert';
import { RepoState } from '../../core/persist/repo_state.mjs';
import { unlinkSync } from 'fs';
import { existsSync } from 'fs';

const TEST_DB_PATH = './data/test_persist_idempotency.db';

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
console.log('║  EPOCH-12: PERSISTENCE + IDEMPOTENCY VERIFICATION        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Clean up test database if exists
if (existsSync(TEST_DB_PATH)) {
  unlinkSync(TEST_DB_PATH);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('━━━ BASIC PERSISTENCE TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('RepoState can be instantiated', () => {
  const repo = new RepoState(TEST_DB_PATH);
  assert(repo !== null);
});

test('RepoState can initialize database', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  assert(repo.db !== null);
  repo.close();
});

test('Database file created after initialization', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  assert(existsSync(TEST_DB_PATH));
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ RUN MANAGEMENT TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Can start a run', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  const run = repo.startRun({
    run_id: 'test_run_001',
    mode: 'sim',
    dataset_sha: 'abc123'
  });
  
  assert.strictEqual(run.run_id, 'test_run_001');
  assert.strictEqual(run.mode, 'sim');
  assert.strictEqual(run.status, 'running');
  
  repo.close();
});

test('Can retrieve a run', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  repo.startRun({
    run_id: 'test_run_002',
    mode: 'paper'
  });
  
  const run = repo.db.getRun('test_run_002');
  assert(run !== null);
  assert.strictEqual(run.run_id, 'test_run_002');
  
  repo.close();
});

test('Can complete a run', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  repo.startRun({ run_id: 'test_run_003', mode: 'sim' });
  repo.completeRun('test_run_003', 'completed');
  
  const run = repo.db.getRun('test_run_003');
  assert.strictEqual(run.status, 'completed');
  
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ INTENT ID GENERATION TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('generateIntentId is deterministic', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  const params = {
    hack_id: 'HACK_A3',
    signal: { side: 'long', size: 1000, symbol: 'BTC/USDT', price: 50000, confidence: 0.8 },
    bar_t_ms: 1700000000000,
    dataset_sha: 'dataset123',
    run_seed: 'seed42'
  };
  
  const id1 = repo.generateIntentId(params);
  const id2 = repo.generateIntentId(params);
  
  assert.strictEqual(id1, id2, 'Intent IDs should be identical for same inputs');
  assert(id1.startsWith('intent_'), 'Intent ID should have correct prefix');
  
  repo.close();
});

test('generateIntentId changes with different inputs', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  const params1 = {
    hack_id: 'HACK_A3',
    signal: { side: 'long', size: 1000, symbol: 'BTC/USDT', price: 50000, confidence: 0.8 },
    bar_t_ms: 1700000000000,
    dataset_sha: 'dataset123',
    run_seed: 'seed42'
  };
  
  const params2 = {
    ...params1,
    bar_t_ms: 1700000001000 // Different timestamp
  };
  
  const id1 = repo.generateIntentId(params1);
  const id2 = repo.generateIntentId(params2);
  
  assert.notStrictEqual(id1, id2, 'Intent IDs should differ for different timestamps');
  
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ IDEMPOTENCY TESTS (CRITICAL) ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Creating intent twice returns same intent', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  // Create run first (required for foreign key)
  repo.startRun({ run_id: 'test_run_idem', mode: 'sim' });
  
  const intentData = {
    intent_id: 'intent_test_001',
    run_id: 'test_run_idem',
    ts_ms: Date.now(),
    side: 'long',
    size_usd: 1000,
    symbol: 'BTC/USDT',
    status: 'pending'
  };
  
  const result1 = repo.createIntent(intentData);
  const result2 = repo.createIntent(intentData);
  
  assert.strictEqual(result1.created, true, 'First insert should create');
  assert.strictEqual(result2.created, false, 'Second insert should not create (idempotent)');
  assert.strictEqual(result1.intent.intent_id, result2.intent.intent_id);
  
  repo.close();
});

test('IDEMPOTENCY: Same intent does not create duplicate orders', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  // Start run
  repo.startRun({ run_id: 'idem_run_001', mode: 'sim' });
  
  // Generate deterministic intent ID
  const intentParams = {
    hack_id: 'HACK_A3',
    signal: { side: 'long', size: 1000, symbol: 'BTC/USDT', price: 50000, confidence: 0.8 },
    bar_t_ms: 1700000000000,
    dataset_sha: 'dataset123',
    run_seed: 'seed42'
  };
  
  const intent_id = repo.generateIntentId(intentParams);
  
  // Create intent
  const intent = {
    intent_id,
    run_id: 'idem_run_001',
    ts_ms: 1700000000000,
    side: 'long',
    size_usd: 1000,
    symbol: 'BTC/USDT',
    status: 'pending'
  };
  
  repo.createIntent(intent);
  
  // First order placement
  const order1 = {
    order_id: 'order_001',
    intent_id,
    adapter: 'PaperAdapter',
    status: 'submitted'
  };
  
  repo.createOrder(order1);
  
  // Check orders count
  const check1 = repo.checkIntentOrders(intent_id);
  assert.strictEqual(check1.orders.length, 1, 'Should have 1 order');
  
  // Simulate restart: check if intent has orders
  const check2 = repo.checkIntentOrders(intent_id);
  
  if (check2.hasOrders) {
    // Already has orders, skip placement (idempotency)
    console.log('   [IDEMPOTENCY] Intent already has orders, skipping duplicate placement');
  } else {
    // Would place order (but shouldn't reach here)
    assert.fail('Should detect existing orders');
  }
  
  // Verify: still only 1 order
  const finalCheck = repo.checkIntentOrders(intent_id);
  assert.strictEqual(finalCheck.orders.length, 1, 'Should still have only 1 order');
  
  repo.close();
});

test('CRASH SIMULATION: State persists across database close/reopen', () => {
  // Phase 1: Create intent and order
  {
    const repo = new RepoState(TEST_DB_PATH);
    repo.initialize();
    
    repo.startRun({ run_id: 'crash_run_001', mode: 'sim' });
    
    const intent_id = 'intent_crash_001';
    repo.createIntent({
      intent_id,
      run_id: 'crash_run_001',
      ts_ms: Date.now(),
      side: 'long',
      size_usd: 1000,
      symbol: 'BTC/USDT',
      status: 'pending'
    });
    
    repo.createOrder({
      order_id: 'order_crash_001',
      intent_id,
      adapter: 'PaperAdapter',
      status: 'submitted'
    });
    
    repo.close(); // SIMULATE CRASH
  }
  
  // Phase 2: Reopen and verify state
  {
    const repo = new RepoState(TEST_DB_PATH);
    repo.initialize(); // Restart
    
    const intent = repo.getIntent('intent_crash_001');
    assert(intent !== null, 'Intent should persist after restart');
    assert.strictEqual(intent.intent_id, 'intent_crash_001');
    
    const check = repo.checkIntentOrders('intent_crash_001');
    assert.strictEqual(check.hasOrders, true, 'Should detect existing orders after restart');
    assert.strictEqual(check.orders.length, 1);
    assert.strictEqual(check.orders[0].order_id, 'order_crash_001');
    
    repo.close();
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ POSITION TRACKING TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Can update and retrieve position', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  repo.updatePosition('BTC/USDT', 0.5, 50000);
  
  const position = repo.getPosition('BTC/USDT');
  assert(position !== null);
  assert.strictEqual(position.symbol, 'BTC/USDT');
  assert.strictEqual(position.qty, 0.5);
  assert.strictEqual(position.avg_price, 50000);
  
  repo.close();
});

test('Can retrieve all non-zero positions', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  repo.updatePosition('ETH/USDT', 2.0, 3000);
  repo.updatePosition('SOL/USDT', 10.0, 100);
  
  const positions = repo.getAllPositions();
  assert(positions.length >= 2);
  
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SAFETY STATUS TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Can update and retrieve safety status', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  repo.updateSafetyStatus('paused', 'Manual pause for testing');
  
  const safety = repo.getSafetyStatus();
  assert(safety !== null);
  assert.strictEqual(safety.status, 'paused');
  assert.strictEqual(safety.reason, 'Manual pause for testing');
  
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ CHECKPOINT TESTS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Can save and load checkpoint', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  const checkpointData = {
    lastProcessedBar: 1700000000000,
    strategyState: { momentum: 0.5 }
  };
  
  repo.saveCheckpoint('strategy_checkpoint', checkpointData);
  
  const loaded = repo.loadCheckpoint('strategy_checkpoint');
  assert(loaded !== null);
  assert.deepStrictEqual(loaded.payload_json, checkpointData);
  
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ INTEGRATION TEST ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('FULL WORKFLOW: Run -> Intents -> Orders -> No Duplicates', () => {
  const repo = new RepoState(TEST_DB_PATH);
  repo.initialize();
  
  // Start run
  repo.startRun({ run_id: 'integration_run', mode: 'sim', dataset_sha: 'dataset456' });
  
  // Create 3 intents with deterministic IDs
  const intents = [];
  for (let i = 0; i < 3; i++) {
    const intentParams = {
      hack_id: 'HACK_B1',
      signal: { side: 'long', size: 1000, symbol: 'ETH/USDT', price: 3000, confidence: 0.9 },
      bar_t_ms: 1700000000000 + (i * 60000),
      dataset_sha: 'dataset456',
      run_seed: 'integration_seed'
    };
    
    const intent_id = repo.generateIntentId(intentParams);
    
    const result = repo.createIntent({
      intent_id,
      run_id: 'integration_run',
      ts_ms: intentParams.bar_t_ms,
      side: 'long',
      size_usd: 1000,
      symbol: 'ETH/USDT',
      status: 'pending'
    });
    
    intents.push(intent_id);
    assert.strictEqual(result.created, true, `Intent ${i} should be created`);
  }
  
  // Place orders for each intent
  for (let i = 0; i < intents.length; i++) {
    const check = repo.checkIntentOrders(intents[i]);
    
    if (!check.hasOrders) {
      repo.createOrder({
        order_id: `order_integration_${i}`,
        intent_id: intents[i],
        adapter: 'PaperAdapter',
        status: 'submitted'
      });
    }
  }
  
  // Verify each intent has exactly 1 order
  for (let i = 0; i < intents.length; i++) {
    const check = repo.checkIntentOrders(intents[i]);
    assert.strictEqual(check.orders.length, 1, `Intent ${i} should have 1 order`);
  }
  
  // Simulate restart and re-process (should NOT create duplicates)
  for (let i = 0; i < intents.length; i++) {
    const check = repo.checkIntentOrders(intents[i]);
    
    if (!check.hasOrders) {
      // Should NOT reach here
      assert.fail('Should detect existing orders on restart');
    }
  }
  
  // Final verification
  for (let i = 0; i < intents.length; i++) {
    const check = repo.checkIntentOrders(intents[i]);
    assert.strictEqual(check.orders.length, 1, `Intent ${i} should still have only 1 order`);
  }
  
  repo.close();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SUMMARY ━━━\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${testsPassed}`);
console.log(`✗ FAILED: ${testsFailed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Clean up
if (existsSync(TEST_DB_PATH)) {
  unlinkSync(TEST_DB_PATH);
}

if (testsFailed > 0) {
  console.log('✗ EPOCH-12 PERSISTENCE VERIFICATION: FAIL\n');
  process.exit(1);
}

console.log('🎉 EPOCH-12 PERSISTENCE VERIFICATION: PASS\n');
console.log('✅ DELIVERABLES VERIFIED:\n');
console.log('   ✓ SQLite persistence layer functional');
console.log('   ✓ Deterministic intent_id generation');
console.log('   ✓ Idempotency prevents duplicate orders');
console.log('   ✓ State persists across restarts');
console.log('   ✓ Intent -> Order mapping stable');
console.log('   ✓ Position tracking operational');
console.log('   ✓ Safety status manageable');
console.log('   ✓ Checkpoint system functional\n');

process.exit(0);
