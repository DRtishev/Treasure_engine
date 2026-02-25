import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

fs.mkdirSync(MANUAL, { recursive: true });

const triage = runBounded('npm run -s epoch:victory:triage', {
  cwd: ROOT,
  env: process.env,
  timeoutMs: 30 * 60 * 1000,
  maxBuffer: 64 * 1024 * 1024,
});
const accept = runBounded('npm run -s epoch:victory:seal:accept-restore', {
  cwd: ROOT,
  env: process.env,
  timeoutMs: 30 * 60 * 1000,
  maxBuffer: 64 * 1024 * 1024,
});

const sealPath = path.join(MANUAL, 'victory_seal.json');
const triagePath = path.join(MANUAL, 'victory_timeout_triage.json');
const sealSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const wrapSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal_accept_restore.mjs'), 'utf8');

let sealStatus = 'MISSING';
let sealReason = 'MISSING';
let sealExitCode = null;
let triageStatus = 'MISSING';
let triageReason = 'MISSING';
if (fs.existsSync(sealPath)) {
  const j = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  sealStatus = String(j.status || 'MISSING');
  sealReason = String(j.reason_code || 'MISSING');
  sealExitCode = Number.isFinite(Number(j.exit_code)) ? Number(j.exit_code) : null;
}
if (fs.existsSync(triagePath)) {
  const j = JSON.parse(fs.readFileSync(triagePath, 'utf8'));
  triageStatus = String(j.status || 'MISSING');
  triageReason = String(j.reason_code || 'MISSING');
}

const runtimeAuthoritative = accept.ec === 2 && sealStatus === 'NEEDS_DATA' && sealReason === 'RDY01' && sealExitCode === 2;
const fallbackDirtyTree = sealReason === 'SNAP01';

const checks = {
  triage_needs_data_contract: triage.ec === 2 && triageStatus === 'NEEDS_DATA' && triageReason === 'RDY01',
  seal_static_exit_mapping_has_needs_data_2: sealSrc.includes("process.exit(status === 'PASS' ? 0 : status === 'NEEDS_DATA' ? 2 : 1);") && sealSrc.includes("const exit_code = status === 'PASS' ? 0 : (status === 'NEEDS_DATA' && reason_code === 'RDY01' ? 2 : 1);"),
  wrapper_static_propagates_2: wrapSrc.includes("const propagated_ec = run.ec === 0 ? 0 : (run.ec === 2 ? 2 : 1);") && wrapSrc.includes('process.exit(propagated_ec);'),
  runtime_or_dirty_snap01_path_valid: runtimeAuthoritative || fallbackDirtyTree,
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_VIC_RDY01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_SEAL_NEEDS_DATA_EXITCODE_CONTRACT.md'), `# REGRESSION_VICTORY_SEAL_NEEDS_DATA_EXITCODE_CONTRACT.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${NEXT_ACTION}

${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- triage_ec: ${triage.ec}
- accept_restore_ec: ${accept.ec}
- seal_status: ${sealStatus}
- seal_reason: ${sealReason}
- seal_exit_code: ${sealExitCode ?? 'MISSING'}
`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_seal_needs_data_exitcode_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  triage_ec: triage.ec,
  accept_restore_ec: accept.ec,
  seal_status: sealStatus,
  seal_reason: sealReason,
  seal_exit_code: sealExitCode,
});

console.log(`[${status}] regression_victory_seal_needs_data_exitcode_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
