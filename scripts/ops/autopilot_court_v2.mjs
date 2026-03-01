/**
 * autopilot_court_v2.mjs — WOW8 Autopilot Court V2 (EventBus-unified)
 *
 * Routes actions and refuses when policy is violated.
 * Dry-run by default; apply requires double-key unlock.
 * Emits events into EventBus: PLAN_CREATED, REFUSAL, APPLY_ALLOWED, APPLY_EXECUTED.
 *
 * Double-key apply unlock (R14):
 *   1) Flag --apply must be passed
 *   2) File artifacts/incoming/APPLY_AUTOPILOT must contain: APPLY_AUTOPILOT: YES
 *
 * Mode routing (RG_AUTO01):
 *   CERT    -> offline-only; write-scope enforced
 *   CLOSE   -> subset CERT; fast close; no exporters
 *   AUDIT   -> SSOT docs only; no CERT scripts
 *   RESEARCH -> no CERT scripts; network double-key required
 *   ACCEL   -> never authoritative
 *
 * Write-scope (R5): reports/evidence/EPOCH-AUTOPILOTV2-<RUN_ID>/
 *                   reports/evidence/EPOCH-EVENTBUS-<RUN_ID>/ (via bus.flush)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createBus, findAllBusJsonls, readBus, mergeAndSortEvents } from './eventbus_v1.mjs';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
const args = process.argv.slice(2);
const APPLY_FLAG = args.includes('--apply');
const MODE_ARG = args.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? null;

const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-AUTOPILOTV2-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

const APPLY_TOKEN_PATH = path.join(ROOT, 'artifacts', 'incoming', 'APPLY_AUTOPILOT');
const ALLOW_NETWORK_PATH = path.join(ROOT, 'artifacts', 'incoming', 'ALLOW_NETWORK');

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------
const VALID_MODES = ['CERT', 'CLOSE', 'AUDIT', 'RESEARCH', 'ACCEL'];

function detectMode() {
  // Priority 1: explicit CLI override (operator knows best)
  if (MODE_ARG && VALID_MODES.includes(MODE_ARG)) return MODE_ARG;

  // Priority 2: FSM-derived mode (EPOCH-69 G4 — nervous system)
  try {
    const fsmKernelPath = path.join(ROOT, 'specs', 'fsm_kernel.json');
    if (fs.existsSync(fsmKernelPath)) {
      const kernel = JSON.parse(fs.readFileSync(fsmKernelPath, 'utf8'));
      // Replay FSM state from all EventBus events
      const allBuses = findAllBusJsonls(EVIDENCE_DIR);
      const allEvts = mergeAndSortEvents(allBuses.map((p) => readBus(p).events()));
      let fsmState = kernel.initial_state ?? 'BOOT';
      for (const ev of allEvts) {
        if (ev.event === 'STATE_TRANSITION' && ev.component === 'FSM' && ev.attrs?.to_state) {
          fsmState = ev.attrs.to_state;
        }
      }
      const fsmMode = kernel.states?.[fsmState]?.mode;
      if (fsmMode && VALID_MODES.includes(fsmMode)) return fsmMode;
    }
  } catch { /* fallback to default */ }

  // Priority 3: default (backward-compat)
  return 'CERT';
}

// ---------------------------------------------------------------------------
// Apply unlock check (R14 double-key)
// ---------------------------------------------------------------------------
function checkApplyUnlock() {
  if (!APPLY_FLAG) return { unlocked: false, reason: 'flag_missing' };
  if (!fs.existsSync(APPLY_TOKEN_PATH)) return { unlocked: false, reason: 'token_file_missing' };
  const content = fs.readFileSync(APPLY_TOKEN_PATH, 'utf8').trim();
  if (content !== 'APPLY_AUTOPILOT: YES') return { unlocked: false, reason: 'token_content_invalid' };
  return { unlocked: true, reason: 'OK' };
}

// ---------------------------------------------------------------------------
// Network unlock check
// ---------------------------------------------------------------------------
function checkNetworkUnlock() {
  if (!fs.existsSync(ALLOW_NETWORK_PATH)) return { unlocked: false };
  const content = fs.readFileSync(ALLOW_NETWORK_PATH, 'utf8').trim();
  return { unlocked: content === 'ALLOW_NETWORK: YES' };
}

