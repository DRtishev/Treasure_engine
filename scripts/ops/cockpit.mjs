/**
 * cockpit.mjs — ops:cockpit integration HUD (WOW6–WOW9, EventBus-unified)
 *
 * Reads timemachine + autopilot status from EventBus EVENTS.jsonl (reducer).
 * Reads gate receipts from EXECUTOR/gates/manual/ for fast_gate + WOW gates.
 *
 * Design invariants:
 * - No wall-clock time fields in output
 * - timemachine and autopilot sections derived from EventBus (RG_COCKPIT04)
 * - Stable section ordering: TIMEMACHINE → AUTOPILOT → EVENTBUS → FAST_GATE → PR01 → WOW
 * - Output: reports/evidence/EPOCH-COCKPIT-<RUN_ID>/HUD.md + HUD.json
 * - All evidence_paths in HUD.json must exist (RG_COCKPIT05)
 *
 * Write-scope (R5): reports/evidence/EPOCH-COCKPIT-<RUN_ID>/
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { readBus, findLatestBusJsonl, findAllBusJsonls, mergeAndSortEvents } from './eventbus_v1.mjs';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
const EXECUTOR_DIR = path.join(EVIDENCE_DIR, 'EXECUTOR');
const EPOCH_DIR = path.join(EVIDENCE_DIR, `EPOCH-COCKPIT-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

// Find latest EPOCH dir by prefix (sorted lexicographically — stable, no mtime)
function findLatestEpoch(prefix) {
  if (!fs.existsSync(EVIDENCE_DIR)) return null;
  const dirs = fs.readdirSync(EVIDENCE_DIR)
    .filter((d) => d.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
  return dirs.length > 0 ? dirs[dirs.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Load ALL EventBuses — aggregate events from all EPOCH-EVENTBUS-* dirs
// (ops:life pattern: each component writes to its own keyed bus dir)
// No mtime: findAllBusJsonls uses lexicographic sort only
// ---------------------------------------------------------------------------
const allBusJsonls = findAllBusJsonls(EVIDENCE_DIR);
// BUS03: merge events with deterministic compound sort (tick, component, event, run_id)
// Never uses mtime; stable across repeated cockpit runs in same tree
const allEvents = mergeAndSortEvents(allBusJsonls.map((jsonlPath) => readBus(jsonlPath).events()));
// Also keep single-bus interface for eventbus section stats
const latestBusJsonl = findLatestBusJsonl(EVIDENCE_DIR);

// ---------------------------------------------------------------------------
// Collect TimeMachine section — from EventBus reducer (RG_COCKPIT04)
// ---------------------------------------------------------------------------
function collectTimemachine() {
  const tmEvents = allEvents.filter((e) => e.component === 'TIMEMACHINE');
  if (tmEvents.length === 0) {
    // Fallback: read from EPOCH-TIMEMACHINE- dir summary
    const epochName = findLatestEpoch('EPOCH-TIMEMACHINE-');
    if (!epochName) return { present: false, source: 'NONE', status: 'NO_EPOCH', paths: [] };
    const epochDir = path.join(EVIDENCE_DIR, epochName);
    const summary = readJson(path.join(epochDir, 'SUMMARY.json'));
    return {
      present: true,
      source: 'EPOCH_FALLBACK',
      epoch_name: epochName,
      run_id: summary?.run_id ?? null,
      ticks_total: summary?.ticks_total ?? null,
      ticks_failed: summary?.ticks_failed ?? null,
      status: summary?.status ?? 'UNKNOWN',
      reason_code: summary?.reason_code ?? 'UNKNOWN',
      paths: [],
    };
  }

  // Derive status from bus events
  const failedTmEvents = tmEvents.filter((e) => e.reason_code !== 'NONE');
  const ledgerBoot = tmEvents.find((e) => e.event === 'LEDGER_BOOT');
  const ledgerSeal = tmEvents.find((e) => e.event === 'LEDGER_SEAL');
  const tmRunId = ledgerBoot?.run_id ?? null;

  // Find epoch dir for file paths
  const epochName = findLatestEpoch('EPOCH-TIMEMACHINE-');
  const epochDir = epochName ? path.join(EVIDENCE_DIR, epochName) : null;
  const paths = [];
  if (epochDir) {
    const jsonlP = path.join(epochDir, 'TIMELINE.jsonl');
    const mdP = path.join(epochDir, 'TIMELINE.md');
    if (fs.existsSync(jsonlP)) paths.push(path.relative(ROOT, jsonlP));
    if (fs.existsSync(mdP)) paths.push(path.relative(ROOT, mdP));
  }

  return {
    present: true,
    source: 'EVENTBUS',
    epoch_name: epochName ?? null,
    run_id: tmRunId,
    ticks_total: tmEvents.length,
    ticks_failed: failedTmEvents.length,
    has_ledger_boot: !!ledgerBoot,
    has_ledger_seal: !!ledgerSeal,
    status: failedTmEvents.length === 0 ? 'PASS' : 'FAIL',
    reason_code: failedTmEvents.length === 0 ? 'NONE' : failedTmEvents[0].reason_code,
    paths,
  };
}

// ---------------------------------------------------------------------------
// Collect Autopilot section — from EventBus reducer (RG_COCKPIT04)
// ---------------------------------------------------------------------------
function collectAutopilot() {
  const apEvents = allEvents.filter((e) => e.component === 'AUTOPILOT');
  if (apEvents.length === 0) {
    // Fallback: read from EPOCH-AUTOPILOTV2- dir PLAN.json
    const epochName = findLatestEpoch('EPOCH-AUTOPILOTV2-');
    if (!epochName) return { present: false, source: 'NONE', status: 'NO_EPOCH', paths: [] };
    const epochDir = path.join(EVIDENCE_DIR, epochName);
    const plan = readJson(path.join(epochDir, 'PLAN.json'));
    return {
      present: true,
      source: 'EPOCH_FALLBACK',
      epoch_name: epochName,
      run_id: plan?.run_id ?? null,
      mode: plan?.mode ?? null,
      status: plan?.status ?? 'UNKNOWN',
      reason_code: plan?.reason_code ?? 'UNKNOWN',
      paths: [],
    };
  }

  // Derive from bus events
  const planCreated = apEvents.find((e) => e.event === 'PLAN_CREATED');
  const refusals = apEvents.filter((e) => e.event === 'REFUSAL');
  const applyAllowed = apEvents.find((e) => e.event === 'APPLY_ALLOWED');
  const applyExecuted = apEvents.find((e) => e.event === 'APPLY_EXECUTED');

  const apMode = planCreated?.mode ?? null;
  const apRunId = planCreated?.run_id ?? null;
  const apStatus = planCreated?.attrs?.autopilot_status ?? (refusals.length > 0 ? 'BLOCKED' : 'PASS');
  const apReasonCode = planCreated?.reason_code ?? 'NONE';

  // Find epoch dir for file paths
  const epochName = findLatestEpoch('EPOCH-AUTOPILOTV2-');
  const epochDir = epochName ? path.join(EVIDENCE_DIR, epochName) : null;
  const paths = [];
  if (epochDir) {
    const planMdP = path.join(epochDir, 'PLAN.md');
    const refusalMdP = path.join(epochDir, 'REFUSAL.md');
    if (fs.existsSync(planMdP)) paths.push(path.relative(ROOT, planMdP));
    if (fs.existsSync(refusalMdP)) paths.push(path.relative(ROOT, refusalMdP));
  }

  return {
    present: true,
    source: 'EVENTBUS',
    epoch_name: epochName ?? null,
    run_id: apRunId,
    mode: apMode,
    apply_allowed: !!applyAllowed,
    apply_executed: !!applyExecuted,
    refusal_n: refusals.length,
    refusal_codes: refusals.map((e) => e.reason_code),
    status: apStatus,
    reason_code: apReasonCode,
    paths,
  };
}

// ---------------------------------------------------------------------------
// Collect EventBus section — aggregate from all component buses
// ---------------------------------------------------------------------------
function collectEventBus() {
  if (allBusJsonls.length === 0) return { present: false, status: 'NO_EPOCH', events_n: 0, components: [] };
  const components = [...new Set(allEvents.map((e) => e.component))].sort();
  // BUS03: repo-relative POSIX paths sorted lex — stable canonical output
  const jsonl_paths = allBusJsonls.map((p) => path.relative(ROOT, p).split(path.sep).join('/')).sort((a, b) => a.localeCompare(b));
  return {
    present: true,
    source: 'EVENTBUS',
    bus_count: allBusJsonls.length,
    jsonl_paths,
    events_n: allEvents.length,
    components,
    status: 'PASS',
  };
}

// ---------------------------------------------------------------------------
// Collect fast gate section
// Primary: check LIFE EventBus for STEP_COMPLETE verify_fast event (ops:life run)
// Fallback: read EXECUTOR manual receipts (current run_id only — stale = NO_DATA)
// ---------------------------------------------------------------------------
function collectFastGate() {
  // Check LIFE EventBus: if a LIFE bus ran verify_fast and it passed, trust it
  const lifeEvents = allEvents.filter((e) => e.component === 'LIFE');
  const verifyFastLifeEvent = lifeEvents.find(
    (e) => e.event === 'STEP_COMPLETE' && e.attrs?.step_name === 'verify_fast'
  );
  if (verifyFastLifeEvent) {
    const lifeStatus = verifyFastLifeEvent.attrs?.step_status ?? 'UNKNOWN';
    return {
      status: lifeStatus,
      source: 'LIFE_EVENTBUS',
      step_status: lifeStatus,
      gates_checked: 1,
      failed_n: lifeStatus === 'PASS' ? 0 : 1,
      gates: [{ gate: 'verify_fast_via_life', status: lifeStatus, reason_code: 'NONE' }],
      failed: lifeStatus === 'PASS' ? [] : [{ gate: 'verify_fast_via_life', status: lifeStatus }],
    };
  }

  // Fallback: read EXECUTOR receipts — skip receipts with stale run_id
  const gateDir = path.join(EXECUTOR_DIR, 'gates', 'manual');
  if (!fs.existsSync(gateDir)) return { status: 'NO_RECEIPTS', source: 'EXECUTOR', gates: [], failed: [] };

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
      // Skip stale receipts (different run_id) — treat as NO_DATA
      // PR07: STABLE is always current (EXECUTOR receipts use stable run_id)
      if (data.run_id && data.run_id !== RUN_ID && data.run_id !== 'STABLE') continue;
      gates.push({ gate: f.replace('.json', ''), status: data.status ?? 'UNKNOWN', reason_code: data.reason_code ?? 'UNKNOWN' });
    }
  }

  const failed = gates.filter((g) => g.status !== 'PASS');
  const overallStatus = failed.length === 0 && gates.length > 0 ? 'PASS' : (gates.length === 0 ? 'NO_DATA' : 'FAIL');
  return { status: overallStatus, source: 'EXECUTOR', gates_checked: gates.length, failed_n: failed.length, gates, failed };
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
// Collect Readiness Scorecard — from public_data_readiness_seal.json (Phase C)
// Reads the machine-readable output of verify:public:data:readiness.
// Never uses mtime; reads deterministic EXECUTOR receipt only.
// ---------------------------------------------------------------------------
function collectReadiness() {
  const receipt = readJson(path.join(EXECUTOR_DIR, 'gates', 'manual', 'public_data_readiness_seal.json'));
  if (!receipt) return { status: 'NO_RECEIPT', reason_code: 'NO_DATA', per_lane: [], lanes_total: 0, truth_lanes_n: 0 };
  return {
    status: receipt.status ?? 'UNKNOWN',
    reason_code: receipt.reason_code ?? 'UNKNOWN',
    registry_schema_version: receipt.registry_schema_version ?? 'UNKNOWN',
    lanes_total: receipt.lanes_total ?? 0,
    truth_lanes_n: receipt.truth_lanes_n ?? 0,
    hint_lanes_n: receipt.hint_lanes_n ?? 0,
    warn_lanes_n: receipt.warn_lanes_n ?? 0,
    // Per-lane scorecard: lane_id, truth_level, status, reason_code, schema_version
    per_lane: (receipt.per_lane ?? []).map((r) => ({
      lane_id: r.lane_id,
      truth_level: r.truth_level,
      status: r.status,
      reason_code: r.reason_code,
      schema_version: r.schema_version ?? null,
    })).sort((a, b) => a.lane_id.localeCompare(b.lane_id)),
  };
}

// ---------------------------------------------------------------------------
// Collect FSM State — EPOCH-69 G6 FSM Dashboard
// ---------------------------------------------------------------------------
function collectFsmState() {
  try {
    const fsmKernelPath = path.join(ROOT, 'specs', 'fsm_kernel.json');
    if (!fs.existsSync(fsmKernelPath)) {
      return { present: false, state: 'UNKNOWN', note: 'FSM kernel not installed' };
    }
    const kernel = JSON.parse(fs.readFileSync(fsmKernelPath, 'utf8'));

    // Replay FSM state from aggregated events
    let fsmState = kernel.initial_state ?? 'BOOT';
    let transitionCount = 0;
    const transitionHistory = [];
    for (const ev of allEvents) {
      if (ev.event === 'STATE_TRANSITION' && ev.component === 'FSM' && ev.attrs?.to_state) {
        transitionHistory.push({
          tick: ev.tick,
          from: ev.attrs.from_state ?? fsmState,
          to: ev.attrs.to_state,
          transition_id: ev.attrs.transition_id ?? 'unknown',
        });
        fsmState = ev.attrs.to_state;
        transitionCount++;
      }
    }

    const mode = kernel.states?.[fsmState]?.mode ?? 'UNKNOWN';
    const goalStates = kernel.goal_states ?? ['CERTIFIED'];
    const defaultGoal = goalStates[0] ?? 'CERTIFIED';

    // Compute available transitions (inline — no circular import)
    const forbidden = kernel.forbidden_transitions ?? [];
    const isForbidden = (from, to) => forbidden.some((f) => f.from === from && f.to === to);
    const availableTransitions = [];
    for (const [id, trans] of Object.entries(kernel.transitions)) {
      if (trans.from !== '*' && trans.from !== fsmState) continue;
      if (trans.from === '*' && fsmState === 'BOOT') continue;
      if (isForbidden(fsmState, trans.to)) continue;
      if (trans.to === fsmState && trans.from !== '*') continue;
      availableTransitions.push(id);
    }

    // BFS path to goal (inline — lightweight, no state_manager import)
    const pathToGoal = [];
    if (fsmState !== defaultGoal) {
      const queue = [{ state: fsmState, path: [] }];
      const visited = new Set([fsmState]);
      while (queue.length > 0) {
        const { state: cur, path: curPath } = queue.shift();
        for (const [id, trans] of Object.entries(kernel.transitions)) {
          if (trans.from !== '*' && trans.from !== cur) continue;
          if (trans.from === '*' && cur === 'BOOT') continue;
          if (isForbidden(cur, trans.to)) continue;
          if (visited.has(trans.to)) continue;
          const newPath = [...curPath, id];
          if (trans.to === defaultGoal) {
            pathToGoal.push(...newPath);
            queue.length = 0;
            break;
          }
          visited.add(trans.to);
          queue.push({ state: trans.to, path: newPath });
        }
      }
    }

    return {
      present: true,
      state: fsmState,
      mode,
      goal: defaultGoal,
      path_to_goal: pathToGoal,
      available_transitions: availableTransitions,
      transitions_seen: transitionCount,
      transition_history: transitionHistory.slice(-10),
    };
  } catch {
    return { present: false, state: 'UNKNOWN', note: 'FSM kernel load error' };
  }
}

// ---------------------------------------------------------------------------
// Build HUD
// ---------------------------------------------------------------------------
const tm = collectTimemachine();
const ap = collectAutopilot();
const eb = collectEventBus();
const fg = collectFastGate();
const pr1 = collectPR01();
const wow = collectWowGates();
const readiness = collectReadiness();
const fsm = collectFsmState();

const overallFailed = [
  fg.status !== 'PASS' && fg.status !== 'NO_DATA' ? 'FAST_GATE' : null,
  pr1.status !== 'PASS' ? 'PR01' : null,
  wow.failed_n > 0 ? 'WOW_GATES' : null,
].filter(Boolean);

const hudStatus = overallFailed.length === 0 ? 'PASS' : 'BLOCKED';
const hudReasonCode = overallFailed.length === 0 ? 'NONE' : overallFailed.join('+');

// Collect all evidence paths from HUD sections (for RG_COCKPIT05)
const evidencePaths = [
  ...tm.paths ?? [],
  ...ap.paths ?? [],
  ...(eb.jsonl_path ? [eb.jsonl_path] : []),
].filter(Boolean);

// ---------------------------------------------------------------------------
// Write HUD.json
// ---------------------------------------------------------------------------
const hudJson = {
  schema_version: '1.0.0',
  gate_id: 'WOW_COCKPIT_INTEGRATION',
  run_id: RUN_ID,
  status: hudStatus,
  reason_code: hudReasonCode,
  eventbus_source: true,
  sections: {
    timemachine: tm,
    autopilot: ap,
    eventbus: eb,
    fast_gate: fg,
    readiness: readiness,
    pr01: pr1,
    wow_gates: wow,
    fsm: fsm,
  },
  evidence_paths: evidencePaths,
  overall_failed: overallFailed,
  next_action: 'npm run -s verify:fast',
};

writeJsonDeterministic(path.join(EPOCH_DIR, 'HUD.json'), hudJson);

// ---------------------------------------------------------------------------
// Write HUD.md
// ---------------------------------------------------------------------------
function statusIcon(s) { return s === 'PASS' ? 'PASS' : (s === 'NO_DATA' || s === 'NO_EPOCH' || s === 'NO_RECEIPTS' || s === 'NONE' ? 'NO_DATA' : 'FAIL'); }

const tmRows = tm.paths?.map((p) => `  - ${p}`).join('\n') || '  - NONE';
const apRows = ap.paths?.map((p) => `  - ${p}`).join('\n') || '  - NONE';
const fgRows = fg.gates.map((g) => `  | ${g.gate} | ${g.status} | ${g.reason_code} |`).join('\n') || '  | - | NO_DATA | - |';
const wowRows = wow.gates.map((g) => `  | ${g.gate} | ${g.status} | ${g.reason_code} |`).join('\n') || '  | - | NO_DATA | - |';
// Phase C: readiness scorecard rows (per-lane sorted by lane_id)
const readinessRows = readiness.per_lane.length > 0
  ? readiness.per_lane.map((r) => `  | ${r.lane_id} | ${r.truth_level} | ${r.status} | ${r.reason_code} | ${r.schema_version ?? '-'} |`).join('\n')
  : '  | - | - | NO_DATA | - | - |';

const hudMd = [
  `# COCKPIT HUD — EPOCH-COCKPIT-${RUN_ID}`,
  '',
  `STATUS: ${hudStatus}`,
  `REASON_CODE: ${hudReasonCode}`,
  `RUN_ID: ${RUN_ID}`,
  `EVENTBUS_SOURCE: true`,
  '',
  '---',
  '',
  '## [1] TIMEMACHINE',
  '',
  `STATUS: ${statusIcon(tm.status)}`,
  `SOURCE: ${tm.source ?? 'NONE'}`,
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
  `SOURCE: ${ap.source ?? 'NONE'}`,
  `EPOCH: ${ap.epoch_name ?? 'NONE'}`,
  `RUN_ID: ${ap.run_id ?? 'NONE'}`,
  `MODE: ${ap.mode ?? 'NONE'}`,
  `APPLY_ALLOWED: ${ap.apply_allowed ?? 'NONE'}`,
  `APPLY_EXECUTED: ${ap.apply_executed ?? 'NONE'}`,
  `REFUSAL_N: ${ap.refusal_n ?? 0}`,
  `REASON_CODE: ${ap.reason_code ?? 'NONE'}`,
  `REFUSAL_CODES: ${ap.refusal_codes?.join(',') || 'NONE'}`,
  'PATHS:',
  apRows,
  '',
  '---',
  '',
  '## [3] EVENTBUS',
  '',
  `STATUS: ${eb.status}`,
  `EVENTS_N: ${eb.events_n}`,
  `BUS_COUNT: ${eb.bus_count ?? 0}`,
  `COMPONENTS: ${eb.components?.join(', ') || 'NONE'}`,
  `JSONLS: ${eb.jsonl_paths?.join(', ') ?? eb.jsonl_path ?? 'NONE'}`,
  '',
  '---',
  '',
  '## [4] FAST GATE',
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
  '## [5] PR01 CLEANROOM',
  '',
  `STATUS: ${pr1.status}`,
  `REASON_CODE: ${pr1.reason_code}`,
  '',
  '---',
  '',
  '## [6] WOW6–WOW8 GATES',
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
  '## [7] DATA READINESS SCORECARD',
  '',
  `STATUS: ${readiness.status}`,
  `REASON_CODE: ${readiness.reason_code}`,
  `LANES_TOTAL: ${readiness.lanes_total}`,
  `TRUTH_LANES_N: ${readiness.truth_lanes_n}`,
  `HINT_LANES_N: ${readiness.hint_lanes_n ?? 0}`,
  `WARN_LANES_N: ${readiness.warn_lanes_n ?? 0}`,
  '',
  '  | Lane | TruthLevel | Status | Reason | Schema |',
  '  |------|------------|--------|--------|--------|',
  readinessRows,
  '',
  '---',
  '',
  '## [8] FSM STATE',
  '',
  `STATE: ${fsm.state}`,
  `MODE: ${fsm.mode ?? 'UNKNOWN'}`,
  `GOAL: ${fsm.goal ?? 'UNKNOWN'}`,
  `PATH_TO_GOAL: ${fsm.path_to_goal?.join(' → ') || 'NONE'}`,
  `AVAILABLE: ${fsm.available_transitions?.join(', ') || 'NONE'}`,
  `TRANSITIONS_SEEN: ${fsm.transitions_seen ?? 0}`,
  ...(fsm.note ? [`NOTE: ${fsm.note}`] : []),
  '',
  fsm.transition_history?.length > 0
    ? ['### Transition History (last 10)', '',
       '  | Tick | From | To | Transition |',
       '  |------|------|----|------------|',
       ...fsm.transition_history.map((t) => `  | ${t.tick} | ${t.from} | ${t.to} | ${t.transition_id} |`),
      ].join('\n')
    : '',
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
console.log(`  timemachine: ${tm.status} ticks=${tm.ticks_total ?? '?'} source=${tm.source ?? 'NONE'}`);
console.log(`  autopilot:   ${ap.status} mode=${ap.mode ?? '?'} source=${ap.source ?? 'NONE'}`);
console.log(`  eventbus:    ${eb.status} events=${eb.events_n}`);
console.log(`  fast_gate:   ${fg.status} (${fg.gates_checked} gates, ${fg.failed_n} failed)`);
console.log(`  pr01:        ${pr1.status}`);
console.log(`  wow_gates:   ${wow.gates_checked} checked, ${wow.failed_n} failed`);
console.log(`  readiness:   ${readiness.status} lanes=${readiness.lanes_total} truth=${readiness.truth_lanes_n}`);
console.log(`  fsm:         ${fsm.state} mode=${fsm.mode ?? '?'} goal=${fsm.goal ?? '?'}`);

process.exit(hudStatus === 'PASS' ? 0 : 1);
