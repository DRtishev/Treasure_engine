/**
 * regression_auto04_apply_unlock_required.mjs — RG_AUTO04_APPLY_UNLOCK_REQUIRED
 *
 * Gate: autopilot_court_v2.mjs must emit BLOCKED AUTO04 (EC=2) when
 *       --apply is passed WITHOUT a valid token file.
 *
 * Three sub-cases tested:
 *   Case 1: --apply with NO token file => BLOCKED AUTO04 (EC=2)
 *   Case 2: --apply with WRONG content token file => BLOCKED AUTO04 (EC=2)
 *   Case 3: token file with CORRECT content (created+cleaned) => EC != 2
 *
 * Surface: CONTRACT
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const APPLY_TOKEN_PATH = path.join(ROOT, 'artifacts', 'incoming', 'APPLY_AUTOPILOT');
const AP_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'autopilot_court_v2.mjs');

const checks = [];

function runAutopilot(args = [], tokenContent = null) {
  // Ensure artifacts/incoming dir exists
  fs.mkdirSync(path.join(ROOT, 'artifacts', 'incoming'), { recursive: true });

  // Set up token file state
  const hadToken = fs.existsSync(APPLY_TOKEN_PATH);
  const savedContent = hadToken ? fs.readFileSync(APPLY_TOKEN_PATH, 'utf8') : null;

  try {
    if (tokenContent === null) {
      // Remove token if it exists
      if (fs.existsSync(APPLY_TOKEN_PATH)) fs.rmSync(APPLY_TOKEN_PATH);
    } else {
      fs.writeFileSync(APPLY_TOKEN_PATH, tokenContent, 'utf8');
    }

    const r = spawnSync(process.execPath, [AP_SCRIPT, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env },
    });
    return { ec: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
  } finally {
    // Restore original token state
    if (hadToken && savedContent !== null) {
      fs.writeFileSync(APPLY_TOKEN_PATH, savedContent, 'utf8');
    } else if (tokenContent !== null && !hadToken) {
      // Remove the temporary token we created
      if (fs.existsSync(APPLY_TOKEN_PATH)) fs.rmSync(APPLY_TOKEN_PATH);
    }
  }
}

// Check 0: Script exists
const scriptExists = fs.existsSync(AP_SCRIPT);
checks.push({ check: 'autopilot_script_exists', pass: scriptExists, detail: AP_SCRIPT });

if (scriptExists) {
  // Case 1: --apply with NO token file => must emit BLOCKED AUTO04 (EC=2)
  const case1 = runAutopilot(['--apply'], null);
  const case1Pass = case1.ec === 2;
  const case1HasAuto04 = case1.stdout.includes('AUTO04') || case1.stderr.includes('AUTO04');
  checks.push({
    check: 'case1_apply_no_token_ec2',
    pass: case1Pass,
    detail: `--apply + no token => expect EC=2, got EC=${case1.ec}`,
  });
  checks.push({
    check: 'case1_apply_no_token_auto04_code',
    pass: case1HasAuto04,
    detail: `--apply + no token => AUTO04 code in output (got: ${case1.stdout.slice(0, 120).trim()})`,
  });

  // Case 2: --apply with WRONG content => must emit BLOCKED AUTO04 (EC=2)
  const case2 = runAutopilot(['--apply'], 'WRONG_CONTENT');
  const case2Pass = case2.ec === 2;
  const case2HasAuto04 = case2.stdout.includes('AUTO04') || case2.stderr.includes('AUTO04');
  checks.push({
    check: 'case2_apply_wrong_token_ec2',
    pass: case2Pass,
    detail: `--apply + wrong token content => expect EC=2, got EC=${case2.ec}`,
  });
  checks.push({
    check: 'case2_apply_wrong_token_auto04_code',
    pass: case2HasAuto04,
    detail: `--apply + wrong token => AUTO04 code in output`,
  });

  // Case 3: --apply with CORRECT content => must NOT be EC=2 (apply allowed)
  const case3 = runAutopilot(['--apply'], 'APPLY_AUTOPILOT: YES');
  const case3Pass = case3.ec !== 2;
  checks.push({
    check: 'case3_apply_correct_token_not_blocked',
    pass: case3Pass,
    detail: `--apply + correct token => expect EC != 2, got EC=${case3.ec}`,
  });

  // Case 4: no --apply flag (dry-run) => must not be EC=2
  const case4 = runAutopilot([], null);
  const case4Pass = case4.ec === 0;
  checks.push({
    check: 'case4_dry_run_no_apply_ec0',
    pass: case4Pass,
    detail: `no --apply => expect EC=0 (dry-run), got EC=${case4.ec}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AUTO04_APPLY_UNLOCK_REQUIRED';

const mdContent = [
  '# REGRESSION_AUTO04_APPLY_UNLOCK_REQUIRED.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_AUTO04_APPLY_UNLOCK_REQUIRED.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_auto04_apply_unlock_required.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AUTO04_APPLY_UNLOCK_REQUIRED',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  cases_tested: ['case1_no_token', 'case2_wrong_content', 'case3_correct_content', 'case4_dry_run'],
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_auto04_apply_unlock_required — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
