/**
 * regression_life03_write_scope.mjs — RG_LIFE03_WRITE_SCOPE
 *
 * Gate: life.mjs must write only to EPOCH-LIFE-* and EPOCH-EVENTBUS-LIFE-*
 *       (and sub-scripts write to their own EPOCH-* dirs).
 *       life.mjs itself must NOT write directly to EXECUTOR/.
 *       life.mjs must use writeJsonDeterministic (or writeMd) — no raw Date/mtime.
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const LIFE_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'life.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

const scriptExists = fs.existsSync(LIFE_SCRIPT);
checks.push({ check: 'life_script_exists', pass: scriptExists, detail: LIFE_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(LIFE_SCRIPT, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // Check 1: No direct EXECUTOR writes
  const writesExecutor = nonComment.includes("'EXECUTOR'") || nonComment.includes('"EXECUTOR"')
    || nonComment.includes('EXECUTOR_DIR') || (nonComment.includes('/EXECUTOR/') && !nonComment.includes('// '));
  checks.push({
    check: 'no_direct_executor_writes',
    pass: !writesExecutor,
    detail: writesExecutor ? 'FORBIDDEN: life.mjs writes directly to EXECUTOR' : 'no EXECUTOR writes — OK',
  });

  // Check 2: Writes to EPOCH-LIFE-* (LIFE_SUMMARY)
  const writesLifeEpoch = nonComment.includes('EPOCH-LIFE-') || nonComment.includes('EPOCH_DIR');
  checks.push({ check: 'writes_to_epoch_life', pass: writesLifeEpoch, detail: 'EPOCH-LIFE-* write required' });

  // Check 3: Uses EventBus bus dir (EPOCH-EVENTBUS-LIFE-*)
  const usesLifeBus = nonComment.includes('EPOCH-EVENTBUS-LIFE-') || (nonComment.includes('busDir') && nonComment.includes('LIFE'));
  checks.push({ check: 'uses_epoch_eventbus_life_dir', pass: usesLifeBus, detail: 'EPOCH-EVENTBUS-LIFE-* bus dir required' });

  // Check 4: No wall-clock time (Date, performance.now, hrtime) in non-comment code
  const hasWallClock = nonComment.includes('new Date') || nonComment.includes('Date.now')
    || nonComment.includes('performance.now') || nonComment.includes('process.hrtime');
  checks.push({ check: 'no_wall_clock_in_life', pass: !hasWallClock, detail: hasWallClock ? 'FORBIDDEN: wall-clock in life.mjs' : 'no wall-clock — OK' });

  // Check 5: Uses writeJsonDeterministic (not fs.writeFileSync directly for JSON)
  const usesWriteJson = nonComment.includes('writeJsonDeterministic(') || nonComment.includes('writeMd(');
  checks.push({ check: 'uses_write_json_deterministic', pass: usesWriteJson, detail: 'writeJsonDeterministic/writeMd required for structured output' });

  // Check 6: LIFE_SUMMARY.json exists from a previous run and is in EPOCH-LIFE-*
  const lifeDirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-LIFE-')).sort()
    : [];
  const latestLife = lifeDirs.length > 0 ? lifeDirs[lifeDirs.length - 1] : null;
  const lifeSummaryPath = latestLife ? path.join(EVIDENCE_DIR, latestLife, 'LIFE_SUMMARY.json') : null;
  const lifeSummaryExists = lifeSummaryPath ? fs.existsSync(lifeSummaryPath) : false;
  checks.push({
    check: 'life_summary_in_epoch_life_dir',
    pass: lifeSummaryExists,
    detail: lifeSummaryExists ? path.relative(ROOT, lifeSummaryPath) : 'No LIFE_SUMMARY.json in EPOCH-LIFE-*',
  });

  // Check 7: EPOCH-EVENTBUS-LIFE-* exists
  const lifeBusDirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-LIFE-')).sort()
    : [];
  checks.push({
    check: 'epoch_eventbus_life_dir_exists',
    pass: lifeBusDirs.length > 0,
    detail: lifeBusDirs.length > 0 ? `found: ${lifeBusDirs.join(', ')}` : 'No EPOCH-EVENTBUS-LIFE-* dir found',
  });

  if (lifeSummaryExists) {
    const summary = JSON.parse(fs.readFileSync(lifeSummaryPath, 'utf8'));

    // Check 8: LIFE_SUMMARY has schema_version
    checks.push({
      check: 'summary_has_schema_version',
      pass: summary.schema_version === '1.0.0',
      detail: `schema_version=${summary.schema_version}`,
    });

    // Check 9: No timestamp fields in LIFE_SUMMARY
    const forbiddenRe = /(_at|_ts|_ms|timestamp|elapsed|wall_clock)($|[^a-z])/i;
    const summaryKeys = Object.keys(summary);
    const badKeys = summaryKeys.filter((k) => forbiddenRe.test(k));
    checks.push({
      check: 'summary_no_timestamp_fields',
      pass: badKeys.length === 0,
      detail: badKeys.length === 0 ? 'no forbidden timestamp fields' : `forbidden: ${badKeys.join(', ')}`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LIFE03_WRITE_SCOPE_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_LIFE03_WRITE_SCOPE.md'), [
  '# REGRESSION_LIFE03_WRITE_SCOPE.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_life03_write_scope.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIFE03_WRITE_SCOPE',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_life03_write_scope — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
