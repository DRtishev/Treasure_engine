/**
 * regression_ob_okx14_align_determinism_x2.mjs — RG_OB_OKX14_ALIGN_DETERMINISM_X2
 *
 * Gate: Run align engine twice and verify outputs are byte-identical.
 *       Determinism is required for CERT mode — any non-determinism fails.
 *
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx14-align-determinism-x2';
const ALIGN_SCRIPT = path.join(ROOT, 'scripts', 'edge', 'edge_okx_orderbook_02_align_offline.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

function findLatestAlignEpoch() {
  if (!fs.existsSync(EVIDENCE_DIR)) return null;
  const dirs = fs.readdirSync(EVIDENCE_DIR)
    .filter((d) => d.startsWith('EPOCH-R2-ALIGN-'))
    .sort();
  return dirs.length > 0 ? path.join(EVIDENCE_DIR, dirs[dirs.length - 1]) : null;
}

function getAlignOutputHash(epochDir) {
  const alignJsonPath = path.join(epochDir, 'ALIGN.json');
  if (!fs.existsSync(alignJsonPath)) return null;
  return sha256(fs.readFileSync(alignJsonPath, 'utf8'));
}

const checks = [];

checks.push({
  check: 'align_script_exists',
  pass: fs.existsSync(ALIGN_SCRIPT),
  detail: fs.existsSync(ALIGN_SCRIPT) ? `align script present — OK` : `MISSING`,
});

if (fs.existsSync(ALIGN_SCRIPT)) {
  // Run 1
  const run1 = spawnSync(
    process.execPath, [ALIGN_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  checks.push({
    check: 'align_run1_exit_zero',
    pass: run1.status === 0,
    detail: run1.status === 0 ? `run1 EC=0 — OK` : `run1 EC=${run1.status}: ${(run1.stderr || '').slice(0, 200)}`,
  });

  const epoch1 = findLatestAlignEpoch();
  const hash1 = epoch1 ? getAlignOutputHash(epoch1) : null;

  // Run 2
  const run2 = spawnSync(
    process.execPath, [ALIGN_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  checks.push({
    check: 'align_run2_exit_zero',
    pass: run2.status === 0,
    detail: run2.status === 0 ? `run2 EC=0 — OK` : `run2 EC=${run2.status}: ${(run2.stderr || '').slice(0, 200)}`,
  });

  const epoch2 = findLatestAlignEpoch();
  const hash2 = epoch2 ? getAlignOutputHash(epoch2) : null;

  if (hash1 && hash2) {
    checks.push({
      check: 'align_output_deterministic_x2',
      pass: hash1 === hash2,
      detail: hash1 === hash2
        ? `ALIGN.json hash run1===run2=${hash1.slice(0, 16)}... — deterministic OK`
        : `NON_DETERMINISTIC: run1=${hash1.slice(0, 16)} run2=${hash2.slice(0, 16)}`,
    });

    // Also verify stdout is identical
    const stdout1 = (run1.stdout || '').trim();
    const stdout2 = (run2.stdout || '').trim();
    // Compare the [PASS] line (strip the run-specific parts if any)
    const passLine1 = stdout1.split('\n').find((l) => l.includes('[PASS]')) || '';
    const passLine2 = stdout2.split('\n').find((l) => l.includes('[PASS]')) || '';
    checks.push({
      check: 'align_stdout_pass_line_identical',
      pass: passLine1 === passLine2 && passLine1.includes('[PASS]'),
      detail: passLine1 === passLine2
        ? `stdout [PASS] line identical — OK`
        : `DIFFERENT: run1=${passLine1.slice(0, 100)} run2=${passLine2.slice(0, 100)}`,
    });
  } else {
    checks.push({
      check: 'align_output_files_accessible',
      pass: false,
      detail: `hash1=${hash1 ? 'OK' : 'FAIL'} hash2=${hash2 ? 'OK' : 'FAIL'}`,
    });
  }

  // Verify ALIGN.json in latest epoch has no time-derived fields
  const latestEpoch = findLatestAlignEpoch();
  if (latestEpoch) {
    const alignJsonPath = path.join(latestEpoch, 'ALIGN.json');
    if (fs.existsSync(alignJsonPath)) {
      const aj = JSON.parse(fs.readFileSync(alignJsonPath, 'utf8'));
      const hasTimeFields = ['ts', 'timestamp', 'time', 'created_at'].some((k) => k in aj);
      checks.push({
        check: 'align_json_no_time_fields',
        pass: !hasTimeFields,
        detail: !hasTimeFields
          ? `ALIGN.json has no ts/timestamp/time fields — tick-only OK`
          : `FAIL: ALIGN.json has time-derived fields`,
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX14_ALIGN_NON_DETERMINISTIC';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX14.md'), [
  '# REGRESSION_OB_OKX14.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- Align engine must produce byte-identical ALIGN.json on repeated runs',
  '- No time-derived fields in ALIGN.json (tick-only requirement)', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx14.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX14_ALIGN_DETERMINISM_X2',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx14_align_determinism_x2 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
