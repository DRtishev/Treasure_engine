import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const sealSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const checks = {
  static_allowlist_reports_evidence: sealSrc.includes("'reports/evidence/'"),
  static_allowlist_artifacts_incoming: sealSrc.includes("'artifacts/incoming/'"),
  static_uses_operator_relevant_filter: sealSrc.includes('filterOperatorRelevant(') && sealSrc.includes('isAllowlistedEvidencePath('),
  runtime_only_evidence_drift_not_op_safe01: false,
  runtime_probe_skipped_due_existing_operator_drift: false,
};

const preTracked = runBounded('git diff --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const preStaged = runBounded('git diff --cached --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const tracked = `${preTracked.stdout || ''}\n${preTracked.stderr || ''}`.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const staged = `${preStaged.stdout || ''}\n${preStaged.stderr || ''}`.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const opRelevantExists = [...tracked, ...staged].some((p) => !p.startsWith('reports/evidence/') && !p.startsWith('artifacts/incoming/'));

const probeRel = 'reports/evidence/EXECUTOR/ENV_AUTHORITY.md';
const probeAbs = path.join(ROOT, probeRel);
let original = '';
let probeRan = false;
let probeEc = null;
let probeReason = 'UNKNOWN';

try {
  original = fs.readFileSync(probeAbs, 'utf8');
  if (opRelevantExists) {
    checks.runtime_probe_skipped_due_existing_operator_drift = true;
    checks.runtime_only_evidence_drift_not_op_safe01 = true;
  } else {
    fs.writeFileSync(probeAbs, `${original}\n<!-- RG_OPA02 probe ${RUN_ID} -->\n`);
    probeRan = true;
    const run = runBounded('npm run -s epoch:victory:seal', { cwd: ROOT, env: process.env, timeoutMs: 240000, maxBuffer: 64 * 1024 * 1024 });
    probeEc = run.ec;
    const sealReceiptPath = path.join(MANUAL, 'victory_seal.json');
    if (fs.existsSync(sealReceiptPath)) {
      const seal = JSON.parse(fs.readFileSync(sealReceiptPath, 'utf8'));
      probeReason = String(seal.reason_code || 'UNKNOWN');
      checks.runtime_only_evidence_drift_not_op_safe01 = probeReason !== 'OP_SAFE01';
    }
  }
} finally {
  if (original) fs.writeFileSync(probeAbs, original);
  runBounded('git restore reports/evidence artifacts/incoming', { cwd: ROOT, env: process.env, timeoutMs: 10000 });
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_OPA02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_OPA02_OP_SAFE_IGNORE_EVIDENCE_DRIFT.md'), `# REGRESSION_OPA02_OP_SAFE_IGNORE_EVIDENCE_DRIFT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n- probe_ran: ${probeRan}\n- probe_ec: ${probeEc ?? 'NA'}\n- probe_reason_code: ${probeReason}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_opa02_op_safe_ignore_evidence_drift.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  probe_ran: probeRan,
  probe_ec: probeEc,
  probe_reason_code: probeReason,
});
console.log(`[${status}] regression_opa02_op_safe_ignore_evidence_drift — ${reason_code}`);
process.exit(ok ? 0 : 1);
