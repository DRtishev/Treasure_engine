#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeState, writeMdAtomic } from '../verify/e112_lib.mjs';

const mode = modeState();
const t = fs.readFileSync(path.resolve('reports/evidence/E112/EXEC_CALIBRATION.md'), 'utf8');
const v = (k) => Number((t.match(new RegExp(`- ${k}:\\s*([0-9.]+)`)) || [])[1] || 0);
const source = (t.match(/- source:\s*(\S+)/) || [])[1] || 'unknown';
const reasons = [];
if (v('spread_median_bps') <= 0 || v('spread_p95_bps') <= 0) reasons.push('NON_POSITIVE_SPREAD');
if (v('rtt_median_ms') <= 0 || v('rtt_p95_ms') <= 0) reasons.push('NON_POSITIVE_RTT');
if (mode === 'ONLINE_REQUIRED' && source !== 'live_public_bybit') reasons.push('ONLINE_REQUIRED_NO_LIVE_CALIBRATION');
if (mode === 'ONLINE_REQUIRED' && v('spread_median_bps') < 0.01) reasons.push('TOO_PERFECT_SPREAD_ONLINE_REQUIRED');
const pass = reasons.length === 0;
writeMdAtomic(path.resolve('reports/evidence/E112/GAP_COST_REPORT.md'), [
  '# E112 GAP COST REPORT',
  `- mode: ${mode}`,
  `- source: ${source}`,
  `- status: ${pass ? 'PASS' : 'FAIL'}`,
  '## Reasons',
  ...(pass ? ['- NONE'] : reasons.map(r => `- ${r}`))
].join('\n'));
if (!pass) throw new Error('E112_GAP_COST_CONTRACT_V2_FAIL');
console.log('e112_gap_cost_contract_v2: PASS');
