/**
 * cockpit.mjs — ops:cockpit integration HUD (WOW6–WOW8)
 *
 * Reads latest EPOCH evidence for timemachine + autopilot + verify:fast,
 * produces a deterministic HUD with no timestamps.
 *
 * Design invariants:
 * - No wall-clock time fields in output
 * - Stable section ordering: TIMEMACHINE → AUTOPILOT → FAST_GATE → PR01
 * - Output: reports/evidence/EPOCH-COCKPIT-<RUN_ID>/HUD.md + HUD.json
 *
 * Write-scope (R5): reports/evidence/EPOCH-COCKPIT-<RUN_ID>/
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
const EXECUTOR_DIR = path.join(EVIDENCE_DIR, 'EXECUTOR');
const EPOCH_DIR = path.join(EVIDENCE_DIR, `EPOCH-COCKPIT-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Find latest EPOCH dir by prefix (sorted lexicographically — stable)
// ---------------------------------------------------------------------------
function findLatestEpoch(prefix) {
  if (!fs.existsSync(EVIDENCE_DIR)) return null;
  const dirs = fs.readdirSync(EVIDENCE_DIR)
    .filter((d) => d.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
  return dirs.length > 0 ? dirs[dirs.length - 1] : null;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Collect TimeMachine section
// ---------------------------------------------------------------------------
function collectTimemachine() {
  const epochName = findLatestEpoch('EPOCH-TIMEMACHINE-');
  if (!epochName) return { present: false, run_id: null, ticks_total: null, status: 'NO_EPOCH', paths: [] };

  const epochDir = path.join(EVIDENCE_DIR, epochName);
  const summary = readJson(path.join(epochDir, 'SUMMARY.json'));
  const jsonlPath = path.join(epochDir, 'TIMELINE.jsonl');
  const mdPath = path.join(epochDir, 'TIMELINE.md');

  return {
    present: true,
    epoch_name: epochName,
    run_id: summary?.run_id ?? null,
    ticks_total: summary?.ticks_total ?? null,
    ticks_failed: summary?.ticks_failed ?? null,
    status: summary?.status ?? 'UNKNOWN',
    reason_code: summary?.reason_code ?? 'UNKNOWN',
    paths: [
      path.relative(ROOT, jsonlPath),
      path.relative(ROOT, mdPath),
    ].filter((p) => fs.existsSync(path.join(ROOT, p))),
  };
}

// ---------------------------------------------------------------------------
// Collect Autopilot section
// ---------------------------------------------------------------------------
function collectAutopilot() {
  const epochName = findLatestEpoch('EPOCH-AUTOPILOTV2-');
  if (!epochName) return { present: false, run_id: null, mode: null, status: 'NO_EPOCH', paths: [] };

  const epochDir = path.join(EVIDENCE_DIR, epochName);
  const plan = readJson(path.join(epochDir, 'PLAN.json'));
  const planMdPath = path.join(epochDir, 'PLAN.md');
  const refusalMdPath = path.join(epochDir, 'REFUSAL.md');

  return {
    present: true,
    epoch_name: epochName,
    run_id: plan?.run_id ?? null,
    mode: plan?.mode ?? null,
    apply_flag: plan?.apply_flag ?? null,
    apply_unlocked: plan?.apply_unlocked ?? null,
    status: plan?.status ?? 'UNKNOWN',
    reason_code: plan?.reason_code ?? 'UNKNOWN',
    refused: plan?.refused ?? null,
    refusal_codes: plan?.refusal_codes ?? [],
    paths: [
      path.relative(ROOT, planMdPath),
      ...(fs.existsSync(refusalMdPath) ? [path.relative(ROOT, refusalMdPath)] : []),
    ].filter((p) => fs.existsSync(path.join(ROOT, p))),
  };
}

// ---------------------------------------------------------------------------
// Collect fast gate section (from EXECUTOR manual receipts)
// ---------------------------------------------------------------------------
function collectFastGate() {
  const gateDir = path.join(EXECUTOR_DIR, 'gates', 'manual');
  if (!fs.existsSync(gateDir)) return { status: 'NO_RECEIPTS', gates: [], failed: [] };

  // Read known fast gates
  const gateFiles = [
    'repo_byte_audit_x2.json',
    'regression_node_truth_alignment.json',
    'regression_churn_contract01.json',
    'regression_netkill_ledger_enforcement.json',
    'regression_pr01_evidence_bloat_guard.json',
    'regression_victory_fast_no_heavy.json',
  ];

  const gates = [];
  for (const f of gateFiles) {
    const data = readJson(path.join(gateDir, f));
    if (data) {
      gates.push({ gate: f.replace('.json', ''), status: data.status ?? 'UNKNOWN', reason_code: data.reason_code ?? 'UNKNOWN' });
    }
  }

  const failed = gates.filter((g) => g.status !== 'PASS');
  const overallStatus = failed.length === 0 && gates.length > 0 ? 'PASS' : (gates.length === 0 ? 'NO_DATA' : 'FAIL');

  return { status: overallStatus, gates_checked: gates.length, failed_n: failed.length, gates, failed };
}

// ---------------------------------------------------------------------------
// Collect PR01 status
// ---------------------------------------------------------------------------
function collectPR01() {
  const receipt = readJson(path.join(EXECUTOR_DIR, 'gates', 'manual', 'regression_pr01_evidence_bloat_guard.json'));
  if (!receipt) return { status: 'NO_RECEIPT', reason_code: 'UNKNOWN' };
  return { status: receipt.status ?? 'UNKNOWN', reason_code: receipt.reason_code ?? 'UNKNOWN' };
}

// ---------------------------------------------------------------------------
// Collect WOW agent gates
// ---------------------------------------------------------------------------
function collectWowGates() {
  const gateDir = path.join(EXECUTOR_DIR, 'gates', 'manual');
  const wowFiles = [
    'regression_agent01_agents_present.json',
    'regression_agent02_claude_md_drift.json',
    'regression_time01_stable_tick_order.json',
    'regression_time02_no_time_fields.json',
    'regression_auto01_mode_router.json',
    'regression_auto02_no_cert_in_research.json',
    'regression_auto03_pr_cleanroom_applied.json',
    'regression_auto04_apply_unlock_required.json',
  ];

  const gates = [];
  for (const f of wowFiles) {
    const data = readJson(path.join(gateDir, f));
    if (data) {
      gates.push({ gate: f.replace('.json', ''), status: data.status ?? 'UNKNOWN', reason_code: data.reason_code ?? 'UNKNOWN' });
    }
  }
  const failed = gates.filter((g) => g.status !== 'PASS');
  return { gates_checked: gates.length, failed_n: failed.length, gates, failed };
}

// ---------------------------------------------------------------------------
// Build HUD
// ---------------------------------------------------------------------------
const tm = collectTimemachine();
const ap = collectAutopilot();
const fg = collectFastGate();
const pr1 = collectPR01();
const wow = collectWowGates();

const overallFailed = [
  fg.status !== 'PASS' && fg.status !== 'NO_DATA' ? 'FAST_GATE' : null,
  pr1.status !== 'PASS' ? 'PR01' : null,
  wow.failed_n > 0 ? 'WOW_GATES' : null,
].filter(Boolean);

const hudStatus = overallFailed.length === 0 ? 'PASS' : 'BLOCKED';
const hudReasonCode = overallFailed.length === 0 ? 'NONE' : overallFailed.join('+');

// ---------------------------------------------------------------------------
// Write HUD.json
// ---------------------------------------------------------------------------
const hudJson = {
  schema_version: '1.0.0',
  gate_id: 'WOW_COCKPIT_INTEGRATION',
  run_id: RUN_ID,
  status: hudStatus,
  reason_code: hudReasonCode,
  sections: {
    timemachine: tm,
    autopilot: ap,
    fast_gate: fg,
    pr01: pr1,
    wow_gates: wow,
  },
  overall_failed: overallFailed,
  next_action: 'npm run -s verify:fast',
};

writeJsonDeterministic(path.join(EPOCH_DIR, 'HUD.json'), hudJson);

// ---------------------------------------------------------------------------
// Write HUD.md
// ---------------------------------------------------------------------------
function statusIcon(s) { return s === 'PASS' ? 'PASS' : (s === 'NO_DATA' || s === 'NO_EPOCH' || s === 'NO_RECEIPTS' ? 'NO_DATA' : 'FAIL'); }

const tmRows = tm.paths.map((p) => `  - ${p}`).join('\n') || '  - NONE';
const apRows = ap.paths.map((p) => `  - ${p}`).join('\n') || '  - NONE';
const fgRows = fg.gates.map((g) => `  | ${g.gate} | ${g.status} | ${g.reason_code} |`).join('\n') || '  | - | NO_DATA | - |';
const wowRows = wow.gates.map((g) => `  | ${g.gate} | ${g.status} | ${g.reason_code} |`).join('\n') || '  | - | NO_DATA | - |';

const hudMd = [
  `# COCKPIT HUD — EPOCH-COCKPIT-${RUN_ID}`,
  '',
  `STATUS: ${hudStatus}`,
  `REASON_CODE: ${hudReasonCode}`,
  `RUN_ID: ${RUN_ID}`,
  '',
  '---',
  '',
  '## [1] TIMEMACHINE',
  '',
  `STATUS: ${statusIcon(tm.status)}`,
  `EPOCH: ${tm.epoch_name ?? 'NONE'}`,
  `RUN_ID: ${tm.run_id ?? 'NONE'}`,
  `TICKS_TOTAL: ${tm.ticks_total ?? 'NONE'}`,
  `TICKS_FAILED: ${tm.ticks_failed ?? 'NONE'}`,
  `REASON_CODE: ${tm.reason_code ?? 'NONE'}`,
  'PATHS:',
  tmRows,
  '',
  '---',
  '',
  '## [2] AUTOPILOT COURT V2',
  '',
  `STATUS: ${statusIcon(ap.status)}`,
  `EPOCH: ${ap.epoch_name ?? 'NONE'}`,
  `RUN_ID: ${ap.run_id ?? 'NONE'}`,
  `MODE: ${ap.mode ?? 'NONE'}`,
  `APPLY_FLAG: ${ap.apply_flag ?? 'NONE'}`,
  `APPLY_UNLOCKED: ${ap.apply_unlocked ?? 'NONE'}`,
  `REFUSED: ${ap.refused ?? 'NONE'}`,
  `REASON_CODE: ${ap.reason_code ?? 'NONE'}`,
  `REFUSAL_CODES: ${ap.refusal_codes?.join(',') || 'NONE'}`,
  'PATHS:',
  apRows,
  '',
  '---',
  '',
  '## [3] FAST GATE',
  '',
  `STATUS: ${fg.status}`,
  `GATES_CHECKED: ${fg.gates_checked}`,
  `FAILED_N: ${fg.failed_n}`,
  '',
  '  | Gate | Status | Reason |',
  '  |------|--------|--------|',
  fgRows,
  '',
  '---',
  '',
  '## [4] PR01 CLEANROOM',
  '',
  `STATUS: ${pr1.status}`,
  `REASON_CODE: ${pr1.reason_code}`,
  '',
  '---',
  '',
  '## [5] WOW6–WOW8 GATES',
  '',
  `GATES_CHECKED: ${wow.gates_checked}`,
  `FAILED_N: ${wow.failed_n}`,
  '',
  '  | Gate | Status | Reason |',
  '  |------|--------|--------|',
  wowRows,
  '',
  '---',
  '',
  '## NEXT_ACTION',
  '',
  'npm run -s verify:fast',
  '',
].join('\n');

writeMd(path.join(EPOCH_DIR, 'HUD.md'), hudMd);

// Print compact summary
console.log(`[${hudStatus}] ops:cockpit — ${hudReasonCode}`);
console.log(`  HUD:      ${path.relative(ROOT, path.join(EPOCH_DIR, 'HUD.md'))}`);
console.log(`  HUD_JSON: ${path.relative(ROOT, path.join(EPOCH_DIR, 'HUD.json'))}`);
console.log(`  timemachine: ${tm.status} ticks=${tm.ticks_total ?? '?'} epoch=${tm.epoch_name ?? 'NONE'}`);
console.log(`  autopilot:   ${ap.status} mode=${ap.mode ?? '?'} refused=${ap.refused ?? '?'}`);
console.log(`  fast_gate:   ${fg.status} (${fg.gates_checked} gates, ${fg.failed_n} failed)`);
console.log(`  pr01:        ${pr1.status}`);
console.log(`  wow_gates:   ${wow.gates_checked} checked, ${wow.failed_n} failed`);

process.exit(hudStatus === 'PASS' ? 0 : 1);
