#!/usr/bin/env node
// scripts/verify/live_adapter_smoke.mjs
// Live adapter verification - DRY-RUN ONLY, NO REAL TRADING

import { LiveAdapter } from '../../core/exec/adapters/live_adapter.mjs';
import { EventLog } from '../../core/obs/event_log.mjs';
import * as safetyGates from '../../core/exec/adapters/safety_gates.mjs';

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

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('LIVE ADAPTER VERIFICATION (EPOCH-05)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️  DRY-RUN ONLY - NO REAL TRADING');
  console.log('');
  console.log('Testing:');
  console.log('  • LiveAdapter creation (dry-run)');
  console.log('  • Safety gates enforcement');
  console.log('  • Order placement (simulated)');
  console.log('  • Order polling (mocked)');
  console.log('  • Emergency stop');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Test 1: LiveAdapter Creation (Dry-Run)
    console.log('━━━ TEST 1: ADAPTER CREATION (DRY-RUN) ━━━');
    const eventLog = new EventLog({ run_id: 'live_test_001' });
    const adapter = new LiveAdapter({
      dryRun: true,
      maxPositionSizeUsd: 1000,
      maxDailyLossUsd: 100,
      eventLog
    });
    
    assert(adapter !== null, 'LiveAdapter created');
    assert(adapter.dryRun === true, 'Dry-run mode enabled');
    assert(adapter.getName().includes('DRY-RUN'), 'Adapter name indicates dry-run');
    console.log('');

    // Test 2: Safety Gates - Validate Intent
    console.log('━━━ TEST 2: SAFETY GATES - VALIDATE INTENT ━━━');
    
    // Valid intent
    try {
      safetyGates.validateIntent({
        side: 'BUY',
        size: 100,
        price: 50000,
        type: 'MARKET'
      });
      passed++;
      console.log('✓ Valid intent accepted');
    } catch (err) {
      failed++;
      console.error(`✗ Valid intent rejected: ${err.message}`);
    }
    
    // Invalid side
    try {
      safetyGates.validateIntent({
        side: 'INVALID',
        size: 100,
        price: 50000,
        type: 'MARKET'
      });
      failed++;
      console.error('✗ Invalid side accepted');
    } catch (err) {
      passed++;
      console.log('✓ Invalid side rejected');
    }
    
    // Invalid size (NaN)
    try {
      safetyGates.validateIntent({
        side: 'BUY',
        size: NaN,
        price: 50000,
        type: 'MARKET'
      });
      failed++;
      console.error('✗ NaN size accepted');
    } catch (err) {
      passed++;
      console.log('✓ NaN size rejected');
    }
    
    // Invalid size (negative)
    try {
      safetyGates.validateIntent({
        side: 'BUY',
        size: -100,
        price: 50000,
        type: 'MARKET'
      });
      failed++;
      console.error('✗ Negative size accepted');
    } catch (err) {
      passed++;
      console.log('✓ Negative size rejected');
    }
    
    // Invalid size (zero)
    try {
      safetyGates.validateIntent({
        side: 'BUY',
        size: 0,
        price: 50000,
        type: 'MARKET'
      });
      failed++;
      console.error('✗ Zero size accepted');
    } catch (err) {
      passed++;
      console.log('✓ Zero size rejected');
    }
    console.log('');

    // Test 3: Safety Gates - Position Cap
    console.log('━━━ TEST 3: SAFETY GATES - POSITION CAP ━━━');
    
    // Within cap
    try {
      safetyGates.checkPositionCap(500, 400, 1000);
      passed++;
      console.log('✓ Order within cap accepted');
    } catch (err) {
      failed++;
      console.error(`✗ Order within cap rejected: ${err.message}`);
    }
    
    // Exceeds cap
    try {
      safetyGates.checkPositionCap(800, 300, 1000);
      failed++;
      console.error('✗ Order exceeding cap accepted');
    } catch (err) {
      passed++;
      console.log('✓ Order exceeding cap rejected');
    }
    console.log('');

    // Test 4: Safety Gates - Daily Loss Cap
    console.log('━━━ TEST 4: SAFETY GATES - DAILY LOSS CAP ━━━');
    
    // Within cap
    try {
      safetyGates.checkDailyLossCap(-50, 100);
      passed++;
      console.log('✓ Loss within cap accepted');
    } catch (err) {
      failed++;
      console.error(`✗ Loss within cap rejected: ${err.message}`);
    }
    
    // Exceeds cap
    try {
      safetyGates.checkDailyLossCap(-150, 100);
      failed++;
      console.error('✗ Loss exceeding cap accepted');
    } catch (err) {
      passed++;
      console.log('✓ Loss exceeding cap rejected');
    }
    console.log('');

    // Test 5: Safety Gates - Confirmation Required
    console.log('━━━ TEST 5: SAFETY GATES - CONFIRMATION ━━━');
    
    // Dry-run without confirmation
    try {
      safetyGates.requireConfirmation(false, false);
      passed++;
      console.log('✓ Dry-run without confirmation accepted');
    } catch (err) {
      failed++;
      console.error(`✗ Dry-run without confirmation rejected: ${err.message}`);
    }
    
    // Live mode without confirmation
    try {
      safetyGates.requireConfirmation(true, false);
      failed++;
      console.error('✗ Live mode without confirmation accepted');
    } catch (err) {
      passed++;
      console.log('✓ Live mode without confirmation rejected');
    }
    
    // Live mode with confirmation
    try {
      safetyGates.requireConfirmation(true, true);
      passed++;
      console.log('✓ Live mode with confirmation accepted');
    } catch (err) {
      failed++;
      console.error(`✗ Live mode with confirmation rejected: ${err.message}`);
    }
    console.log('');

    // Test 6: Order Placement (Dry-Run)
    console.log('━━━ TEST 6: ORDER PLACEMENT (DRY-RUN) ━━━');
    
    const intent = {
      side: 'BUY',
      size: 100,
      price: 50000,
      type: 'MARKET'
    };
    
    const ctx = {
      run_id: 'test_run',
      hack_id: 'HACK_A2',
      mode: 'base',
      bar_idx: 0,
      bar: { t_ms: Date.now() },
      order_seq: 0
    };
    
    const orderResult = await adapter.placeOrder(intent, ctx);
    
    assert(orderResult !== null, 'Order placed');
    assert(orderResult.order_id !== undefined, 'Order ID generated');
    assert(orderResult.status === 'SIMULATED', 'Order simulated (not real)');
    assert(orderResult.dry_run === true, 'Dry-run flag set');
    console.log('');

    // Test 7: Order Polling
    console.log('━━━ TEST 7: ORDER POLLING ━━━');
    
    // Wait for simulated fill
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const pollResult = await adapter.pollOrder(orderResult.order_id, ctx);
    
    assert(pollResult !== null, 'Poll result received');
    assert(pollResult.filled !== undefined, 'Fill status present');
    console.log(`  Order status: ${pollResult.filled ? 'FILLED' : 'PENDING'}`);
    console.log('');

    // Test 8: Emergency Stop
    console.log('━━━ TEST 8: EMERGENCY STOP ━━━');
    
    adapter.activateEmergencyStop('Test emergency stop');
    assert(adapter.emergencyStop === true, 'Emergency stop activated');
    
    try {
      await adapter.placeOrder(intent, ctx);
      failed++;
      console.error('✗ Order placed during emergency stop');
    } catch (err) {
      passed++;
      console.log('✓ Order blocked by emergency stop');
    }
    console.log('');

    // Test 9: Adapter Statistics
    console.log('━━━ TEST 9: ADAPTER STATISTICS ━━━');
    
    adapter.reset();
    const stats = adapter.getStats();
    
    assert(stats.adapter !== undefined, 'Adapter name in stats');
    assert(stats.dry_run !== undefined, 'Dry-run flag in stats');
    assert(stats.orders_placed !== undefined, 'Orders placed tracked');
    assert(stats.orders_filled !== undefined, 'Orders filled tracked');
    assert(stats.safety_blocks !== undefined, 'Safety blocks tracked');
    console.log(`  Stats: ${JSON.stringify(stats, null, 2)}`);
    console.log('');

    // Test 10: Sanitization
    console.log('━━━ TEST 10: SENSITIVE DATA SANITIZATION ━━━');
    
    const sensitiveText = 'apiKey=abc123def456 apiSecret=xyz789';
    const sanitized = safetyGates.sanitize(sensitiveText);
    
    assert(!sanitized.includes('abc123'), 'API key redacted');
    assert(!sanitized.includes('xyz789'), 'API secret redacted');
    assert(sanitized.includes('[REDACTED]'), 'Redaction marker present');
    console.log(`  Original: ${sensitiveText}`);
    console.log(`  Sanitized: ${sanitized}`);
    console.log('');

    // Cleanup
    eventLog.close();

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (failed > 0) {
      console.error(`✗ ${failed} tests failed`);
      console.error('');
      console.error('EPOCH-05 VERIFICATION: FAIL');
      process.exit(1);
    }

    console.log('✓ All live adapter tests passed');
    console.log('');
    console.log('🎉 EPOCH-05 VERIFICATION: PASS');
    console.log('');
    console.log('📦 DELIVERABLES:');
    console.log('   • LiveAdapter (dry-run tested)');
    console.log('   • Safety gates (all enforced)');
    console.log('   • Mock exchange (no real API)');
    console.log('   • Event logging (comprehensive)');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   • This was DRY-RUN testing only');
    console.log('   • NO real orders were placed');
    console.log('   • NO real money was used');
    console.log('   • Live mode requires confirmation');
    console.log('');
    console.log('✅ READY FOR:');
    console.log('   • EPOCH-06: Micro-live testing ($10)');
    console.log('   • API key configuration');
    console.log('   • Gradual capital scaling');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ LIVE ADAPTER VERIFICATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    process.exit(1);
  }
}

main();
