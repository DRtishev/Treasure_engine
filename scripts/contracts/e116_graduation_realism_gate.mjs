#!/usr/bin/env node
import fs from 'node:fs';

const p = 'reports/evidence/E116/CANDIDATE_BOARD.md';
if (!fs.existsSync(p)) throw new Error('E116_CANDIDATE_BOARD_MISSING');
const t = fs.readFileSync(p, 'utf8');
const lines = t.split('\n').filter((l) => /^- E108_BRIDGE_BASELINE:/.test(l));
for (const line of lines) {
  const ret = Number((line.match(/return_pct=([-0-9.]+)/) || [])[1]);
  const dd = Number((line.match(/drawdown_pct=([-0-9.]+)/) || [])[1]);
  if (Number.isNaN(ret) || Number.isNaN(dd)) throw new Error('E116_REALISM_SCHEMA_DRIFT');
  if (ret < -5 || dd < -35) throw new Error('E116_REALISM_GATE_FAIL');
}
console.log('e116_graduation_realism_gate: PASS');
