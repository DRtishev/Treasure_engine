import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan } from './victory_steps.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const victoryTestMode = process.env.VICTORY_TEST_MODE === '1';
const stepPlan = getVictoryStepPlan(victoryTestMode);
const headProbe = runBounded('git rev-parse HEAD', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const HEAD_SHA = headProbe.ec === 0 ? String(headProbe.stdout || '').trim() : 'UNKNOWN';
const recs = [];
let status = 'PASS';
let reason_code = 'NONE';
let firstFailingStepIndex = null;
let firstFailingCmd = null;

const BASELINE_SAFETY_MD_REL = 'reports/evidence/EXECUTOR/BASELINE_SAFETY.md';
const BASELINE_SAFETY_JSON_REL = 'reports/evidence/EXECUTOR/gates/manual/baseline_safety.json';

function toMs(iso) {
  const value = Date.parse(String(iso || ''));
  return Number.isFinite(value) ? value : null;
}

function readIfExists(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, 'utf8');
}

function restorePreserved(relPath, content) {
  if (typeof content !== 'string') return;
  const absPath = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
}

function collectEvidencePaths() {
  const candidates = [
    'reports/evidence/EXECUTOR/VICTORY_PRECHECK.md',
    'reports/evidence/EXECUTOR/gates/manual/victory_precheck.json',
    'reports/evidence/EXECUTOR/VICTORY_SEAL.md',
    'reports/evidence/EXECUTOR/gates/manual/victory_seal.json',
    BASELINE_SAFETY_MD_REL,
    BASELINE_SAFETY_JSON_REL,
    'reports/evidence/EXECUTOR/FOUNDATION_SEAL.md',
    'reports/evidence/EXECUTOR/gates/manual/foundation_seal.json',
    'reports/evidence/EXECUTOR/EXECUTION_FORENSICS.md',
    'reports/evidence/EXECUTOR/NETKILL_LEDGER.json',
    'reports/evidence/EXECUTOR/NETKILL_LEDGER_SUMMARY.json',
    'artifacts/incoming/NETKILL_LEDGER.sha256',
    'reports/evidence/EXECUTOR/VICTORY_TIMEOUT_TRIAGE.md',
    'reports/evidence/EXECUTOR/gates/manual/victory_timeout_triage.json',
  ];
  return candidates.filter((p) => fs.existsSync(path.join(ROOT, p))).sort((a, b) => a.localeCompare(b));
}

const preservedBaselineSafetyMd = readIfExists(BASELINE_SAFETY_MD_REL);
const preservedBaselineSafetyJson = readIfExists(BASELINE_SAFETY_JSON_REL);

for (const step of stepPlan) {
  const r = runBounded(step.cmd, { cwd: ROOT, env: process.env, timeoutMs: step.timeout_ms, maxBuffer: 64 * 1024 * 1024 });
  const startedAtMs = toMs(r.startedAt);
  const completedAtMs = toMs(r.completedAt);
  const elapsedMs = Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs) ? Math.max(0, completedAtMs - startedAtMs) : null;
  recs.push({
    step_index: step.step_index,
    cmd: step.cmd,
    ec: r.ec,
    timedOut: Boolean(r.timedOut),
    timeout_ms: r.timeout_ms,
    elapsed_ms: elapsedMs,
  });
  if (r.ec !== 0) {
    firstFailingStepIndex = step.step_index;
    firstFailingCmd = step.cmd;
    if (step.cmd.includes('verify:public:data:readiness') && r.ec === 2) {
      status = 'NEEDS_DATA';
      reason_code = 'RDY01';
    } else {
      status = 'BLOCKED';
      reason_code = r.timedOut ? 'TO01' : 'EC01';
    }
    break;
  }
}

restorePreserved(BASELINE_SAFETY_MD_REL, preservedBaselineSafetyMd);
restorePreserved(BASELINE_SAFETY_JSON_REL, preservedBaselineSafetyJson);

const evidencePaths = collectEvidencePaths();

writeMd(path.join(EXEC_DIR, 'VICTORY_TIMEOUT_TRIAGE.md'), `# VICTORY_TIMEOUT_TRIAGE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- triage_mode: true\n- first_failing_step_index: ${firstFailingStepIndex ?? 'NONE'}\n- first_failing_cmd: ${firstFailingCmd ?? 'NONE'}\n\n## STEPS\n${recs.map((r)=>`- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms} | elapsed_ms=${r.elapsed_ms ?? 'NA'}`).join('\n')}\n\n## EVIDENCE_PATHS\n${evidencePaths.map((p) => `- ${p}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'victory_timeout_triage.json'), {
  schema_version: '1.2.0',
  head_sha: HEAD_SHA,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  triage_mode: true,
  first_failing_step_index: firstFailingStepIndex,
  first_failing_cmd: firstFailingCmd,
  timeout_step_index: reason_code === 'TO01' ? firstFailingStepIndex : null,
  timeout_cmd: reason_code === 'TO01' ? firstFailingCmd : null,
  steps: recs,
  evidence_paths: evidencePaths,
});

console.log(`[${status}] executor_epoch_victory_triage — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : (status === 'NEEDS_DATA' ? 2 : 1));
