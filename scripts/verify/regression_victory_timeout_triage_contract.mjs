import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const sealPath = path.join(MANUAL, 'victory_seal.json');
const triagePath = path.join(MANUAL, 'victory_timeout_triage.json');
const headProbe = runBounded('git rev-parse HEAD', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const currentHead = headProbe.ec === 0 ? String(headProbe.stdout || '').trim() : 'UNKNOWN';

const checks = {
  victory_seal_exists: fs.existsSync(sealPath),
  triage_receipt_exists: fs.existsSync(triagePath),
};

if (checks.victory_seal_exists && checks.triage_receipt_exists) {
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  const triage = JSON.parse(fs.readFileSync(triagePath, 'utf8'));
  const triagePaths = Array.isArray(triage.evidence_paths) ? triage.evidence_paths : [];
  const sortedTriagePaths = [...triagePaths].sort((a, b) => String(a).localeCompare(String(b)));

  checks.triage_has_first_failing_step_index = Number.isInteger(triage.first_failing_step_index) || triage.first_failing_step_index === null;
  checks.triage_has_first_failing_cmd = typeof triage.first_failing_cmd === 'string' || triage.first_failing_cmd === null;
  checks.triage_has_steps = Array.isArray(triage.steps) && triage.steps.length > 0;
  checks.triage_steps_have_elapsed_ms = Array.isArray(triage.steps) && triage.steps.every((step) => Object.hasOwn(step, 'elapsed_ms'));
  checks.triage_evidence_paths_array = Array.isArray(triage.evidence_paths);
  checks.triage_evidence_paths_sorted = JSON.stringify(triagePaths) === JSON.stringify(sortedTriagePaths);
  checks.triage_head_sha_present = typeof triage.head_sha === 'string' && triage.head_sha.length > 0;
  checks.same_run_cycle = String(seal.run_id || '') === String(triage.run_id || '');
  checks.head_sha_match_or_non_authoritative = String(triage.head_sha || '') === currentHead
    || (seal.authoritative_run === false && String(seal.status || '') === 'BLOCKED' && checks.same_run_cycle);

  if (String(seal.reason_code) === 'TO01') {
    checks.timeout_step_index_present = Number.isInteger(seal.timeout_step_index);
    checks.timeout_cmd_present = typeof seal.timeout_cmd === 'string' && seal.timeout_cmd.length > 0;
    checks.timeout_elapsed_ms_present = Number.isFinite(Number(seal.timeout_elapsed_ms));
    checks.timeout_ms_present = Number.isFinite(Number(seal.timeout_ms));
    checks.triage_matches_timeout_step = triage.first_failing_step_index === seal.timeout_step_index;
    checks.triage_matches_timeout_cmd = triage.first_failing_cmd === seal.timeout_cmd;
  }
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TO02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_TIMEOUT_TRIAGE_CONTRACT.md'), `# REGRESSION_VICTORY_TIMEOUT_TRIAGE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_timeout_triage_contract.json'), {
  schema_version: '1.2.0',
  head_sha: currentHead,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});
console.log(`[${status}] regression_victory_timeout_triage_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
