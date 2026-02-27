import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan } from './victory_steps.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_ROOT = path.join(ROOT, 'reports/evidence');
const epochVictoryDirs = fs.existsSync(EVIDENCE_ROOT) ? fs.readdirSync(EVIDENCE_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('EPOCH-VICTORY-'))
  .map((d) => ({name: d.name, mtime: fs.statSync(path.join(EVIDENCE_ROOT, d.name)).mtimeMs}))
  .sort((a, b) => a.mtime - b.mtime) : [];
const latestEpoch = epochVictoryDirs.length ? epochVictoryDirs[epochVictoryDirs.length - 1].name : `EPOCH-VICTORY-${RUN_ID}`;
const EXEC_DIR = path.join(EVIDENCE_ROOT, latestEpoch);
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


function readReasonFromEvidence() {
  const candidates = [
    path.join(MANUAL, 'victory_seal.json'),
    path.join(MANUAL, 'victory_precheck.json'),
    path.join(MANUAL, 'foundation_seal.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8'));
      const reason_code = String(j?.reason_code || '').trim();
      const block_reason_surface = String(j?.block_reason_surface || '').trim();
      const first_failing_step_index = Number.isInteger(j?.first_failing_step_index) ? j.first_failing_step_index : null;
      const first_failing_step_cmd = typeof j?.first_failing_step_cmd === 'string' ? j.first_failing_step_cmd : null;
      const related_evidence_paths = Array.isArray(j?.related_evidence_paths) ? j.related_evidence_paths.slice().sort((a,b)=>String(a).localeCompare(String(b))) : [];
      if (reason_code) {
        return { reason_code, block_reason_surface, first_failing_step_index, first_failing_step_cmd, related_evidence_paths };
      }
    } catch {}
  }
  return { reason_code: '', block_reason_surface: '', first_failing_step_index: null, first_failing_step_cmd: null, related_evidence_paths: [] };
}

function resolveBlockReasonSurface(reason_code) {
  if (reason_code === 'CHURN01') return 'WRITE_SCOPE_GUARD';
  if (reason_code === 'SNAP01') return 'PRECHECK_SNAP01';
  return 'STEP_FAILURE';
}

function collectEvidencePaths() {
  const candidates = [
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/VICTORY_PRECHECK.md`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/gates/manual/victory_precheck.json`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/VICTORY_SEAL.md`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/gates/manual/victory_seal.json`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/FOUNDATION_SEAL.md`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/gates/manual/foundation_seal.json`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/EXECUTION_FORENSICS.md`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/VICTORY_TIMEOUT_TRIAGE.md`,
    `${path.relative(ROOT, EXEC_DIR).replace(/\\/g, '/')}/gates/manual/victory_timeout_triage.json`,
  ];
  return candidates.filter((p) => fs.existsSync(path.join(ROOT, p))).sort((a, b) => a.localeCompare(b));
}


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
      const surfaced = readReasonFromEvidence();
      reason_code = r.timedOut ? 'TO01' : (surfaced.reason_code || `STEP_EC_${step.step_index}`);
      if (!firstFailingStepIndex && Number.isInteger(surfaced.first_failing_step_index)) firstFailingStepIndex = surfaced.first_failing_step_index;
      if (!firstFailingCmd && typeof surfaced.first_failing_step_cmd === 'string' && surfaced.first_failing_step_cmd) firstFailingCmd = surfaced.first_failing_step_cmd;
    }
    break;
  }
}


const surfacedContract = readReasonFromEvidence();
if (!String(surfacedContract.reason_code || reason_code).trim() || !String(resolveBlockReasonSurface(surfacedContract.reason_code || reason_code)).trim()) {
  status = 'BLOCKED';
  reason_code = 'CONTRACT_EC01';
}

const evidencePaths = collectEvidencePaths();
const block_reason_surface = resolveBlockReasonSurface(reason_code);

writeMd(path.join(EXEC_DIR, 'VICTORY_TIMEOUT_TRIAGE.md'), `# VICTORY_TIMEOUT_TRIAGE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nBLOCK_REASON_SURFACE: ${block_reason_surface}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- triage_mode: true\n- first_failing_step_index: ${firstFailingStepIndex ?? 'NONE'}\n- first_failing_cmd: ${firstFailingCmd ?? 'NONE'}\n\n## STEPS\n${recs.map((r)=>`- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms} | elapsed_ms=${r.elapsed_ms ?? 'NA'}`).join('\n')}\n\n## EVIDENCE_PATHS\n${evidencePaths.map((p) => `- ${p}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'victory_timeout_triage.json'), {
  schema_version: '1.2.0',
  head_sha: HEAD_SHA,
  status,
  reason_code,
  block_reason_surface,
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
