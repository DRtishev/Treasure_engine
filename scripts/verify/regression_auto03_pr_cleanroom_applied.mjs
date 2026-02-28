/**
 * regression_auto03_pr_cleanroom_applied.mjs — RG_AUTO03_PR_CLEANROOM_APPLIED
 *
 * Gate: Autopilot apply requires double-key unlock.
 *       PR cleanroom check: .gitignore must cover EPOCH-* evidence dirs.
 *       No tracked EPOCH files in repo (evidence dirs must be gitignored).
 * Surface: PR
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

const apPath = path.join(ROOT, 'scripts', 'ops', 'autopilot_court_v2.mjs');
const gitignorePath = path.join(ROOT, '.gitignore');
const checks = [];

// Check 1: Autopilot script exists
const scriptExists = fs.existsSync(apPath);
checks.push({ check: 'autopilot_script_exists', pass: scriptExists, detail: apPath });

if (scriptExists) {
  const content = fs.readFileSync(apPath, 'utf8');

  // Check 2: Double-key apply unlock implemented
  const hasApplyFlag = content.includes('--apply') || content.includes('APPLY_FLAG');
  checks.push({ check: 'has_apply_flag_check', pass: hasApplyFlag, detail: '--apply flag check required' });

  const hasTokenFile = content.includes('APPLY_AUTOPILOT') || content.includes('APPLY_TOKEN');
  checks.push({ check: 'has_apply_token_file_check', pass: hasTokenFile, detail: 'APPLY_AUTOPILOT token file check required' });

  const hasDoubleKey = hasApplyFlag && hasTokenFile;
  checks.push({ check: 'double_key_unlock_implemented', pass: hasDoubleKey, detail: 'both flag AND token file required for apply' });

  // Check 3: AUTO04 refusal code present
  const hasAuto04 = content.includes('AUTO04_APPLY_UNLOCK_REQUIRED');
  checks.push({ check: 'auto04_refusal_code_present', pass: hasAuto04, detail: 'AUTO04_APPLY_UNLOCK_REQUIRED refusal code required' });

  // Check 4: REFUSAL.md written on unlock failure
  const hasRefusalWrite = content.includes('REFUSAL.md') && content.includes('writeRefusalMd');
  checks.push({ check: 'refusal_md_written_on_failure', pass: hasRefusalWrite, detail: 'REFUSAL.md must be written when apply is refused' });
}

// Check 5: .gitignore covers EPOCH-* (PR cleanroom — no tracked evidence)
const gitignoreExists = fs.existsSync(gitignorePath);
checks.push({ check: 'gitignore_exists', pass: gitignoreExists, detail: '.gitignore required for PR cleanroom' });

if (gitignoreExists) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  const coversEpoch = gitignore.includes('EPOCH-') || gitignore.split('\n').some((l) => l.includes('reports/evidence/EPOCH'));
  checks.push({
    check: 'gitignore_covers_epoch_dirs',
    pass: coversEpoch,
    detail: '.gitignore must cover EPOCH-* dirs under reports/evidence/',
  });

  // Check 6: .gitignore covers APPLY_AUTOPILOT token
  const coversApplyToken = gitignore.includes('APPLY_AUTOPILOT') || gitignore.includes('artifacts/incoming/');
  checks.push({
    check: 'gitignore_covers_apply_token',
    pass: coversApplyToken,
    detail: '.gitignore should cover artifacts/incoming/APPLY_AUTOPILOT',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AUTO03_CLEANROOM_REQUIRED';

const mdContent = [
  '# REGRESSION_AUTO03_PR_CLEANROOM_APPLIED.md',
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

writeMd(path.join(EXEC, 'REGRESSION_AUTO03_PR_CLEANROOM_APPLIED.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_auto03_pr_cleanroom_applied.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AUTO03_PR_CLEANROOM_APPLIED',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_auto03_pr_cleanroom_applied — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
