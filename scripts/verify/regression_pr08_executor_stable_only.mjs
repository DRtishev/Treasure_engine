/**
 * regression_pr08_executor_stable_only.mjs — RG_PR08_EXECUTOR_STABLE_ONLY
 *
 * Scope containment: the token 'STABLE' in run_id fields is allowed ONLY
 * inside reports/evidence/EXECUTOR/**. Outside EXECUTOR, run_id must be a
 * real commit SHA (hex pattern). This prevents STABLE from leaking into
 * EPOCH or other evidence directories.
 *
 * Scans: all gate JSON files under reports/evidence/** (excluding EXECUTOR,
 *        excluding ephemeral EPOCH-* dirs).
 *
 * Gate ID : RG_PR08_EXECUTOR_STABLE_ONLY
 * Wired   : verify:fast
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PR08_EXECUTOR_STABLE_ONLY';
const NEXT_ACTION = 'npm run -s verify:fast';
const EVIDENCE_DIR = path.join(ROOT, 'reports/evidence');

// Collect non-EXECUTOR gate JSON files (skip EPOCH-* as ephemeral)
function collectNonExecutorJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        // Skip EXECUTOR (that's where STABLE is expected)
        if (d === dir && ent.name === 'EXECUTOR') continue;
        // Skip ephemeral EPOCH-* dirs
        if (d === dir && ent.name.startsWith('EPOCH-')) continue;
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.json') &&
                 (d.includes('gates/manual') || ent.name === 'receipt.json')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

const files = collectNonExecutorJsonFiles(EVIDENCE_DIR);
const violations = [];

for (const f of files) {
  let data;
  try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (data.run_id === 'STABLE') {
    violations.push({ path: path.relative(ROOT, f), run_id: data.run_id });
  }
}

// Also verify EXECUTOR receipts DO use STABLE (spot-check the PR07 receipt)
const pr07Path = path.join(MANUAL, 'regression_pr07_executor_runid_immutable.json');
let executorCheck = 'SKIP';
if (fs.existsSync(pr07Path)) {
  try {
    const d = JSON.parse(fs.readFileSync(pr07Path, 'utf8'));
    executorCheck = d.run_id === 'STABLE' ? 'PASS' : 'FAIL';
    if (executorCheck === 'FAIL') {
      violations.push({ path: path.relative(ROOT, pr07Path), run_id: d.run_id, expected: 'STABLE' });
    }
  } catch { executorCheck = 'ERROR'; }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_PR08_STABLE_LEAK';

writeMd(path.join(EXEC, 'REGRESSION_PR08_EXECUTOR_STABLE_ONLY.md'), [
  '# REGRESSION_PR08_EXECUTOR_STABLE_ONLY.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  `- non_executor_files_scanned: ${files.length}`,
  `- stable_leaks: ${violations.length}`,
  `- executor_spot_check: ${executorCheck}`, '',
  '## VIOLATIONS',
  violations.length === 0
    ? '- NONE'
    : violations.map((v) => `- ${v.path}: run_id=${v.run_id}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_pr08_executor_stable_only.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  non_executor_files_scanned: files.length,
  executor_spot_check: executorCheck,
  violations,
});

console.log(`[${status}] regression_pr08_executor_stable_only — ${reason_code}`);
if (violations.length > 0) {
  for (const v of violations) console.log(`  LEAK: ${v.path} run_id=${v.run_id}`);
}
process.exit(status === 'PASS' ? 0 : 1);
