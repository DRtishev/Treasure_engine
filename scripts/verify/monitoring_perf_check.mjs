#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { SafetyMonitor } from '../../core/monitoring/safety_monitor.mjs';
import { PerformanceEngine } from '../../core/performance/perf_engine.mjs';
import schema from '../../truth/monitoring_report.schema.json' with { type: 'json' };

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
}

function makeAdapter() {
  return {
    maxPositionSizeUsd: 1000,
    maxDailyLossUsd: 100,
    currentPositionSize: 300,
    dailyPnL: -20,
    emergencyStop: false,
    getStats() {
      return {
        current_position_usd: this.currentPositionSize,
        daily_pnl: this.dailyPnL,
      };
    },
  };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-20 MONITORING/PERF CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const now = () => 1700000000000;
  const adapter = makeAdapter();
  const monitor = new SafetyMonitor(adapter, { enabled: false, nowProvider: now });

  monitor.recordOrder({ status: 'filled' });
  monitor.recordOrder({ status: 'filled' });
  monitor.recordOrder({ status: 'blocked' });
  monitor.checkSafety();
  const monitorReport1 = monitor.toReport();
  const monitorReport2 = monitor.toReport();

  assert(JSON.stringify(monitorReport1) === JSON.stringify(monitorReport2), 'monitoring report deterministic under frozen clock');
  assert(Number.isFinite(monitorReport1.safety_score), 'monitoring safety score is finite');
  assert(monitorReport1.reject_ratio >= 0 && monitorReport1.reject_ratio <= 1, 'monitoring reject ratio bounded [0,1]');

  const perf = new PerformanceEngine({ nowProvider: now });
  await perf.execute(async () => 'ok', { cacheable: true, cacheKey: 'k1' });
  await perf.execute(async () => 'ok', { cacheable: true, cacheKey: 'k1' });
  const perfReport1 = perf.toReport();
  const perfReport2 = perf.toReport();

  assert(JSON.stringify(perfReport1) === JSON.stringify(perfReport2), 'performance report deterministic under frozen clock');
  assert(perfReport1.no_nan_inf === true, 'performance report has no NaN/Inf metrics');

  const report = { monitoring: monitorReport1, performance: perfReport1 };
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(report);
  assert(valid === true, 'monitoring/performance report passes schema');
  if (!valid) {
    console.error(JSON.stringify(validate.errors, null, 2));
  }

  const outPath = path.join('reports', 'monitoring_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`WROTE: ${outPath}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
