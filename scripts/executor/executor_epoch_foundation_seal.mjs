import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence', `EPOCH-FOUNDATION-${RUN_ID}`);
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:foundation:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const headProbe = runBounded('git rev-parse HEAD', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const HEAD_SHA = headProbe.ec === 0 ? String(headProbe.stdout || '').trim() : 'UNKNOWN';

const steps = [
  'npm run -s epoch:mega:proof:x2',
  'npm run -s verify:regression:no-network-in-verify-profit',
  'npm run -s verify:regression:no-unbounded-spawn',
  'npm run -s verify:regression:node22-wrapper-timeout',
  'npm run -s verify:regression:mega-proof-x2-stability-contract',
  'npm run -s verify:regression:foundation-suite-x2-seal',
  'npm run -s verify:regression:bounded-kill-tree',
  'npm run -s verify:regression:evidence-bundle-deterministic-x2',
];

function readSubstepReason() {
  const p = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json');
  if (!fs.existsSync(p)) return '';
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return String(j.reason_code || '').trim();
  } catch {
    return '';
  }
}

function toMs(iso) {
  const value = Date.parse(String(iso || ''));
  return Number.isFinite(value) ? value : null;
}

function collectEvidencePaths() {
  const base = `reports/evidence/EPOCH-FOUNDATION-${RUN_ID}`;
  const candidates = [
    `${base}/FOUNDATION_SEAL.md`,
    `${base}/gates/manual/foundation_seal.json`,
    'reports/evidence/EXECUTOR/MEGA_PROOF_X2.md',
    'reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json',
    `${base}/FOUNDATION_TIMEOUT_TRIAGE.md`,
    `${base}/gates/manual/foundation_timeout_triage.json`,
  ];
  return candidates.filter((relPath) => fs.existsSync(path.join(ROOT, relPath))).sort((a, b) => a.localeCompare(b));
}

const records = [];
let status = 'PASS';
let reason_code = 'NONE';
let firstFailingSubstepIndex = null;
let firstFailingCmd = null;

const forcedReason = String(process.env.FOUNDATION_FORCE_REASON || '').trim();
if (forcedReason) {
  status = 'BLOCKED';
  reason_code = forcedReason;
}

if (status === 'PASS') for (const [index, cmd] of steps.entries()) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 32 * 1024 * 1024 });
  const startedAtMs = toMs(r.startedAt);
  const completedAtMs = toMs(r.completedAt);
  const elapsedMs = Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs) ? Math.max(0, completedAtMs - startedAtMs) : null;
  records.push({
    step_index: index + 1,
    cmd,
    ec: r.ec,
    timedOut: Boolean(r.timedOut),
    timeout_ms: r.timeout_ms,
    started_at_iso: r.startedAt,
    completed_at_iso: r.completedAt,
    elapsed_ms: elapsedMs,
  });
  if (r.ec !== 0) {
    status = 'BLOCKED';
    reason_code = r.timedOut ? 'TO01' : (readSubstepReason() || `FOUNDATION_STEP_EC_${index + 1}`);
    firstFailingSubstepIndex = index + 1;
    firstFailingCmd = cmd;
    break;
  }
}

writeMd(path.join(EXEC_DIR, 'FOUNDATION_SEAL.md'), `# FOUNDATION_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## STEPS\n${records.map((r) => `- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms} | elapsed_ms=${r.elapsed_ms ?? 'NA'}\n  STARTED_AT: ${r.started_at_iso}\n  COMPLETED_AT: ${r.completed_at_iso}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'foundation_seal.json'), {
  schema_version: '1.1.0',
  head_sha: HEAD_SHA,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  steps: records.map((r) => ({ step_index: r.step_index, cmd: r.cmd, ec: r.ec, timedOut: r.timedOut, timeout_ms: r.timeout_ms, elapsed_ms: r.elapsed_ms })),
});

if (status === 'BLOCKED') {
  const evidencePaths = collectEvidencePaths();
  writeMd(path.join(EXEC_DIR, 'FOUNDATION_TIMEOUT_TRIAGE.md'), `# FOUNDATION_TIMEOUT_TRIAGE.md\n\nSTATUS: BLOCKED\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- first_failing_substep_index: ${firstFailingSubstepIndex}\n- first_failing_cmd: ${firstFailingCmd}\n\n## SUBSTEPS\n${records.map((r) => `- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms} | elapsed_ms=${r.elapsed_ms ?? 'NA'}`).join('\n')}\n\n## EVIDENCE_PATHS\n${evidencePaths.map((p) => `- ${p}`).join('\n')}\n`);
  writeJsonDeterministic(path.join(MANUAL, 'foundation_timeout_triage.json'), {
    schema_version: '1.0.0',
    head_sha: HEAD_SHA,
    status: 'BLOCKED',
    reason_code,
    run_id: RUN_ID,
    next_action: NEXT_ACTION,
    first_failing_substep_index: firstFailingSubstepIndex,
    first_failing_cmd: firstFailingCmd,
    substeps: records.map((r) => ({ step_index: r.step_index, cmd: r.cmd, ec: r.ec, timedOut: r.timedOut, timeout_ms: r.timeout_ms, elapsed_ms: r.elapsed_ms })),
    evidence_paths: evidencePaths,
  });
}

console.log(`[${status}] executor_epoch_foundation_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