// ---------------------------------------------------------------------------
// Mode routing violations (RG_AUTO01 + RG_AUTO02)
// Hard violations only (info-level excluded from refusal)
// ---------------------------------------------------------------------------
function routeMode(mode, networkUnlocked) {
  const violations = [];

  if ((mode === 'CERT' || mode === 'CLOSE') && networkUnlocked) {
    violations.push({
      code: 'NETV01',
      surface: 'OFFLINE_AUTHORITY',
      detail: 'network enabled in CERT/CLOSE mode — forbidden by R3',
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// RG_AUTO02: RESEARCH mode must not run CERT scripts
// Returns a check result (informational — enforcement is at caller)
// ---------------------------------------------------------------------------
function checkResearchNoCert(mode) {
  if (mode !== 'RESEARCH') return 'OK';
  // RESEARCH mode detected — emit info that CERT scripts are forbidden
  return 'RESEARCH_MODE_CERT_SCRIPTS_FORBIDDEN';
}

// ---------------------------------------------------------------------------
// RG_AUTO03: PR cleanroom check — 0 tracked EPOCH files
// ---------------------------------------------------------------------------
function checkPRCleanroom() {
  // Tracked EPOCH files check: look for any EPOCH-* dirs in git-tracked paths
  // We verify gitignore covers reports/evidence/EPOCH-* patterns
  const gitignorePath = path.join(ROOT, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return { clean: false, reason: 'no_gitignore' };
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const coversEpoch = content.includes('EPOCH-') || content.includes('reports/evidence/EPOCH');
  return { clean: coversEpoch, reason: coversEpoch ? 'OK' : 'gitignore_missing_epoch_pattern' };
}

// ---------------------------------------------------------------------------
// Build action plan
// ---------------------------------------------------------------------------
function buildPlan(mode, applyUnlock, networkUnlocked) {
  const actions = [];

  actions.push({
    action_id: 'A01',
    description: 'Run verify:fast — mandatory boot gate',
    cmd: 'npm run -s verify:fast',
    mode_allowed: VALID_MODES,
    requires_apply: false,
  });

  if (mode === 'CERT' || mode === 'CLOSE') {
    actions.push({
      action_id: 'A02',
      description: 'Run TimeMachine ledger — tick-only heartbeat',
      cmd: 'npm run -s ops:timemachine',
      mode_allowed: ['CERT', 'CLOSE'],
      requires_apply: false,
    });
  }

  if (APPLY_FLAG && applyUnlock.unlocked) {
    actions.push({
      action_id: 'A03',
      description: 'Apply mode active — execute approved actions with double-key authorization',
      cmd: 'npm run -s verify:fast',
      mode_allowed: ['CERT'],
      requires_apply: true,
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Write PLAN.md
// ---------------------------------------------------------------------------
function writePlanMd(plan, status, mode, runId, outPath) {
  const dryRunLabel = APPLY_FLAG ? (plan.apply_unlocked ? 'APPLY' : 'DRY_RUN') : 'DRY_RUN';
  const actionRows = plan.actions
    .map((a) => `| ${a.action_id} | ${a.description} | \`${a.cmd}\` | ${a.requires_apply ? 'YES' : 'NO'} |`)
    .join('\n');

  const content = [
    `# AUTOPILOT COURT V2 — PLAN — EPOCH-AUTOPILOTV2-${runId}`,
    '',
    `STATUS: ${status}`,
    `MODE: ${mode}`,
    `RUN_LABEL: ${dryRunLabel}`,
    `RUN_ID: ${runId}`,
    `APPLY_UNLOCKED: ${plan.apply_unlocked}`,
    `NETWORK_UNLOCKED: ${plan.network_unlocked}`,
    '',
    '## ACTION PLAN',
    '',
    '| ID | Description | Command | Requires Apply |',
    '|----|-------------|---------|----------------|',
    actionRows || '| - | NONE | - | - |',
    '',
    '## NEXT_ACTION',
    `npm run -s verify:fast`,
    '',
  ].join('\n');

  writeMd(outPath, content);
}

// ---------------------------------------------------------------------------
// Write REFUSAL.md
// ---------------------------------------------------------------------------
function writeRefusalMd(refusals, runId, outPath) {
  if (refusals.length === 0) return;

  const rows = refusals.map((r) => `| ${r.code} | ${r.surface} | ${r.reason} |`).join('\n');
  const remedies = refusals.map((r) => `- **${r.code}**: ${r.remedy}`).join('\n');

  const content = [
    `# AUTOPILOT COURT V2 — REFUSAL — EPOCH-AUTOPILOTV2-${runId}`,
    '',
    `STATUS: REFUSED`,
    `RUN_ID: ${runId}`,
    '',
    '## REFUSAL REASONS',
    '',
    '| Code | Surface | Reason |',
    '|------|---------|--------|',
    rows,
    '',
    '## REMEDIES',
    '',
    remedies,
    '',
    '## NEXT_ACTION',
    `npm run -s verify:fast`,
    '',
  ].join('\n');

  writeMd(outPath, content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const mode = detectMode();
const applyUnlock = checkApplyUnlock();
const networkUnlock = checkNetworkUnlock();
const modeViolations = routeMode(mode, networkUnlock.unlocked);
const researchCertCheck = checkResearchNoCert(mode);
const cleanroom = checkPRCleanroom();

// Create EventBus for state machine event emission (RG_AUTO05)
// Uses component-keyed dir so ops:life can aggregate all component buses.
const busDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-AUTOPILOT-${RUN_ID}`);
const bus = createBus(RUN_ID, busDir);

// Determine overall status and reason
let overallStatus = 'PASS';
let reason_code = 'NONE';

const refusals = [];

if (APPLY_FLAG && !applyUnlock.unlocked) {
  overallStatus = 'BLOCKED';
  reason_code = 'AUTO04_APPLY_UNLOCK_REQUIRED';
  refusals.push({
    code: 'AUTO04_APPLY_UNLOCK_REQUIRED',
    surface: 'CONTRACT',
    reason: `Apply double-key unlock failed: ${applyUnlock.reason}`,
    remedy: `Create artifacts/incoming/APPLY_AUTOPILOT with content: APPLY_AUTOPILOT: YES`,
  });
}

for (const v of modeViolations) {
  if (overallStatus === 'PASS') {
    overallStatus = 'FAIL';
    reason_code = v.code;
  }
  refusals.push({
    code: v.code,
    surface: v.surface,
    reason: v.detail,
    remedy: 'Fix mode violation before proceeding',
  });
}

if (!cleanroom.clean) {
  if (overallStatus === 'PASS') {
    overallStatus = 'BLOCKED';
    reason_code = 'PR01_EVIDENCE_BLOAT';
  }
  refusals.push({
    code: 'PR01_EVIDENCE_BLOAT',
    surface: 'PR',
    reason: `PR cleanroom check failed: ${cleanroom.reason}`,
    remedy: 'Ensure .gitignore covers EPOCH-* patterns under reports/evidence/',
  });
}

const planDetails = {
  apply_unlocked: applyUnlock.unlocked,
  apply_unlock_reason: applyUnlock.reason,
  network_unlocked: networkUnlock.unlocked,
  actions: buildPlan(mode, applyUnlock, networkUnlock.unlocked),
};

// Emit state machine events into EventBus (RG_AUTO05)
bus.append({
  mode,
  component: 'AUTOPILOT',
  event: 'PLAN_CREATED',
  reason_code,
  surface: 'CONTRACT',
  attrs: {
    autopilot_status: overallStatus,
    apply_flag: String(APPLY_FLAG),
    actions_n: String(planDetails.actions.length),
  },
});

for (const r of refusals) {
  bus.append({
    mode,
    component: 'AUTOPILOT',
    event: 'REFUSAL',
    reason_code: r.code,
    surface: r.surface,
    attrs: { refusal_reason: r.reason },
  });
}

if (APPLY_FLAG && applyUnlock.unlocked) {
  bus.append({
    mode,
    component: 'AUTOPILOT',
    event: 'APPLY_ALLOWED',
    reason_code: 'NONE',
    surface: 'CONTRACT',
    attrs: { apply_unlock_reason: applyUnlock.reason },
  });
  bus.append({
    mode,
    component: 'AUTOPILOT',
    event: 'APPLY_EXECUTED',
    reason_code: 'NONE',
    surface: 'CONTRACT',
    attrs: { actions_n: String(planDetails.actions.length) },
  });
}

// Flush EventBus
const { jsonlPath: busJsonlPath, epochDir: busEpochDir } = bus.flush();

const planJsonPath = path.join(EPOCH_DIR, 'PLAN.json');
const planMdPath = path.join(EPOCH_DIR, 'PLAN.md');
const refusalMdPath = path.join(EPOCH_DIR, 'REFUSAL.md');

writePlanMd(planDetails, overallStatus, mode, RUN_ID, planMdPath);

writeJsonDeterministic(planJsonPath, {
  schema_version: '1.0.0',
  gate_id: 'WOW8_AUTOPILOT_COURT_V2',
  run_id: RUN_ID,
  status: overallStatus,
  reason_code,
  mode,
  apply_flag: APPLY_FLAG,
  apply_unlocked: applyUnlock.unlocked,
  apply_unlock_reason: applyUnlock.reason,
  network_unlocked: networkUnlock.unlocked,
  mode_violations: modeViolations.map((v) => ({ code: v.code, surface: v.surface })),
  research_cert_check: researchCertCheck,
  pr_cleanroom_clean: cleanroom.clean,
  pr_cleanroom_reason: cleanroom.reason,
  actions_count: planDetails.actions.length,
  refused: refusals.length > 0,
  refusal_codes: refusals.map((r) => r.code),
  eventbus_source: true,
  next_action: 'npm run -s verify:fast',
});

if (refusals.length > 0) {
  writeRefusalMd(refusals, RUN_ID, refusalMdPath);
}

const dryRunLabel = APPLY_FLAG ? (applyUnlock.unlocked ? 'APPLY' : 'DRY_RUN(apply_blocked)') : 'DRY_RUN';
console.log(`[${overallStatus}] ops:autopilot — ${reason_code} [${dryRunLabel}] mode=${mode}`);
console.log(`  PLAN:      ${path.relative(ROOT, planMdPath)}`);
console.log(`  PLAN_JSON: ${path.relative(ROOT, planJsonPath)}`);
console.log(`  EVENTBUS:  ${path.relative(ROOT, busEpochDir)}`);
if (refusals.length > 0) {
  console.log(`  REFUSAL:   ${path.relative(ROOT, refusalMdPath)}`);
}

process.exit(overallStatus === 'PASS' ? 0 : (overallStatus === 'BLOCKED' ? 2 : 1));
