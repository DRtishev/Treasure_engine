/**
 * regression_court_wiring01_sweep_uses_pipeline.mjs — RG_COURT_WIRING01
 *
 * SPRINT-0 regression gate: Ensures strategy_sweep.mjs imports and calls
 * runEdgeLabPipeline from core/edge_lab/pipeline.mjs.
 *
 * Prevents FINDING-B recurrence: courts must be wired into sweep pipeline.
 *
 * Checks:
 *   1. strategy_sweep.mjs imports runEdgeLabPipeline
 *   2. strategy_sweep.mjs calls runEdgeLabPipeline(
 *   3. strategy_sweep.mjs attaches court_verdicts to candidateData
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_court_wiring01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:court-wiring01-sweep-uses-pipeline';
const checks = [];

const SWEEP_PATH = path.join(ROOT, 'scripts/edge/strategy_sweep.mjs');

if (!fs.existsSync(SWEEP_PATH)) {
  checks.push({ check: 'sweep_exists', pass: false, detail: 'FAIL: strategy_sweep.mjs not found' });
} else {
  const src = fs.readFileSync(SWEEP_PATH, 'utf8');

  // Check 1: imports runEdgeLabPipeline
  const hasImport = /import\s*\{[^}]*runEdgeLabPipeline[^}]*\}\s*from\s*['"][^'"]*pipeline\.mjs['"]/.test(src);
  checks.push({
    check: 'imports_runEdgeLabPipeline',
    pass: hasImport,
    detail: hasImport ? 'OK: runEdgeLabPipeline imported from pipeline.mjs' : 'FAIL: runEdgeLabPipeline not imported',
  });

  // Check 2: calls runEdgeLabPipeline(
  const hasCall = /runEdgeLabPipeline\s*\(/.test(src);
  checks.push({
    check: 'calls_runEdgeLabPipeline',
    pass: hasCall,
    detail: hasCall ? 'OK: runEdgeLabPipeline() called' : 'FAIL: runEdgeLabPipeline() not called',
  });

  // Check 3: attaches court_verdicts to candidateData
  const hasCourtVerdicts = /court_verdicts\s*[:=]/.test(src);
  checks.push({
    check: 'attaches_court_verdicts',
    pass: hasCourtVerdicts,
    detail: hasCourtVerdicts ? 'OK: court_verdicts attached to candidate' : 'FAIL: court_verdicts not found in candidateData',
  });
}

// Verdict
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_COURT_WIRING01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_COURT_WIRING01.md'), [
  '# RG_COURT_WIRING01: Strategy Sweep Uses Edge Lab Pipeline', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_court_wiring01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COURT_WIRING01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_court_wiring01_sweep_uses_pipeline — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
