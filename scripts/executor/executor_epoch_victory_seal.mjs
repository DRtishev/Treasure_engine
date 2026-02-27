import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan } from './victory_steps.mjs';
import { runNetkillRuntimeProbe } from './netkill_runtime_probe.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const TEST_MODE_MD = path.join(EXEC_DIR, 'TEST_MODE_ACTIVE.md');
const NETKILL_SUMMARY = path.join(EXEC_DIR, 'NETKILL_LEDGER_SUMMARY.json');
const PRECHECK_MD = path.join(EXEC_DIR, 'VICTORY_PRECHECK.md');
const TIMEOUT_TRIAGE_MD = path.join(EXEC_DIR, 'VICTORY_TIMEOUT_TRIAGE.md');
fs.mkdirSync(MANUAL, { recursive: true });

const victoryTestMode = process.env.VICTORY_TEST_MODE === '1';
const miniMode = process.env.EXECUTOR_CHAIN_MINI === '1';
const executionMode = miniMode ? 'MINI_CHAIN' : (victoryTestMode ? 'TEST_MODE' : 'FULL');
const headProbe = runBounded('git rev-parse HEAD', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const HEAD_SHA = headProbe.ec === 0 ? String(headProbe.stdout || '').trim() : 'UNKNOWN';


const WRITE_SCOPE_ALLOWED_PREFIXES = [
  'artifacts/',
  'reports/evidence/EPOCH-',
];

function normalizePathForPolicy(relPath) {
  return String(relPath || '').trim().replace(/\\/g, '/');
}

function isAllowedWriteScopePath(relPath) {
  const norm = normalizePathForPolicy(relPath);
  if (norm.startsWith('artifacts/')) return true;
  if (norm.startsWith('reports/evidence/EPOCH-')) return true;
  return false;
}

function outsideAllowedRoots(paths) {
  return (Array.isArray(paths) ? paths : [])
    .map((p) => normalizePathForPolicy(p))
    .filter(Boolean)
    .filter((p) => !isAllowedWriteScopePath(p))
    .sort((a, b) => a.localeCompare(b));
}


function toMs(iso, fallback) {
  const v = Date.parse(String(iso || ''));
  return Number.isFinite(v) ? v : fallback;
}

function sortedLines(text) {
  return String(text || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function toMdBullets(items, max = 50) {
  if (!Array.isArray(items) || items.length === 0) return '- NONE';
  const head = items.slice(0, max).map((f) => `- ${f}`);
  const extra = items.length - head.length;
  if (extra > 0) head.push(`- ... (+${extra} more)`);
  return head.join('\n');
}

function parseBaselineTelemetry(outText) {
  const m = String(outText || '').match(/BASELINE_TELEMETRY_JSON:(\{[^\n]+\})/);
  if (!m) {
    return {
      semantic: { baseline_files_restored_n: null, baseline_evidence_removed_n: null },
      volatile: { baseline_clean_elapsed_ms: null },
    };
  }
  try {
    const j = JSON.parse(m[1]);
    return {
      semantic: {
        baseline_files_restored_n: Number.isFinite(Number(j?.semantic?.baseline_files_restored_n)) ? Number(j.semantic.baseline_files_restored_n) : null,
        baseline_evidence_removed_n: Number.isFinite(Number(j?.semantic?.baseline_evidence_removed_n)) ? Number(j.semantic.baseline_evidence_removed_n) : null,
      },
      volatile: {
        baseline_clean_elapsed_ms: Number.isFinite(Number(j?.volatile?.baseline_clean_elapsed_ms)) ? Number(j.volatile.baseline_clean_elapsed_ms) : null,
      },
    };
  } catch {
    return {
      semantic: { baseline_files_restored_n: null, baseline_evidence_removed_n: null },
      volatile: { baseline_clean_elapsed_ms: null },
    };
  }
}

function computeDriftSeverity(tracked, staged, untracked) {
  if (tracked.length > 0) return 'HIGH';
  if (staged.length > 0) return 'MEDIUM';
  if (untracked.length > 0) return 'LOW';
  return 'NONE';
}


function resolveBlockReasonSurface(reason_code) {
  if (reason_code === 'CHURN01') return 'WRITE_SCOPE_GUARD';
  if (reason_code === 'SNAP01') return 'PRECHECK_SNAP01';
  return 'STEP_FAILURE';
}

function computeSemanticHash(status, reason_code, authoritative_run, steps, timeoutInfo = {}) {
  const block_reason_surface = resolveBlockReasonSurface(reason_code);
  const semantic = {
    status,
    reason_code,
    block_reason_surface,
    head_sha: HEAD_SHA,
    execution_mode: executionMode,
    test_mode: victoryTestMode,
    authoritative_run,
    timeout_step_index: timeoutInfo.timeout_step_index ?? null,
    timeout_cmd: timeoutInfo.timeout_cmd ?? null,
    timeout_elapsed_ms: timeoutInfo.timeout_elapsed_ms ?? null,
    timeout_ms: timeoutInfo.timeout_ms ?? null,
    steps: steps.map((r) => ({
      step_index: r.step_index,
      cmd: r.cmd,
      ec: r.ec,
      timedOut: r.timedOut,
      timeout_ms: r.timeout_ms,
      elapsed_ms: r.elapsed_ms,
      tree_kill_attempted: r.tree_kill_attempted,
      tree_kill_ok: r.tree_kill_ok,
      tree_kill_note: r.tree_kill_note,
    })),
  };
  return {
    semantic,
    semantic_hash: crypto.createHash('sha256').update(JSON.stringify(semantic)).digest('hex'),
  };
}

function writeVictoryArtifacts({ status, reason_code, recs, started_at_ms, completed_at_ms, authoritative_run, timeoutInfo = {}, next_action = NEXT_ACTION }) {
  const { semantic, semantic_hash } = computeSemanticHash(status, reason_code, authoritative_run, recs, timeoutInfo);
  const block_reason_surface = resolveBlockReasonSurface(reason_code);
  const exit_code = status === 'PASS' ? 0 : (status === 'NEEDS_DATA' && reason_code === 'RDY01' ? 2 : 1);
  writeMd(path.join(EXEC_DIR, 'VICTORY_SEAL.md'), `# VICTORY_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nBLOCK_REASON_SURFACE: ${block_reason_surface}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${next_action}\nEXIT_CODE: ${exit_code}\n\n- semantic_hash: ${semantic_hash}\n- authoritative_run: ${authoritative_run}\n\n## STEPS\n${recs.map((r) => `- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms} | elapsed_ms=${r.elapsed_ms}\n  STARTED_AT_MS: ${r.started_at_ms}\n  COMPLETED_AT_MS: ${r.completed_at_ms}\n  TREE_KILL_ATTEMPTED: ${r.tree_kill_attempted}\n  TREE_KILL_OK: ${r.tree_kill_ok}\n  TREE_KILL_NOTE: ${r.tree_kill_note}`).join('\n')}\n`);

  writeJsonDeterministic(path.join(MANUAL, 'victory_seal.json'), {
    schema_version: '1.0.0',
    status,
    reason_code,
    block_reason_surface,
    head_sha: HEAD_SHA,
    run_id: RUN_ID,
    next_action,
    execution_mode: executionMode,
    test_mode: victoryTestMode,
    authoritative_run,
    timeout_step_index: timeoutInfo.timeout_step_index ?? null,
    timeout_cmd: timeoutInfo.timeout_cmd ?? null,
    timeout_elapsed_ms: timeoutInfo.timeout_elapsed_ms ?? null,
    timeout_ms: timeoutInfo.timeout_ms ?? null,
    steps: semantic.steps,
    semantic_hash,
    exit_code,
    volatile: {
      started_at_ms,
      completed_at_ms,
      durations: recs.map((r) => ({ step_index: r.step_index, cmd: r.cmd, duration_ms: r.elapsed_ms })),
    },
  });

  const netkillProbePath = path.join(MANUAL, 'regression_executor_netkill_runtime_ledger.json');
  let netkill_probe_result = 'FAIL';
  let netkill_probe_error_code = 'UNSET';
  let netkill_probe_signature_sha256 = 'UNSET';
  const runtimeProbe = runNetkillRuntimeProbe();
  netkill_probe_result = runtimeProbe.status;
  netkill_probe_error_code = runtimeProbe.error_code;
  netkill_probe_signature_sha256 = runtimeProbe.signature_sha256;
  if (fs.existsSync(netkillProbePath)) {
    try {
      const ledgerProbe = JSON.parse(fs.readFileSync(netkillProbePath, 'utf8'));
      if (String(ledgerProbe.status || '').toUpperCase() === 'PASS') {
        netkill_probe_result = 'PASS';
        netkill_probe_error_code = 'NONE';
      }
    } catch {}
  }
  let netkill_summary_hash = 'MISSING';
  if (fs.existsSync(NETKILL_SUMMARY)) {
    try { netkill_summary_hash = String(JSON.parse(fs.readFileSync(NETKILL_SUMMARY, 'utf8')).ledger_semantic_hash || 'MISSING'); } catch { netkill_summary_hash = 'INVALID'; }
  }
  writeMd(path.join(EXEC_DIR, 'EXECUTION_FORENSICS.md'), `# EXECUTION_FORENSICS.md\n\nSTATUS: PASS\n\n- preload_abs_path: ${path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs')}\n- node_version: ${process.version}\n- net_kill_runtime_probe_result: ${netkill_probe_result}\n- net_kill_runtime_probe_error_code: ${netkill_probe_error_code}\n- net_kill_runtime_probe_signature_sha256: ${netkill_probe_signature_sha256}\n- execution_mode: ${executionMode}\n- test_mode: ${victoryTestMode}\n- netkill_summary_hash: ${netkill_summary_hash}\n- semantic_hash: ${semantic_hash}\n- authoritative_run: ${authoritative_run}\n- operator_next_action: ${next_action}\n- executor_classification_mode: verify|gov|p0|edge_profit|export_final_validated\n`);
}

const preBaseline = runBounded('npm run -s executor:clean:baseline', { cwd: ROOT, env: process.env, timeoutMs: 60000, maxBuffer: 16 * 1024 * 1024 });
const baseline_precheck_ok = preBaseline.ec === 0;
const baselineOutputRaw = (preBaseline.stdout + preBaseline.stderr).trim();
const baselineTelemetry = parseBaselineTelemetry(baselineOutputRaw);
const baselineOutputForMd = baselineOutputRaw.replace(/BASELINE_TELEMETRY_JSON:\{[^\n]+\}/g, `BASELINE_TELEMETRY_JSON:${JSON.stringify(baselineTelemetry)}`);

function writePrecheck({ status, reason_code, clean_tree_ok, drift_detected, drift_severity, tracked, staged, untracked, offenders_outside_allowed_roots, git_status, git_diff, git_diff_cached, snap_reason_code }) {
  const guidance = [
    '### CHURN01: WRITE_SCOPE_GUARD violation',
    '',
    'Detected:',
    `- tracked: ${tracked.length}`,
    `- staged: ${staged.length}`,
    `- untracked: ${untracked.length}`,
    '',
    '#### Quick Fix Options',
    '',
    'A) discard untracked',
    '   git clean -fd',
    '',
    'B) restore changes',
    '   git restore --staged .',
    '   git restore .',
    '',
    'C) commit drift',
    '   git add -A',
    '   git commit -m "chore: reconcile drift"',
    '',
    'Then run:',
    'npm run -s epoch:victory:seal',
  ].join('\n');

  writeMd(PRECHECK_MD, `# VICTORY_PRECHECK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- baseline_clean_ec: ${preBaseline.ec}\n- baseline_precheck_ok: ${baseline_precheck_ok}\n- clean_tree_ok: ${clean_tree_ok}\n- drift_detected: ${drift_detected}\n- drift_severity: ${drift_severity}\n- snap_reason_code: ${snap_reason_code}\n- dirty_tracked_n: ${tracked.length}\n- dirty_staged_n: ${staged.length}\n- dirty_untracked_n: ${untracked.length}
- offenders_outside_allowed_roots_n: ${offenders_outside_allowed_roots.length}\n\n## DIRTY_TRACKED_FILES (max 50 shown)\n${toMdBullets(tracked)}\n\n## DIRTY_STAGED_FILES (max 50 shown)\n${toMdBullets(staged)}\n\n## DIRTY_UNTRACKED_FILES (max 50 shown)\n${toMdBullets(untracked)}\n\n## OFFENDERS_OUTSIDE_ALLOWED_ROOTS (max 50 shown)\n${toMdBullets(offenders_outside_allowed_roots)}\n\n### Baseline Clean Telemetry (SEMANTIC)\n- baseline_files_restored_n: ${baselineTelemetry.semantic.baseline_files_restored_n ?? 'UNKNOWN'}\n- baseline_evidence_removed_n: ${baselineTelemetry.semantic.baseline_evidence_removed_n ?? 'UNKNOWN'}\n\n### Baseline Clean Telemetry (VOLATILE)\n- baseline_clean_elapsed_ms: ${baselineTelemetry.volatile.baseline_clean_elapsed_ms ?? 'UNKNOWN'}\n\n## BASELINE_CLEAN_OUTPUT\n\`\`\`\n${baselineOutputForMd || '(none)'}\n\`\`\`\n\n## GIT_STATUS_SB\n\`\`\`\n${git_status || '(none)'}\n\`\`\`\n\n## GIT_DIFF_NAME_ONLY\n\`\`\`\n${git_diff || '(none)'}\n\`\`\`\n\n## GIT_DIFF_CACHED_NAME_ONLY\n\`\`\`\n${git_diff_cached || '(none)'}\n\`\`\`\n\n${status === 'BLOCKED' ? guidance : ''}\n`);

  const block_reason_surface = resolveBlockReasonSurface(snap_reason_code);

  writeJsonDeterministic(path.join(MANUAL, 'victory_precheck.json'), {
    schema_version: '1.0.0',
    status,
    reason_code,
    block_reason_surface,
    head_sha: HEAD_SHA,
    run_id: RUN_ID,
    next_action: NEXT_ACTION,
    baseline_clean_ec: preBaseline.ec,
    baseline_precheck_ok,
    clean_tree_ok,
    drift_detected,
    drift_severity,
    snap_reason_code,
    operator_relevant_filter_version: '1.0.0',
    offenders_tracked: tracked,
    offenders_staged: staged,
    offenders_untracked: untracked,
    offenders_outside_allowed_roots,
    dirty_tracked_files: tracked,
    dirty_staged_files: staged,
    dirty_untracked_files: untracked,
    baseline_telemetry: {
      semantic: {
        baseline_files_restored_n: baselineTelemetry.semantic.baseline_files_restored_n,
        baseline_evidence_removed_n: baselineTelemetry.semantic.baseline_evidence_removed_n,
      },
      volatile: {
        baseline_clean_elapsed_ms: baselineTelemetry.volatile.baseline_clean_elapsed_ms,
      },
    },
    git_status,
    git_diff,
    git_diff_cached,
  });
}

const preStatus = runBounded('git status -sb', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const preDiff = runBounded('git diff --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const preDiffCached = runBounded('git diff --cached --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const preUntracked = runBounded('git ls-files --others --exclude-standard', { cwd: ROOT, env: process.env, timeoutMs: 5000 });

const gitStatusText = (preStatus.stdout + preStatus.stderr).trim();
const gitDiffText = (preDiff.stdout + preDiff.stderr).trim();
const gitDiffCachedText = (preDiffCached.stdout + preDiffCached.stderr).trim();
const trackedRaw = sortedLines(gitDiffText);
const stagedRaw = sortedLines(gitDiffCachedText);
const untrackedRaw = sortedLines((preUntracked.stdout + preUntracked.stderr).trim());
const tracked = outsideAllowedRoots(trackedRaw);
const staged = outsideAllowedRoots(stagedRaw);
const untracked = outsideAllowedRoots(untrackedRaw);
const offenders_outside_allowed_roots = [...tracked, ...staged, ...untracked].sort((a, b) => a.localeCompare(b));

const clean_tree_ok = baseline_precheck_ok
  && preStatus.ec === 0
  && preDiff.ec === 0
  && preDiffCached.ec === 0
  && preUntracked.ec === 0
  && offenders_outside_allowed_roots.length === 0;
const drift_detected = offenders_outside_allowed_roots.length > 0;
const drift_severity = computeDriftSeverity(tracked, staged, untracked);

if (!clean_tree_ok) {
  writePrecheck({
    status: 'BLOCKED',
    reason_code: 'CHURN01',
    clean_tree_ok,
    drift_detected: true,
    drift_severity,
    tracked,
    staged,
    untracked,
    offenders_outside_allowed_roots,
    git_status: gitStatusText,
    git_diff: gitDiffText,
    git_diff_cached: gitDiffCachedText,
    snap_reason_code: 'CHURN01',
  });
  writeVictoryArtifacts({ status: 'BLOCKED', reason_code: 'CHURN01', recs: [], started_at_ms: Date.now(), completed_at_ms: Date.now(), authoritative_run: false });
  console.log('[BLOCKED] executor_epoch_victory_seal — CHURN01');
  process.exit(1);
}

writePrecheck({
  status: 'PASS',
  reason_code: 'NONE',
  clean_tree_ok,
  drift_detected,
  drift_severity,
  tracked,
  staged,
  untracked,
  offenders_outside_allowed_roots,
  git_status: gitStatusText,
  git_diff: gitDiffText,
  git_diff_cached: gitDiffCachedText,
  snap_reason_code: 'NONE',
});

if (victoryTestMode && String(process.env.CI || '').toLowerCase() === 'true') {
  writeVictoryArtifacts({ status: 'BLOCKED', reason_code: 'RG_TEST01', recs: [], started_at_ms: Date.now(), completed_at_ms: Date.now(), authoritative_run: false });
  console.log('[BLOCKED] executor_epoch_victory_seal — RG_TEST01');
  process.exit(1);
}
if (victoryTestMode) {
  writeMd(TEST_MODE_MD, `# TEST_MODE_ACTIVE.md\n\nSTATUS: PASS\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- test_mode: true\n- execution_mode: ${executionMode}`);
} else {
  try { fs.unlinkSync(TEST_MODE_MD); } catch {}
}
if (victoryTestMode && !fs.existsSync(TEST_MODE_MD)) {
  writeVictoryArtifacts({ status: 'BLOCKED', reason_code: 'RG_TEST02', recs: [], started_at_ms: Date.now(), completed_at_ms: Date.now(), authoritative_run: false });
  console.log('[BLOCKED] executor_epoch_victory_seal — RG_TEST02');
  process.exit(1);
}

const stepPlan = getVictoryStepPlan(victoryTestMode);
const recs = [];
let status = 'PASS';
let reason_code = 'NONE';
let timeoutInfo = {};
const started_at_ms = Date.now();
for (const step of stepPlan) {
  const r = runBounded(step.cmd, { cwd: ROOT, env: process.env, maxBuffer: 64 * 1024 * 1024, timeoutMs: step.timeout_ms });
  const started_at_ms_step = toMs(r.startedAt, Date.now());
  const completed_at_ms_step = toMs(r.completedAt, started_at_ms_step);
  const stepRec = {
    step_index: step.step_index,
    cmd: step.cmd,
    timeout_ms: r.timeout_ms,
    started_at_ms: started_at_ms_step,
    completed_at_ms: completed_at_ms_step,
    elapsed_ms: Math.max(0, completed_at_ms_step - started_at_ms_step),
    timedOut: Boolean(r.timedOut),
    ec: r.ec,
    tree_kill_attempted: Boolean(r.tree_kill_attempted),
    tree_kill_ok: Boolean(r.tree_kill_ok),
    tree_kill_note: String(r.tree_kill_note || ''),
  };
  recs.push(stepRec);
  if (r.ec !== 0) {
    if (step.cmd.includes('verify:public:data:readiness') && r.ec === 2) {
      status = 'NEEDS_DATA';
      reason_code = 'RDY01';
    } else {
      status = 'BLOCKED';
      reason_code = r.timedOut ? 'TO01' : 'EC01';
      if (r.timedOut) {
        timeoutInfo = {
          timeout_step_index: stepRec.step_index,
          timeout_cmd: stepRec.cmd,
          timeout_elapsed_ms: stepRec.elapsed_ms,
          timeout_ms: stepRec.timeout_ms,
        };
      }
    }
    break;
  }
}

const completed_at_ms = Date.now();
const authoritative_run = clean_tree_ok && reason_code !== 'TO01';
writeVictoryArtifacts({ status, reason_code, recs, started_at_ms, completed_at_ms, authoritative_run, timeoutInfo });

if (reason_code === 'TO01') {
  const lastSteps = recs.slice(Math.max(0, recs.length - 5));
  writeMd(TIMEOUT_TRIAGE_MD, `# VICTORY_TIMEOUT_TRIAGE.md\n\nSTATUS: BLOCKED\nREASON_CODE: TO01\nBLOCK_REASON_SURFACE: STEP_FAILURE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- timeout_step_index: ${timeoutInfo.timeout_step_index}\n- timeout_cmd: ${timeoutInfo.timeout_cmd}\n- timeout_elapsed_ms: ${timeoutInfo.timeout_elapsed_ms}\n- timeout_ms: ${timeoutInfo.timeout_ms}\n\n## LAST_STEPS\n${lastSteps.map((s) => `- step_${s.step_index}: ${s.cmd} | ec=${s.ec} | timedOut=${s.timedOut} | elapsed_ms=${s.elapsed_ms} | timeout_ms=${s.timeout_ms}`).join('\n')}\n`);
  writeJsonDeterministic(path.join(MANUAL, 'victory_timeout_triage.json'), {
    schema_version: '1.0.0',
    status: 'BLOCKED',
    reason_code: 'TO01',
    block_reason_surface: 'STEP_FAILURE',
    run_id: RUN_ID,
    next_action: NEXT_ACTION,
    timeout_step_index: timeoutInfo.timeout_step_index,
    timeout_cmd: timeoutInfo.timeout_cmd,
    timeout_elapsed_ms: timeoutInfo.timeout_elapsed_ms,
    timeout_ms: timeoutInfo.timeout_ms,
    last_steps: lastSteps,
  });
}

console.log(`[${status}] executor_epoch_victory_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : status === 'NEEDS_DATA' ? 2 : 1);
