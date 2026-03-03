/**
 * regression_strat01_interface.mjs — RG_STRAT01_INTERFACE_CONTRACT
 *
 * EPOCH-73 regression gate. Validates strategy interface contract:
 *   1. s3_importable — dynamic import succeeds
 *   2. s4_importable — dynamic import succeeds
 *   3. s5_importable — dynamic import succeeds
 *   4. s3_meta_valid — meta() returns name, version, default_params, params_schema, assumptions
 *   5. s4_meta_valid — meta() returns name, version, default_params, params_schema, assumptions
 *   6. s5_meta_valid — meta() returns name, version, default_params, params_schema, assumptions
 *   7. s3_init_onbar — init() + onBar() contract valid
 *   8. s4_init_onbar — init() + onBar() contract valid
 *   9. s5_init_onbar — init() + onBar() contract valid
 *  10. enricher_importable — enrichBars() importable and callable
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_strat01_interface.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:strat01-interface-contract';
const checks = [];

const STRATEGIES = [
  { path: '../../core/edge/strategies/s3_liq_vol_fusion.mjs', name: 's3' },
  { path: '../../core/edge/strategies/s4_post_cascade_mr.mjs', name: 's4' },
  { path: '../../core/edge/strategies/s5_multi_regime.mjs', name: 's5' },
];

const META_REQUIRED = ['name', 'version', 'default_params', 'params_schema', 'assumptions'];
const ONBAR_VALID_SIGNALS = ['BUY', 'SELL', 'HOLD'];

// Dummy bar for contract testing
const DUMMY_BAR = { ts_open: 1000, open: 100, high: 101, low: 99, close: 100.5, volume: 50, symbol: 'BTCUSDT' };

// Check enricher
try {
  const enricherMod = await import('../../core/edge/strategies/strategy_bar_enricher.mjs');
  const fn = enricherMod.enrichBars;
  const valid = typeof fn === 'function';
  let enrichResult = false;
  if (valid) {
    const out = fn([DUMMY_BAR]);
    enrichResult = Array.isArray(out) && out.length === 1 && out[0]._liq_pressure != null;
  }
  checks.push({ check: 'enricher_importable', pass: valid && enrichResult, detail: valid && enrichResult ? 'OK: enrichBars() callable, returns enriched bar' : `FAIL: fn=${valid} result=${enrichResult}` });
} catch (e) {
  checks.push({ check: 'enricher_importable', pass: false, detail: `FAIL: ${e.message}` });
}

// Check each strategy
for (const s of STRATEGIES) {
  // Import check
  let mod = null;
  try {
    mod = await import(s.path);
    checks.push({ check: `${s.name}_importable`, pass: true, detail: `OK: dynamic import succeeded` });
  } catch (e) {
    checks.push({ check: `${s.name}_importable`, pass: false, detail: `FAIL: ${e.message}` });
    checks.push({ check: `${s.name}_meta_valid`, pass: false, detail: 'SKIP: import failed' });
    checks.push({ check: `${s.name}_init_onbar`, pass: false, detail: 'SKIP: import failed' });
    continue;
  }

  // Meta check
  try {
    const m = mod.meta();
    const missing = META_REQUIRED.filter(k => !(k in m));
    const valid = missing.length === 0 && typeof m.name === 'string' && typeof m.version === 'string';
    checks.push({ check: `${s.name}_meta_valid`, pass: valid, detail: valid ? `OK: ${m.name} v${m.version}` : `FAIL: missing=[${missing.join(',')}]` });
  } catch (e) {
    checks.push({ check: `${s.name}_meta_valid`, pass: false, detail: `FAIL: ${e.message}` });
  }

  // Init + onBar contract check
  try {
    const state = mod.init(mod.meta().default_params);
    const result = mod.onBar(DUMMY_BAR, state, [DUMMY_BAR]);
    const hasSignal = result && ONBAR_VALID_SIGNALS.includes(result.signal);
    const hasState = result && result.state && typeof result.state === 'object';
    const valid = hasSignal && hasState;
    checks.push({ check: `${s.name}_init_onbar`, pass: valid, detail: valid ? `OK: signal=${result.signal} state=object` : `FAIL: signal=${result?.signal} state=${typeof result?.state}` });
  } catch (e) {
    checks.push({ check: `${s.name}_init_onbar`, pass: false, detail: `FAIL: ${e.message}` });
  }
}

// Verdict
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_STRAT01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_STRAT01_INTERFACE.md'), [
  '# RG_STRAT01_INTERFACE_CONTRACT', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_strat01_interface.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_STRAT01_INTERFACE_CONTRACT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_strat01_interface — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
