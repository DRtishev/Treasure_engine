/**
 * regression_pr07_executor_runid_immutable.mjs — RG_PR07_EXECUTOR_RUNID_IMMUTABLE
 *
 * Proves that writeMd() and writeJsonDeterministic() normalize run_id to
 * 'STABLE' when writing to EXECUTOR paths, preventing git churn.
 *
 * Checks:
 *   1) Determinism probe (MD): two different simulated RUN_IDs produce
 *      byte-identical output when written via writeMd to an EXECUTOR path.
 *   2) Determinism probe (JSON): same for writeJsonDeterministic.
 *   3) canon.mjs exports EXECUTOR_RUN_ID === 'STABLE'.
 *   4) Non-EXECUTOR path is NOT normalized (writeMd preserves real RUN_ID).
 *
 * Gate ID : RG_PR07_EXECUTOR_RUNID_IMMUTABLE
 * Wired   : verify:fast
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, EXECUTOR_RUN_ID, RUN_ID } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import os from 'node:os';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PR07_EXECUTOR_RUNID_IMMUTABLE';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// --- Check 1: EXECUTOR_RUN_ID constant is 'STABLE' ---
checks.push({
  check: 'executor_run_id_constant',
  pass: EXECUTOR_RUN_ID === 'STABLE',
  detail: `EXECUTOR_RUN_ID=${EXECUTOR_RUN_ID}`,
});

// --- Check 2: MD determinism probe — two RUN_IDs → identical output ---
const sampleA = [
  '# PROBE.md', '',
  'STATUS: PASS',
  'REASON_CODE: NONE',
  'RUN_ID: aaaa11112222',
  'NEXT_ACTION: npm run -s verify:fast',
].join('\n');

const sampleB = sampleA.replace('aaaa11112222', 'bbbb33334444');
const tmpMd = path.join(EXEC, '_PR07_DETERMINISM_PROBE.md');

writeMd(tmpMd, sampleA);
const mdOut1 = fs.readFileSync(tmpMd, 'utf8');
writeMd(tmpMd, sampleB);
const mdOut2 = fs.readFileSync(tmpMd, 'utf8');
fs.unlinkSync(tmpMd);

checks.push({
  check: 'md_determinism_x2',
  pass: mdOut1 === mdOut2,
  detail: mdOut1 === mdOut2 ? 'byte-identical' : 'MISMATCH',
});

// --- Check 3: MD output contains STABLE, not raw hex ---
const mdHasStable = mdOut1.includes('RUN_ID: STABLE');
checks.push({
  check: 'md_contains_stable',
  pass: mdHasStable,
  detail: mdHasStable ? 'RUN_ID: STABLE present' : 'STABLE not found in output',
});

// --- Check 4: JSON determinism probe — two RUN_IDs → identical output ---
const jsonA = { schema_version: '1.0.0', status: 'PASS', reason_code: 'NONE', run_id: 'aaaa11112222' };
const jsonB = { ...jsonA, run_id: 'bbbb33334444' };
const tmpJson = path.join(MANUAL, '_pr07_determinism_probe.json');

writeJsonDeterministic(tmpJson, jsonA);
const jsonOut1 = fs.readFileSync(tmpJson, 'utf8');
writeJsonDeterministic(tmpJson, jsonB);
const jsonOut2 = fs.readFileSync(tmpJson, 'utf8');
fs.unlinkSync(tmpJson);

checks.push({
  check: 'json_determinism_x2',
  pass: jsonOut1 === jsonOut2,
  detail: jsonOut1 === jsonOut2 ? 'byte-identical' : 'MISMATCH',
});

// --- Check 5: JSON output contains "STABLE", not raw hex ---
const parsed = JSON.parse(jsonOut1);
checks.push({
  check: 'json_contains_stable',
  pass: parsed.run_id === 'STABLE',
  detail: `run_id=${parsed.run_id}`,
});

// --- Check 6: Non-EXECUTOR path must NOT be normalized (safety check) ---
const epochTmp = path.join(os.tmpdir(), `_PR07_PROBE_${RUN_ID}.md`);
let nonExecOut;
try {
  writeMd(epochTmp, sampleA);
  nonExecOut = fs.readFileSync(epochTmp, 'utf8');
} finally {
  try { fs.unlinkSync(epochTmp); } catch { /* OS cleans tmpdir */ }
}
const nonExecPreserved = nonExecOut.includes('RUN_ID: aaaa11112222');
checks.push({
  check: 'non_executor_not_normalized',
  pass: nonExecPreserved,
  detail: nonExecPreserved ? 'non-EXECUTOR paths preserve original RUN_ID' : 'ERROR: non-EXECUTOR path was normalized',
});

// --- Result ---
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_PR07_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_PR07_EXECUTOR_RUNID_IMMUTABLE.md'), [
  '# REGRESSION_PR07_EXECUTOR_RUNID_IMMUTABLE.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_pr07_executor_runid_immutable.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_pr07_executor_runid_immutable — ${reason_code}`);
if (failed.length > 0) {
  for (const c of failed) console.log(`  [FAIL] ${c.check}: ${c.detail}`);
}
process.exit(status === 'PASS' ? 0 : 1);
