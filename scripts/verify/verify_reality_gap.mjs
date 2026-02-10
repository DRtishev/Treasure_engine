#!/usr/bin/env node
// scripts/verify/verify_reality_gap.mjs
// Verify Reality Gap Monitor

import { RealityGapMonitor } from '../../core/obs/reality_gap_monitor.mjs';

function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💎 GENIUS VERIFICATION: Reality Gap Monitor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Create monitor
    const monitor = new RealityGapMonitor();
    passed++;
    console.log('✓ Monitor created');

    // Test 2: Record paper trades
    for (let i = 0; i < 10; i++) {
      monitor.recordPaper({
        intent: { side: 'BUY', size: 100 },
        filled: true,
        filled_price: 50000,
        fee: 50,
        slippage: 0.001,
        pnl_usd: 5,
        timing_ms: 100
      });
    }
    passed++;
    console.log('✓ Paper trades recorded');

    // Test 3: Record live trades (with slight differences)
    for (let i = 0; i < 10; i++) {
      monitor.recordLive({
        intent: { side: 'BUY', size: 100 },
        filled: true,
        filled_price: 50050, // Slight slippage
        fee: 55, // Slightly higher fee
        slippage: 0.002, // Higher slippage
        pnl_usd: 4, // Lower PnL
        timing_ms: 150 // Slower
      });
    }
    passed++;
    console.log('✓ Live trades recorded');

    // Test 4: Compute metrics
    const metrics = monitor.metrics.computeGap();
    if (metrics.slippage_gap >= 0 && metrics.fee_gap >= 0) {
      passed++;
      console.log('✓ Metrics computed');
    } else {
      failed++;
      console.error('✗ Invalid metrics');
    }

    // Test 5: Check thresholds
    const check = monitor.metrics.checkThresholds();
    passed++;
    console.log('✓ Thresholds checked');

    // Test 6: Get report
    const report = monitor.getReport();
    if (report.paper_trades_count === 10 && report.live_trades_count === 10) {
      passed++;
      console.log('✓ Report generated');
    } else {
      failed++;
      console.error('✗ Invalid report');
    }

    // Test 7: Print report
    monitor.printReport();
    passed++;
    console.log('✓ Report printed');

    // Results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (failed > 0) {
      console.error('❌ REALITY GAP MONITOR: FAIL');
      process.exit(1);
    }

    console.log('✅ REALITY GAP MONITOR: PASS');
    console.log('');
    console.log('💎 GENIUS LEVEL: Reality gap tracking operational');
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
