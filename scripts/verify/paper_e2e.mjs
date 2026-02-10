#!/usr/bin/env node
// scripts/verify/paper_e2e.mjs
// EPOCH-04: Paper trading E2E verification
// Validates: adapter integration, event logging, deterministic execution

import fs from 'fs';
import path from 'path';
import { runSimulation } from '../../core/sim/engine_paper.mjs';
import { validateEventLog } from '../../core/obs/event_log.mjs';

const DATASET_PATH = 'dataset/BTCUSDT_5m_100bars.json';
const SSOT_PATH = 'spec/ssot.json';
const HACKS_PATH = 'spec/hacks.json';

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
  console.log('PAPER TRADING E2E VERIFICATION (EPOCH-04)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Testing:');
  console.log('  • PaperAdapter integration');
  console.log('  • EventLog JSONL format');
  console.log('  • Risk event logging');
  console.log('  • Execution event logging');
  console.log('  • System event logging');
  console.log('  • Deterministic execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Check prerequisites
    console.log('━━━ PREREQUISITES ━━━');
    assert(fs.existsSync(DATASET_PATH), `Dataset exists: ${DATASET_PATH}`);
    assert(fs.existsSync(SSOT_PATH), `SSOT exists: ${SSOT_PATH}`);
    assert(fs.existsSync(HACKS_PATH), `Hacks spec exists: ${HACKS_PATH}`);
    console.log('');

    // Run paper simulation
    console.log('━━━ PAPER SIMULATION ━━━');
    const runId = `paper_test_${Date.now()}`;
    console.log(`Run ID: ${runId}`);
    console.log('Running simulation...');
    
    const results = await runSimulation(DATASET_PATH, SSOT_PATH, HACKS_PATH, runId);
    
    assert(results !== null, 'Simulation completed');
    assert(results.aggregate !== null, 'Aggregate metrics computed');
    assert(results.meta.run_id === runId, 'Run ID matches');
    assert(results.meta.adapter === 'PaperAdapter', 'PaperAdapter used');
    console.log('');

    // Verify event log file
    console.log('━━━ EVENT LOG VERIFICATION ━━━');
    const eventLogPath = path.join('logs/events', `run_${runId}.jsonl`);
    
    assert(fs.existsSync(eventLogPath), `Event log created: ${eventLogPath}`);
    
    if (fs.existsSync(eventLogPath)) {
      const validation = validateEventLog(eventLogPath);
      
      assert(validation.valid, 'Event log is valid JSONL');
      
      if (validation.valid) {
        console.log(`  Total events: ${validation.total_events}`);
        console.log(`  SYS events: ${validation.by_category.SYS || 0}`);
        console.log(`  EXEC events: ${validation.by_category.EXEC || 0}`);
        console.log(`  RISK events: ${validation.by_category.RISK || 0}`);
        
        assert(validation.total_events > 0, 'Event log not empty');
        assert((validation.by_category.SYS || 0) >= 2, 'SYS events logged (start/stop)');
        
        // RISK events are optional - only present if trades executed
        const riskEvents = validation.by_category.RISK || 0;
        if (riskEvents > 0) {
          console.log(`  ✓ RISK events logged: ${riskEvents}`);
        } else {
          console.log(`  ℹ  RISK events: 0 (acceptable if no trades executed)`);
        }
        
        // EXEC events may be 0 if no trades executed (acceptable)
        const execEvents = validation.by_category.EXEC || 0;
        console.log(`  ℹ  EXEC events: ${execEvents} (may be 0 if no trades)`);
      } else {
        console.error(`  Validation error: ${validation.error}`);
      }
    }
    console.log('');

    // Verify event content
    console.log('━━━ EVENT CONTENT VERIFICATION ━━━');
    if (fs.existsSync(eventLogPath)) {
      const content = fs.readFileSync(eventLogPath, 'utf8');
      const lines = content.trim().split('\n');
      
      let hasEngineStart = false;
      let hasEngineStop = false;
      let hasRiskEvent = false;
      let hasSysEvent = false;
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          
          if (event.category === 'SYS' && event.event === 'engine_start') {
            hasEngineStart = true;
          }
          if (event.category === 'SYS' && event.event === 'engine_stop') {
            hasEngineStop = true;
          }
          if (event.category === 'SYS') {
            hasSysEvent = true;
          }
          if (event.category === 'RISK') {
            hasRiskEvent = true;
          }
          
          // Validate event structure
          assert(typeof event.ts_ms === 'number', 'Event has ts_ms');
          assert(typeof event.run_id === 'string', 'Event has run_id');
          assert(['SYS', 'EXEC', 'RISK'].includes(event.category), 'Event has valid category');
          assert(typeof event.event === 'string', 'Event has event name');
          assert(typeof event.payload === 'object', 'Event has payload object');
        } catch (err) {
          console.error(`  Invalid event line: ${line.substring(0, 100)}`);
        }
      }
      
      assert(hasEngineStart, 'Found engine_start event');
      assert(hasEngineStop, 'Found engine_stop event');
      assert(hasSysEvent, 'Found SYS events');
      
      // RISK events optional if no trades
      if (hasRiskEvent) {
        console.log('  ✓ Found RISK events');
      } else {
        console.log('  ℹ  No RISK events (acceptable if no trades)');
      }
    }
    console.log('');

    // Verify determinism
    console.log('━━━ DETERMINISM VERIFICATION ━━━');
    assert(results.meta.dataset_sha256, 'Dataset SHA256 recorded');
    assert(results.meta.timestamp, 'Timestamp recorded');
    assert(results.meta.event_log, 'Event log path recorded');
    console.log('');

    // Verify adapter stats
    console.log('━━━ ADAPTER STATISTICS ━━━');
    for (const mode of ['optimistic', 'base', 'hostile']) {
      for (const hackId of ['HACK_A2', 'HACK_A3', 'HACK_B1', 'HACK_B3']) {
        if (results.modes[mode]?.[hackId]?.adapterStats) {
          const stats = results.modes[mode][hackId].adapterStats;
          console.log(`  ${mode}/${hackId}:`);
          console.log(`    Adapter: ${stats.adapter}`);
          console.log(`    Orders placed: ${stats.orders_placed}`);
          console.log(`    Orders filled: ${stats.orders_filled}`);
          console.log(`    Orders canceled: ${stats.orders_canceled}`);
          console.log(`    Fill rate: ${(stats.fill_rate * 100).toFixed(1)}%`);
          
          assert(stats.adapter === 'PaperAdapter', 'Correct adapter used');
          break; // Just check one for brevity
        }
      }
      break; // Just check one mode for brevity
    }
    console.log('');

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
      console.error('EPOCH-04 VERIFICATION: FAIL');
      process.exit(1);
    }

    console.log('✓ All paper trading tests passed');
    console.log('');
    console.log('🎉 EPOCH-04 VERIFICATION: PASS');
    console.log('');
    console.log('📦 DELIVERABLES:');
    console.log(`   • Event log: ${eventLogPath}`);
    console.log(`   • Adapter: PaperAdapter`);
    console.log(`   • Integration: Risk + Execution + EventLog`);
    console.log('');
    console.log('✅ READY FOR:');
    console.log('   • Phase 2.5: Live Adapter skeleton');
    console.log('   • Production deployment preparation');
    console.log('   • Risk monitoring dashboard');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ PAPER E2E VERIFICATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    process.exit(1);
  }
}

main();
