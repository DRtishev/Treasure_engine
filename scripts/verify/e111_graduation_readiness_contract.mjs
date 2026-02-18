#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const s = JSON.parse(fs.readFileSync(path.resolve('.cache/e111/graduation_summary.json'), 'utf8'));
const fails = [];
if (s.live.kill_switch_breached) fails.push('KILL_SWITCH_BREACH');
if (s.live.max_drawdown > 0.08) fails.push('MAX_DRAWDOWN_EXCEEDED');
if (s.gapCost.total_cost_bps > 25) fails.push('COST_IMPACT_HIGH');
if (s.live.end_equity < s.live.start_equity * 0.95) fails.push('OOS_COLLAPSE');
const pass = fails.length === 0;
console.log(`e111_graduation_readiness_contract: ${pass ? 'PASS' : 'FAIL'}`);
if (!pass) {
  for (const f of fails) console.log(`  FAIL ${f}`);
  process.exit(1);
}
