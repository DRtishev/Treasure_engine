/**
 * regression_fast_tiers_fast01.mjs — RG_FAST_TIERS_FAST01
 *
 * R3: Verifies verify:fast:instant gate count <= 15 and is a subset of verify:fast.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const checks = [];

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  // Check 1: verify:fast:instant exists
  const instantScript = pkg.scripts['verify:fast:instant'];
  const p1 = !!instantScript;
  checks.push({ check: 'instant_tier_exists', pass: p1,
    detail: p1 ? 'OK' : 'FAIL: verify:fast:instant not in package.json' });

  if (p1) {
    // Count gates in instant tier (each "npm run -s verify:" is one gate)
    const instantGates = (instantScript.match(/npm run -s /g) || []).length;

    // Check 2: gate count <= 15
    const p2 = instantGates <= 15;
    checks.push({ check: 'instant_gate_count_budget', pass: p2,
      detail: `${instantGates} gates (max 15)` });

    // Check 3: all instant gates exist in verify:fast
    const fullScript = pkg.scripts['verify:fast'] || '';
    const instantParts = instantScript.split('&&').map(p => p.trim().replace('npm run -s ', ''));
    const fullParts = fullScript.split('&&').map(p => p.trim().replace('npm run -s ', ''));
    const notInFull = instantParts.filter(p => !fullParts.includes(p));
    const p3 = notInFull.length === 0;
    checks.push({ check: 'instant_is_subset_of_full', pass: p3,
      detail: p3 ? 'OK: all instant gates in verify:fast' : `FAIL: not in fast: ${notInFull.join(', ')}` });
  }

  // Check 4: verify:fast exists and has gates
  const fullScript = pkg.scripts['verify:fast'] || '';
  const fullGates = (fullScript.match(/npm run -s /g) || []).length;
  const p4 = fullGates > 0;
  checks.push({ check: 'full_fast_has_gates', pass: p4,
    detail: `${fullGates} gates in verify:fast` });

} catch (err) {
  checks.push({ check: 'read_package', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_FAST_TIERS_FAST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_FAST_TIERS_FAST01.md'), [
  '# RG_FAST_TIERS_FAST01: Fast Tiers Budget', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_fast_tiers_fast01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_FAST_TIERS_FAST01', status, reason_code, run_id: RUN_ID, checks_total: checks.length, violations: failed.length, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_fast_tiers_fast01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
