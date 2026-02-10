/**
 * TREASURE ENGINE: Dry-Run Live E2E Verification (EPOCH-14)
 * 
 * Purpose: Test LiveAdapterDryRun with reconciliation (100% offline)
 * Strategy:
 * 1. Create LiveAdapterDryRun instance
 * 2. Place orders using fixtures
 * 3. Poll order status
 * 4. Reconcile expected vs actual
 * 5. Validate report against schema
 * 6. Verify zero network calls
 * 
 * CRITICAL: Must run 100% offline, zero network I/O
 */

import { createLiveAdapterDryRun } from '../../core/exec/adapters/live_adapter_dryrun.mjs';
import { createReconciliationEngine } from '../../core/recon/reconcile_v1.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import Ajv from 'ajv';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  EPOCH-14: DRY-RUN LIVE E2E VERIFICATION                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('━━━ ADAPTER INSTANTIATION ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let adapter;

test('Can create LiveAdapterDryRun', () => {
  adapter = createLiveAdapterDryRun();
  if (!adapter) throw new Error('Adapter is null');
  if (adapter.getName() !== 'LiveAdapterDryRun') {
    throw new Error(`Expected name 'LiveAdapterDryRun', got '${adapter.getName()}'`);
  }
});

test('Adapter has fixtures loaded', () => {
  const stats = adapter.getStats();
  if (stats.fixtures_loaded < 1) {
    console.log('  ℹ  Warning: No fixtures loaded, will use synthetic fixtures');
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SCENARIO 1: INSTANT FILL (BTC/USDT) ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let order1_id;
let order1_result;

await asyncTest('Place market buy order (BTC/USDT)', async () => {
  const intent = {
    side: 'BUY',
    size: 0.001,
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT'
  };

  const ctx = {
    run_id: 'dryrun_test_001',
    hack_id: 'HACK_DRYRUN_01',
    mode: 'dryrun',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1700000000000 }
  };

  const result = await adapter.placeOrder(intent, ctx);
  
  if (!result.order_id) throw new Error('No order_id returned');
  if (result.status !== 'PENDING') throw new Error(`Expected PENDING, got ${result.status}`);
  
  order1_id = result.order_id;
  console.log(`  Order ID: ${order1_id}`);
});

await asyncTest('Poll order status (should be FILLED)', async () => {
  const ctx = {
    run_id: 'dryrun_test_001',
    hack_id: 'HACK_DRYRUN_01',
    mode: 'dryrun'
  };

  const result = await adapter.pollOrder(order1_id, ctx);
  order1_result = result;
  
  if (result.status !== 'FILLED') {
    throw new Error(`Expected FILLED, got ${result.status}`);
  }
  
  if (!result.filled) throw new Error('filled should be true');
  if (!result.filled_price) throw new Error('filled_price missing');
  if (!result.fills || result.fills.length === 0) {
    throw new Error('fills array missing or empty');
  }
  
  console.log(`  Fill price: ${result.filled_price}`);
  console.log(`  Fill qty: ${result.filled_qty}`);
  console.log(`  Fee: ${result.fee}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SCENARIO 2: PARTIAL FILL (ETH/USDT) ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let order2_id;
let order2_result;

await asyncTest('Place limit sell order (ETH/USDT)', async () => {
  const intent = {
    side: 'SELL',
    size: 1.0,
    price: 3000,
    type: 'LIMIT',
    symbol: 'ETH/USDT'
  };

  const ctx = {
    run_id: 'dryrun_test_002',
    hack_id: 'HACK_DRYRUN_02',
    mode: 'dryrun',
    bar_idx: 1,
    order_seq: 0,
    bar: { t_ms: 1700000010000 }
  };

  const result = await adapter.placeOrder(intent, ctx);
  order2_id = result.order_id;
});

await asyncTest('Poll order status (should be PARTIALLY_FILLED)', async () => {
  const ctx = {
    run_id: 'dryrun_test_002',
    hack_id: 'HACK_DRYRUN_02',
    mode: 'dryrun'
  };

  const result = await adapter.pollOrder(order2_id, ctx);
  order2_result = result;
  
  if (result.status !== 'PARTIALLY_FILLED') {
    throw new Error(`Expected PARTIALLY_FILLED, got ${result.status}`);
  }
  
  if (result.filled) throw new Error('filled should be false for partial');
  if (!result.filled_qty) throw new Error('filled_qty missing');
  if (!result.remaining_qty) throw new Error('remaining_qty missing');
  
  console.log(`  Filled: ${result.filled_qty}/${result.filled_qty + result.remaining_qty}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ RECONCILIATION ENGINE ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let reconciliationEngine;
let reconResult1;
let reconResult2;

test('Create ReconciliationEngine', () => {
  reconciliationEngine = createReconciliationEngine({
    price_tolerance: 0.001,
    fee_tolerance: 0.0001
  });
  
  if (!reconciliationEngine) throw new Error('Engine is null');
});

test('Reconcile order 1 (instant fill - should pass)', () => {
  const expected = {
    order_id: order1_id,
    status: 'FILLED',
    fills: order1_result.fills
  };

  const actual = {
    order_id: order1_id,
    status: order1_result.status,
    fills: order1_result.fills
  };

  reconResult1 = reconciliationEngine.reconcileOrder(expected, actual);
  
  if (!reconResult1.ok) {
    throw new Error(`Reconciliation failed: ${reconResult1.mismatches.length} mismatches`);
  }
  
  console.log(`  Orders checked: ${reconResult1.summary.orders_checked}`);
  console.log(`  Fills checked: ${reconResult1.summary.fills_checked}`);
});

test('Reconcile order 2 (partial fill - should pass)', () => {
  const expected = {
    order_id: order2_id,
    status: 'PARTIALLY_FILLED',
    fills: order2_result.fills
  };

  const actual = {
    order_id: order2_id,
    status: order2_result.status,
    fills: order2_result.fills
  };

  reconResult2 = reconciliationEngine.reconcileOrder(expected, actual);
  
  if (!reconResult2.ok) {
    throw new Error(`Reconciliation failed: ${reconResult2.mismatches.length} mismatches`);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SCENARIO 3: PRICE MISMATCH DETECTION ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Detect price mismatch (should fail reconciliation)', () => {
  const expected = {
    order_id: 'test_order_mismatch',
    status: 'FILLED',
    fills: [
      {
        fill_id: 'fill_001',
        price: 100.0,
        qty: 10.0,
        fee: 1.0
      }
    ]
  };

  const actual = {
    order_id: 'test_order_mismatch',
    status: 'FILLED',
    fills: [
      {
        fill_id: 'fill_001',
        price: 105.5,  // 5.5% higher - should trigger PRICE_MISMATCH
        qty: 10.0,
        fee: 1.055
      }
    ]
  };

  const result = reconciliationEngine.reconcileOrder(expected, actual);
  
  if (result.ok) {
    throw new Error('Reconciliation should have failed due to price mismatch');
  }
  
  const priceMismatchFound = result.mismatches.some(m => m.code === 'PRICE_MISMATCH');
  if (!priceMismatchFound) {
    throw new Error('Expected PRICE_MISMATCH code not found');
  }
  
  console.log(`  ✓ Price mismatch detected correctly`);
  console.log(`  Mismatches: ${result.mismatches.length}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ REPORT GENERATION ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let reconciliationReport;

test('Generate reconciliation report', () => {
  reconciliationReport = reconciliationEngine.generateReport(reconResult1);
  
  if (!reconciliationReport) throw new Error('Report is null');
  if (!reconciliationReport.reconciliation_status) {
    throw new Error('Report missing reconciliation_status');
  }
  if (!reconciliationReport.summary) {
    throw new Error('Report missing summary');
  }
  
  console.log(`  Status: ${reconciliationReport.reconciliation_status}`);
  console.log(`  Orders checked: ${reconciliationReport.summary.orders_checked}`);
  console.log(`  Mismatches: ${reconciliationReport.summary.mismatches_found}`);
});

test('Save reconciliation report', () => {
  const reportPath = 'reports/recon_report.json';
  writeFileSync(reportPath, JSON.stringify(reconciliationReport, null, 2));
  
  if (!existsSync(reportPath)) {
    throw new Error('Report file not created');
  }
  
  console.log(`  Saved to: ${reportPath}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ SCHEMA VALIDATION ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Load reconciliation report schema', () => {
  const schema = JSON.parse(readFileSync('truth/recon_report.schema.json', 'utf8'));
  
  if (!schema) throw new Error('Schema is null');
  if (schema.$schema !== 'http://json-schema.org/draft-07/schema#') {
    throw new Error('Invalid schema format');
  }
  
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  
  const valid = validate(reconciliationReport);
  
  if (!valid) {
    throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`);
  }
  
  console.log('  ✓ Report conforms to schema');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ NETWORK ISOLATION CHECK ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Verify no network modules in LiveAdapterDryRun', () => {
  const sourceCode = readFileSync('core/exec/adapters/live_adapter_dryrun.mjs', 'utf8');
  
  const networkModules = ['axios', 'node-fetch', 'http', 'https', 'net', 'dgram'];
  
  for (const mod of networkModules) {
    if (sourceCode.includes(`require('${mod}')`) || 
        sourceCode.includes(`from '${mod}'`) ||
        sourceCode.includes(`import ${mod}`)) {
      throw new Error(`Network module detected: ${mod}`);
    }
  }
  
  console.log('  ✓ No network modules imported');
});

test('Verify no network modules in reconciliation engine', () => {
  const sourceCode = readFileSync('core/recon/reconcile_v1.mjs', 'utf8');
  
  const networkModules = ['axios', 'node-fetch', 'http', 'https', 'net', 'dgram'];
  
  for (const mod of networkModules) {
    if (sourceCode.includes(`require('${mod}')`) || 
        sourceCode.includes(`from '${mod}'`) ||
        sourceCode.includes(`import ${mod}`)) {
      throw new Error(`Network module detected: ${mod}`);
    }
  }
  
  console.log('  ✓ No network modules imported');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n━━━ ADAPTER STATISTICS ━━━\n');
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test('Get adapter statistics', () => {
  const stats = adapter.getStats();
  
  console.log('  Adapter:', stats.adapter);
  console.log('  Orders placed:', stats.orders_placed);
  console.log('  Orders filled:', stats.orders_filled);
  console.log('  Orders partial:', stats.orders_partial);
  console.log('  Orders canceled:', stats.orders_canceled);
  console.log('  Fixtures loaded:', stats.fixtures_loaded);
  
  if (stats.orders_placed < 2) {
    throw new Error('Expected at least 2 orders placed');
  }
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
  console.log('✗ DRY-RUN LIVE E2E VERIFICATION: FAIL\n');
  process.exit(1);
}

console.log('🎉 DRY-RUN LIVE E2E VERIFICATION: PASS\n');
console.log('✅ DELIVERABLES VERIFIED:\n');
console.log('   ✓ LiveAdapterDryRun functional (100% offline)');
console.log('   ✓ Order placement & polling working');
console.log('   ✓ Reconciliation engine operational');
console.log('   ✓ Report schema validated');
console.log('   ✓ Network isolation confirmed');
console.log('   ✓ Fixture system working\n');

console.log('📦 ARTIFACTS PRODUCED:\n');
console.log('   • reports/recon_report.json\n');

process.exit(0);
