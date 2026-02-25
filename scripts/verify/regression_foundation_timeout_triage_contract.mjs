import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const foundationSealPath = path.join(MANUAL, 'foundation_seal.json');
const foundationTriagePath = path.join(MANUAL, 'foundation_timeout_triage.json');
const head = (process.env.GIT_HEAD_SHA || '').trim() || String((() => {
  try { return fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim(); } catch { return ''; }
})());

const checks = {
  foundation_seal_exists: fs.existsSync(foundationSealPath),
};

if (checks.foundation_seal_exists) {
  const seal = JSON.parse(fs.readFileSync(foundationSealPath, 'utf8'));
  checks.foundation_reason_code = String(seal.reason_code || 'NONE');
  if (checks.foundation_reason_code !== 'NONE') {
    checks.foundation_timeout_triage_exists = fs.existsSync(foundationTriagePath);
    if (checks.foundation_timeout_triage_exists) {
      const triage = JSON.parse(fs.readFileSync(foundationTriagePath, 'utf8'));
      const triagePaths = Array.isArray(triage.evidence_paths) ? triage.evidence_paths : [];
      checks.triage_has_first_failing_substep_index = Number.isInteger(triage.first_failing_substep_index);
      checks.triage_has_first_failing_cmd = typeof triage.first_failing_cmd === 'string' && triage.first_failing_cmd.length > 0;
      checks.triage_substeps_present = Array.isArray(triage.substeps) && triage.substeps.length > 0;
      checks.triage_substeps_have_elapsed_ms = Array.isArray(triage.substeps) && triage.substeps.every((s) => Object.hasOwn(s, 'elapsed_ms'));
      checks.triage_evidence_paths_sorted = JSON.stringify(triagePaths) === JSON.stringify([...triagePaths].sort((a, b) => String(a).localeCompare(String(b))));
      checks.triage_head_sha_present = typeof triage.head_sha === 'string' && triage.head_sha.length > 0;
      checks.triage_head_sha_current_or_blocked = triage.head_sha === seal.head_sha || String(seal.status) === 'BLOCKED';
    }
  }
}

const ok = Object.entries(checks)
  .filter(([k]) => k !== 'foundation_reason_code')
  .every(([, v]) => typeof v === 'boolean' ? v : true);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_FTR01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_FOUNDATION_TIMEOUT_TRIAGE_CONTRACT.md'), `# REGRESSION_FOUNDATION_TIMEOUT_TRIAGE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_foundation_timeout_triage_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});
console.log(`[${status}] regression_foundation_timeout_triage_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
