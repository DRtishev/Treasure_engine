/**
 * timemachine_ledger.mjs — WOW7 TimeMachine Ledger
 *
 * Heartbeat ledger with tick-only ordering (zero timestamps / zero nondeterminism).
 *
 * Design invariants (RG_TIME01 + RG_TIME02):
 * - Ticks are monotonically increasing integers; no wall-clock time
 * - Every TIMELINE entry: { tick, event, context } — NO timestamp fields
 * - Two runs with same input produce byte-identical TIMELINE.jsonl (modulo RUN_ID)
 * - Ordering is stable: declared event list order == tick order
 *
 * Write-scope (R5): reports/evidence/EPOCH-TIMEMACHINE-<RUN_ID>/
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-TIMEMACHINE-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Declared event sequence — deterministic order, no timestamps
// ---------------------------------------------------------------------------
const DECLARED_EVENTS = [
  { event: 'LEDGER_BOOT', context: 'timemachine_ledger start' },
  { event: 'AGENTS_PRESENT_CHECK', context: 'verify AGENTS.md exists at root' },
  { event: 'CLAUDE_MD_PRESENT_CHECK', context: 'verify CLAUDE.md exists at root' },
  { event: 'AI_RUNBOOK_PRESENT_CHECK', context: 'verify docs/AI_RUNBOOK.md exists' },
  { event: 'TIMEMACHINE_SCRIPT_SELF_CHECK', context: 'verify scripts/ops/timemachine_ledger.mjs is present' },
  { event: 'AUTOPILOT_SCRIPT_CHECK', context: 'verify scripts/ops/autopilot_court_v2.mjs is present' },
  { event: 'WRITE_SCOPE_CHECK', context: 'verify EPOCH dir is under reports/evidence/EPOCH-TIMEMACHINE-*' },
  { event: 'LEDGER_SEAL', context: 'timeline complete; tick sequence sealed' },
];

// ---------------------------------------------------------------------------
// Tick-based checks — wall-clock time is forbidden; tick counters only
// ---------------------------------------------------------------------------
function runChecks() {
  const checks = {};
  checks.agents_md = fs.existsSync(path.join(ROOT, 'AGENTS.md'));
  checks.claude_md = fs.existsSync(path.join(ROOT, 'CLAUDE.md'));
  checks.ai_runbook = fs.existsSync(path.join(ROOT, 'docs', 'AI_RUNBOOK.md'));
  checks.timemachine_script = fs.existsSync(path.join(ROOT, 'scripts', 'ops', 'timemachine_ledger.mjs'));
  checks.autopilot_script = fs.existsSync(path.join(ROOT, 'scripts', 'ops', 'autopilot_court_v2.mjs'));
  checks.epoch_dir_valid = EPOCH_DIR.includes('EPOCH-TIMEMACHINE-');
  return checks;
}

// ---------------------------------------------------------------------------
// Build TIMELINE entries (tick-only, no time fields)
// ---------------------------------------------------------------------------
function buildTimeline(checks) {
  const checkValues = [
    true, // LEDGER_BOOT always succeeds
    checks.agents_md,
    checks.claude_md,
    checks.ai_runbook,
    checks.timemachine_script,
    checks.autopilot_script,
    checks.epoch_dir_valid,
    true, // LEDGER_SEAL always runs
  ];

  return DECLARED_EVENTS.map((entry, i) => ({
    tick: i + 1,
    event: entry.event,
    context: entry.context,
    result: checkValues[i] ? 'OK' : 'MISSING',
  }));
}

// ---------------------------------------------------------------------------
// Write TIMELINE.jsonl (one JSON object per line, deterministic)
// ---------------------------------------------------------------------------
function writeTimelineJsonl(timeline, outPath) {
  // Sorted keys per entry for determinism
  const lines = timeline.map((entry) => {
    const sorted = {};
    for (const k of Object.keys(entry).sort()) {
      sorted[k] = entry[k];
    }
    return JSON.stringify(sorted);
  });
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Write TIMELINE.md (human-readable tick log)
// ---------------------------------------------------------------------------
function writeTimelineMd(timeline, runId, outPath) {
  const rows = timeline.map((e) => `| ${e.tick} | ${e.event} | ${e.result} | ${e.context} |`).join('\n');
  const failed = timeline.filter((e) => e.result !== 'OK');
  const status = failed.length === 0 ? 'PASS' : 'FAIL';

  const content = [
    `# TIMELINE — EPOCH-TIMEMACHINE-${runId}`,
    '',
    `STATUS: ${status}`,
    `RUN_ID: ${runId}`,
    `TICKS: ${timeline.length}`,
    '',
    '## TICK LOG',
    '',
    '| tick | event | result | context |',
    '|------|-------|--------|---------|',
    rows,
    '',
    `## FAILED_TICKS`,
    failed.length === 0 ? '- NONE' : failed.map((e) => `- tick=${e.tick} event=${e.event}`).join('\n'),
    '',
    `## NEXT_ACTION`,
    `npm run -s verify:fast`,
    '',
  ].join('\n');

  writeMd(outPath, content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const checks = runChecks();
const timeline = buildTimeline(checks);
const failed = timeline.filter((e) => e.result !== 'OK');
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_TIME01';

const jsonlPath = path.join(EPOCH_DIR, 'TIMELINE.jsonl');
const mdPath = path.join(EPOCH_DIR, 'TIMELINE.md');

writeTimelineJsonl(timeline, jsonlPath);
writeTimelineMd(timeline, RUN_ID, mdPath);

// Summary JSON
writeJsonDeterministic(path.join(EPOCH_DIR, 'SUMMARY.json'), {
  schema_version: '1.0.0',
  gate_id: 'WOW7_TIMEMACHINE',
  run_id: RUN_ID,
  status,
  reason_code,
  ticks_total: timeline.length,
  ticks_failed: failed.length,
  next_action: 'npm run -s verify:fast',
  checks,
  failed_ticks: failed.map((e) => ({ tick: e.tick, event: e.event })),
});

console.log(`[${status}] ops:timemachine — ${reason_code}`);
console.log(`  TIMELINE: ${path.relative(ROOT, jsonlPath)}`);
console.log(`  SUMMARY:  ${path.relative(ROOT, path.join(EPOCH_DIR, 'SUMMARY.json'))}`);

process.exit(status === 'PASS' ? 0 : 1);
