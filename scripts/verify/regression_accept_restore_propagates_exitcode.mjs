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

const run = runBounded('npm run -s epoch:victory:seal:accept-restore', {
  cwd: ROOT,
  env: process.env,
  timeoutMs: 30 * 60 * 1000,
  maxBuffer: 64 * 1024 * 1024,
});

const receiptPath = path.join(MANUAL, 'accept_restore_used.json');
const sealPath = path.join(MANUAL, 'victory_seal.json');
const wrapSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal_accept_restore.mjs'), 'utf8');
let statusReceipt = 'MISSING';
let reasonReceipt = 'MISSING';
let propagatedEcReceipt = null;
let sealReason = 'MISSING';
if (fs.existsSync(receiptPath)) {
  const j = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  statusReceipt = String(j.status || 'MISSING');
  reasonReceipt = String(j.reason_code || 'MISSING');
  propagatedEcReceipt = Number.isFinite(Number(j.propagated_ec)) ? Number(j.propagated_ec) : null;
}
if (fs.existsSync(sealPath)) {
  const j = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  sealReason = String(j.reason_code || 'MISSING');
}

const runtimePass = run.ec === 2 && statusReceipt === 'NEEDS_DATA' && reasonReceipt === 'RDY01' && propagatedEcReceipt === 2;

const checks = {
  runtime_propagates_2_when_available: runtimePass || sealReason === 'SNAP01',
  static_wrapper_mapping_uses_2: wrapSrc.includes("const propagated_ec = run.ec === 0 ? 0 : (run.ec === 2 ? 2 : 1);") && wrapSrc.includes('process.exit(propagated_ec);'),
  static_wrapper_receipt_tracks_propagated: wrapSrc.includes('propagated_ec'),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_OPA03';

writeMd(path.join(EXEC_DIR, 'REGRESSION_ACCEPT_RESTORE_PROPAGATES_EXITCODE.md'), `# REGRESSION_ACCEPT_RESTORE_PROPAGATES_EXITCODE.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${NEXT_ACTION}

${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- wrapper_ec: ${run.ec}
- receipt_status: ${statusReceipt}
- receipt_reason: ${reasonReceipt}
- receipt_propagated_ec: ${propagatedEcReceipt ?? 'MISSING'}
- seal_reason: ${sealReason}
`);
writeJsonDeterministic(path.join(MANUAL, 'regression_accept_restore_propagates_exitcode.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  wrapper_ec: run.ec,
  receipt_status: statusReceipt,
  receipt_reason: reasonReceipt,
  receipt_propagated_ec: propagatedEcReceipt,
  seal_reason: sealReason,
});

console.log(`[${status}] regression_accept_restore_propagates_exitcode — ${reason_code}`);
process.exit(ok ? 0 : 1);
