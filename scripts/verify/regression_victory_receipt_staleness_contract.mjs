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
  checks.seal_has_head_sha = typeof seal.head_sha === 'string' && seal.head_sha.length > 0;
  checks.triage_has_head_sha = typeof triage.head_sha === 'string' && triage.head_sha.length > 0;
  checks.same_run_id = String(seal.run_id || '') === String(triage.run_id || '');
  checks.triage_head_current_or_blocked_same_cycle = String(triage.head_sha || '') === currentHead
    || (seal.authoritative_run === false && String(seal.status || '') === 'BLOCKED' && checks.same_run_id);
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_STL01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_RECEIPT_STALENESS_CONTRACT.md'), `# REGRESSION_VICTORY_RECEIPT_STALENESS_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_receipt_staleness_contract.json'), {
  schema_version: '1.0.0',
  head_sha: currentHead,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});
console.log(`[${status}] regression_victory_receipt_staleness_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
