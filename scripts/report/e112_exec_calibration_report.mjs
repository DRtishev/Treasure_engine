#!/usr/bin/env node
import { runCostCalibration } from '../../core/execution/e112_cost_calibration.mjs';
import { writeMdAtomic } from '../verify/e112_lib.mjs';

const result = await runCostCalibration(process.env.E112_SYMBOL || 'BTCUSDT');
writeMdAtomic('reports/evidence/E112/EXEC_CALIBRATION.md', [
  '# E112 EXEC CALIBRATION',
  `- symbol: ${result.symbol}`,
  `- source: ${result.source}`,
  `- spread_median_bps: ${result.spread_median_bps}`,
  `- spread_p95_bps: ${result.spread_p95_bps}`,
  `- rtt_median_ms: ${result.rtt_median_ms}`,
  `- rtt_p95_ms: ${result.rtt_p95_ms}`,
  `- fee_bps: ${result.fee_bps}`
].join('\n'));
console.log(`e112_exec_calibration_report: source=${result.source}`);
