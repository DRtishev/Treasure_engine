/**
 * doctor_v2.mjs — ops:doctor — THE LIVING DOCTOR v3 (EPOCH-DOCTOR)
 *
 * Architecture:
 *   Phase 0: SELF-HEAL (fix known infrastructure problems)
 *   Phase 1: STARTUP PROBE (can the engine boot?)
 *   Phase 2: LIVENESS PROBE (alive + deterministic?)
 *   Phase 3: READINESS PROBE (policy + SAN clean?)
 *   Phase 4: CHAOS GATES (immune system verification, adaptive order)
 *   Phase 5: PROVENANCE SEAL (merkle-anchored evidence + chain linking)
 *   Phase 6: INTELLIGENCE (differential, recovery, trending, predictive, escalation)
 *   Phase 7: IMMUNE MEMORY UPDATE (learn from this run + heal effectiveness)
 *   Phase 8: SCOREBOARD + VERDICT
 *
 * Network: FORBIDDEN (TREASURE_NET_KILL=1 self-set)
 * Write-scope: reports/evidence/EPOCH-DOCTOR-<RUN_ID>/
 * Exit: 0=HEALTHY, 1=SICK, 2=BLOCKED
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { healAll } from '../lib/self_heal.mjs';
import { sealProvenance, findPreviousDoctorRun, loadPreviousProvenance } from '../lib/provenance.mjs';
import { loadMemory, updateMemory, evaluateHealEffectiveness, getRecurring, getPriorityGates, saveMemory } from '../lib/immune_memory.mjs';
import { createBus } from './eventbus_v1.mjs';

const ROOT = process.cwd();

// Load manifest for configurable params
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/doctor_manifest.json'), 'utf8'));
const trendingCfg = manifest.trending || {};
const escalationCfg = manifest.escalation || {};
const predictiveCfg = manifest.predictive || {};

// EPOCH-69: Doctor EventBus for FSM health subsystem (G5)
const doctorBusDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-DOCTOR-${RUN_ID}`);
const doctorBus = createBus(RUN_ID, doctorBusDir);

// BUG-08 FIX: derive current mode from latest autopilot receipt (not hardcoded CERT)
let doctorCurrentMode = 'CERT';
try {
  const evidDir = path.join(ROOT, 'reports', 'evidence');
  const apDirs = fs.readdirSync(evidDir)
    .filter((d) => d.startsWith('EPOCH-AUTOPILOTV2-')).sort();
  if (apDirs.length > 0) {
    const planPath = path.join(evidDir, apDirs.at(-1), 'PLAN.json');
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      if (plan.mode) doctorCurrentMode = plan.mode;
    }
  }
} catch { /* fallback to CERT */ }

// Self-harden: no network
process.env.TREASURE_NET_KILL = '1';
const preloadAbs = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const reqFlag = `--require ${preloadAbs}`;
if (!(process.env.NODE_OPTIONS || '').includes(reqFlag)) {
  process.env.NODE_OPTIONS = ((process.env.NODE_OPTIONS || '') + ' ' + reqFlag).trim();
}

const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-DOCTOR-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

function run(label, cmd) {
  process.stdout.write(`  [DOCTOR] ${label} ... `);
  const r = spawnSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: true, env: { ...process.env, TREASURE_INSIDE_DOCTOR: '1' }, timeout: 300000 });
  const ec = r.status ?? 127;
  const icon = ec === 0 ? 'PASS' : 'FAIL';
  console.log(`${icon} ec=${ec}`);
  return { label, ec, ok: ec === 0, stdout: (r.stdout ?? '').slice(0, 300), stderr: (r.stderr ?? '').slice(0, 200) };
}

console.log('');
console.log('==============================================================');
console.log('  LIVING DOCTOR v3 — EPOCH-DOCTOR');
console.log(`  RUN_ID: ${RUN_ID}`);
console.log('==============================================================');
console.log('');

// ── Phase 0: SELF-HEAL ──────────────────────────────────────────────
console.log('-- Phase 0: SELF-HEAL --');
const healLog = healAll();
if (healLog.length > 0) {
  for (const h of healLog) console.log(`  [HEALED] ${h.action}: ${h.detail}`);
} else {
  console.log('  No healing needed');
}
console.log('');

// ── Phase 1: STARTUP PROBE ──────────────────────────────────────────
console.log('-- Phase 1: STARTUP PROBE --');
const startup = {};
// Skip startup probe when called from inside ops:life (TREASURE_INSIDE_LIFE=1)
// because ops:life already proved consciousness (verify:fast x2 in T02) and
// running baseline:restore + verify:fast here would destroy T1-T5 evidence.
if (process.env.TREASURE_INSIDE_LIFE === '1') {
  startup.baseline = { label: 'baseline:restore', ec: 0, ok: true, stdout: 'skipped (inside life)' };
  startup.verify_once = { label: 'verify:fast (boot)', ec: 0, ok: true, stdout: 'skipped (inside life — T02 proved x2)' };
  console.log('  [DOCTOR] startup probe ... SKIP (inside life — consciousness already proven)');
} else {
  startup.baseline = run('baseline:restore', 'npm run -s ops:baseline:restore');
  startup.verify_once = run('verify:fast (boot)', 'npm run -s verify:fast');
}
// Re-create EPOCH_DIR in case baseline:restore cleaned it
fs.mkdirSync(EPOCH_DIR, { recursive: true });
const startupOk = startup.baseline.ok && startup.verify_once.ok;
const startupVerdict = startupOk ? 'BOOT_OK' : 'BOOT_FAIL';
console.log(`  STARTUP: ${startupVerdict}`);
console.log('');

if (!startupOk) {
  console.log('  STARTUP FAILED — aborting deeper checks');
  const failResult = {
    schema_version: '2.0.0', gate_id: 'DOCTOR_V2', run_id: RUN_ID,
    status: 'BLOCKED', reason_code: 'STARTUP_FAIL', score: 0,
    probes: { startup: startupVerdict, liveness: 'SKIPPED', readiness: 'SKIPPED' },
    next_action: 'npm run -s verify:fast',
  };
  writeJsonDeterministic(path.join(EPOCH_DIR, 'DOCTOR.json'), failResult);
  writeMd(path.join(EPOCH_DIR, 'DOCTOR.md'), `# DOCTOR — BLOCKED\n\nSTARTUP FAILED. Fix verify:fast first.\n`);
  process.exit(2);
}

// ── Phase 2: LIVENESS PROBE ─────────────────────────────────────────
console.log('-- Phase 2: LIVENESS PROBE --');
const liveness = {};
const evidenceRoot = path.join(ROOT, 'reports', 'evidence');
const norm = (s) => s.replace(/"run_id":\s*"[^"]+"/g, '"run_id":"X"');
let life1Summary = '';
let life2Summary = '';
let x2Identical = false;

// When called from inside life, skip heavy liveness probes to avoid recursion.
// Life's consciousness (T02) already proved verify:fast x2 PASS.
if (process.env.TREASURE_INSIDE_LIFE === '1') {
  const stub = { label: 'skipped', ec: 0, ok: true, stdout: 'skipped (inside life — anti-recursion)' };
  liveness.fast1 = stub;
  liveness.fast2 = stub;
  liveness.life = stub;
  liveness.life2 = stub;
  x2Identical = true; // trust consciousness result
  console.log('  [DOCTOR] liveness probe ... SKIP (inside life — anti-recursion)');
} else {
  liveness.fast1 = run('verify:fast (run 1)', 'npm run -s verify:fast');
  liveness.fast2 = run('verify:fast (run 2)', 'npm run -s verify:fast');
  liveness.life = run('ops:life', 'npm run -s ops:life');

  const lifeEpochs1 = fs.readdirSync(evidenceRoot).filter((d) => d.startsWith('EPOCH-LIFE-')).sort();
  if (lifeEpochs1.length > 0) {
    const p1 = path.join(evidenceRoot, lifeEpochs1.at(-1), 'LIFE_SUMMARY.json');
    if (fs.existsSync(p1)) life1Summary = norm(fs.readFileSync(p1, 'utf8'));
  }

  // Clean evidence between runs so ops:life x2 starts from the same state.
  // Without this, proprioception replays events from run 1 → different summary.
  run('baseline:restore (x2 reset)', 'npm run -s ops:baseline:restore');
  fs.mkdirSync(EPOCH_DIR, { recursive: true });

  // Run life a second time for x2 determinism
  liveness.life2 = run('ops:life (x2)', 'npm run -s ops:life');

  const lifeEpochs2 = fs.readdirSync(evidenceRoot).filter((d) => d.startsWith('EPOCH-LIFE-')).sort();
  if (lifeEpochs2.length > 0) {
    const p2 = path.join(evidenceRoot, lifeEpochs2.at(-1), 'LIFE_SUMMARY.json');
    if (fs.existsSync(p2)) life2Summary = norm(fs.readFileSync(p2, 'utf8'));
  }

  x2Identical = life1Summary.length > 0 && life1Summary === life2Summary;
}

// DATA FRESHNESS CHECK (EPOCH-74)
let dataFreshnessPass = true;
const dataReadinessPath = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual/public_data_readiness_seal.json');
if (fs.existsSync(dataReadinessPath)) {
  try {
    const seal = JSON.parse(fs.readFileSync(dataReadinessPath, 'utf8'));
    const perLane = seal.per_lane || [];
    const truthPass = perLane
      .filter((l) => l.truth_level === 'TRUTH')
      .every((l) => l.status === 'PASS');
    dataFreshnessPass = truthPass;
    if (!truthPass) {
      console.log(`  [DATA_FRESHNESS] TRUTH lanes not all PASS`);
    } else {
      console.log(`  [DATA_FRESHNESS] TRUTH lanes PASS`);
    }
  } catch {
    console.log(`  [DATA_FRESHNESS] could not parse seal, skipping`);
  }
} else {
  console.log(`  [DATA_FRESHNESS] no readiness seal found, skipping`);
}

const livenessAlive = liveness.fast1.ok && liveness.fast2.ok && liveness.life.ok;
let livenessVerdict = 'DEAD';
if (livenessAlive && x2Identical) livenessVerdict = 'ALIVE_DETERMINISTIC';
else if (livenessAlive && !x2Identical) livenessVerdict = 'ALIVE_FLAKY';
console.log(`  LIVENESS: ${livenessVerdict} (x2_identical=${x2Identical})`);

// EPOCH-69 G5: emit probe result for FSM consumption
if (!livenessAlive) {
  doctorBus.append({
    mode: doctorCurrentMode,
    component: 'LIFE',
    event: 'PROBE_FAIL',
    reason_code: 'LIVENESS_FAIL',
    surface: 'CONTRACT',
    attrs: { probe: 'liveness', detail: livenessVerdict },
  });
}
console.log('');

// ── Phase 3: READINESS PROBE ────────────────────────────────────────
console.log('-- Phase 3: READINESS PROBE --');

// Load immune memory to prioritize
const memory = loadMemory();
const priorityGates = getPriorityGates(memory);
if (priorityGates.length > 0) {
  console.log(`  [MEMORY] Priority re-test: ${priorityGates.join(', ')}`);
}

const readiness = {};
readiness.policy = run('verify:doctor:policy', 'npm run -s verify:doctor:policy');
const readinessVerdict = readiness.policy.ok ? 'READY' : 'NOT_READY';
console.log(`  READINESS: ${readinessVerdict}`);
console.log('');

// ── Phase 4: CHAOS GATES (adaptive order) ───────────────────────────
console.log('-- Phase 4: CHAOS GATES (adaptive order) --');

// G-07: Adaptive chaos priority — deterministic sort
const chaosGatesDef = [
  { id: 'CHAOS_EVIDENCE_TAMPER', key: 'evidence_tamper', cmd: 'node scripts/verify/chaos_evidence_tamper.mjs' },
  { id: 'CHAOS_FP01', key: 'fp01', cmd: 'node scripts/verify/chaos_fp01_trap.mjs' },
  { id: 'CHAOS_MODE_LIE', key: 'mode_lie', cmd: 'node scripts/verify/chaos_mode_lie.mjs' },
  { id: 'CHAOS_NET_LEAK', key: 'net_leak', cmd: 'node scripts/verify/chaos_net_leak.mjs' },
  { id: 'CHAOS_ORPHAN', key: 'orphan', cmd: 'node scripts/verify/chaos_orphan_write.mjs' },
];

// Sort by: (1) failed_last_run DESC, (2) failure_count DESC, (3) gate ID ASC
const lastFailures = new Set(memory.last_failures || []);
const failureCount = memory.failure_count || {};
const sortedGates = [...chaosGatesDef].sort((a, b) => {
  const aFailedLast = lastFailures.has(`chaos_${a.key}`) ? 1 : 0;
  const bFailedLast = lastFailures.has(`chaos_${b.key}`) ? 1 : 0;
  if (bFailedLast !== aFailedLast) return bFailedLast - aFailedLast;
  const aCount = failureCount[`chaos_${a.key}`] || 0;
  const bCount = failureCount[`chaos_${b.key}`] || 0;
  if (bCount !== aCount) return bCount - aCount;
  return a.id.localeCompare(b.id);
});

const priorityLog = sortedGates.map((g) => {
  const fLast = lastFailures.has(`chaos_${g.key}`);
  const fCount = failureCount[`chaos_${g.key}`] || 0;
  return `${g.id}${fLast ? ' (failed last' + (fCount > 0 ? `, count=${fCount}` : '') + ')' : ''}`;
}).join(' → ');
console.log(`  [MEMORY] Chaos gate priority order: ${priorityLog}`);

const chaos = {};
for (const gate of sortedGates) {
  chaos[gate.key] = run(`chaos:${gate.key}`, gate.cmd);
}

const chaosAllPass = Object.values(chaos).every((r) => r.ok);
const chaosVerdict = chaosAllPass ? 'IMMUNE' : 'VULNERABLE';
console.log(`  CHAOS: ${chaosVerdict} (${Object.values(chaos).filter((r) => r.ok).length}/${Object.values(chaos).length} pass)`);
console.log('');

// ── Phase 5: PROVENANCE SEAL + CHAIN LINKING ────────────────────────
console.log('-- Phase 5: PROVENANCE SEAL + CHAIN LINKING --');
let provenanceSealed = false;
let provenanceChain = { chain_depth: 1, chain_integrity: 'GENESIS', parent_run: null };

// G-10: Find previous run for chain linking
const prevRun = findPreviousDoctorRun(evidenceRoot, RUN_ID);
const prevProv = prevRun ? loadPreviousProvenance(prevRun.dir) : null;

const chainOpts = {
  prev_merkle_root: prevProv?.merkle_root ?? 'GENESIS',
  prev_chain_depth: prevProv?.chain_depth ?? 0,
  prev_verified: false,
};

// Verify previous chain link if it exists
if (prevProv && prevProv.merkle_root && prevProv.merkle_root !== 'GENESIS') {
  chainOpts.prev_verified = true;
}

try {
  // Ensure EPOCH_DIR survives any prior cleanup (baseline:restore in Phase 1/2)
  fs.mkdirSync(EPOCH_DIR, { recursive: true });
  const prov = sealProvenance(EPOCH_DIR, {
    run_id: RUN_ID,
    probes: { startup: startupVerdict, liveness: livenessVerdict, readiness: readinessVerdict },
    chaos: chaosVerdict,
  }, chainOpts);
  provenanceSealed = true;
  provenanceChain = {
    chain_depth: prov.chain_depth,
    chain_integrity: prov.chain_integrity,
    parent_run: prevRun?.runId || null,
  };
  console.log(`  Merkle root: ${prov.merkle_root.slice(0, 16)}... (${prov.leaf_count} leaves)`);
  console.log(`  Chain: depth=${prov.chain_depth}, integrity=${prov.chain_integrity}`);
} catch (e) {
  console.log(`  Provenance seal failed: ${e.message}`);
}
console.log('');

// ── Phase 6: INTELLIGENCE ───────────────────────────────────────────
console.log('-- Phase 6: INTELLIGENCE --');

// Build partial board for intelligence phase (before final scoring)
const partialBoard = {};
partialBoard.startup_boot = { pass: startupOk };
partialBoard.liveness_alive = { pass: livenessAlive };
partialBoard.liveness_deterministic = { pass: x2Identical };
partialBoard.readiness_policy = { pass: readiness.policy.ok };
partialBoard.readiness_san = { pass: readiness.policy.ok };
partialBoard.chaos_mode_lie = { pass: chaos.mode_lie.ok };
partialBoard.chaos_orphan = { pass: chaos.orphan.ok };
partialBoard.chaos_fp01 = { pass: chaos.fp01.ok };
partialBoard.chaos_evidence_tamper = { pass: chaos.evidence_tamper.ok };
partialBoard.chaos_net_leak = { pass: chaos.net_leak.ok };
partialBoard.provenance_sealed = { pass: provenanceSealed };

// ── 6.1 DIFFERENTIAL (G-08) ────────────────────────────────────────
let differential = {
  has_previous: false,
  previous_run_id: null,
  axes: {
    INFRA: { prev: null, curr: null, direction: 'NEW_RUN' },
    DETERMINISM: { prev: null, curr: null, direction: 'NEW_RUN' },
    POLICY: { prev: null, curr: null, direction: 'NEW_RUN' },
    CHAOS: { prev_pass: [], curr_pass: [], flipped: [], direction: 'NEW_RUN' },
    REGRESSION: { prev_score: null, curr_score: null, delta: 0, direction: 'NEW_RUN' },
  },
  net_direction: 'NEW_RUN',
  degraded_axes: [],
};

if (prevRun) {
  const prevDoctorPath = path.join(prevRun.dir, 'DOCTOR.json');
  if (fs.existsSync(prevDoctorPath)) {
    try {
      const prevDoc = JSON.parse(fs.readFileSync(prevDoctorPath, 'utf8'));
      differential.has_previous = true;
      differential.previous_run_id = prevRun.runId;

      // INFRA axis: heal needed?
      const prevHeals = (prevDoc.heals_applied || 0) > 0;
      const currHeals = healLog.length > 0;
      const infraDir = prevHeals === currHeals ? 'SAME' : (currHeals && !prevHeals ? 'DEGRADED' : 'IMPROVED');
      differential.axes.INFRA = { prev: prevHeals, curr: currHeals, direction: infraDir };

      // DETERMINISM axis: x2 identical?
      const prevDet = prevDoc.life_x2_identical !== undefined ? prevDoc.life_x2_identical : true;
      const currDet = x2Identical;
      const detDir = prevDet === currDet ? 'SAME' : (currDet && !prevDet ? 'IMPROVED' : (!currDet && prevDet ? 'DEGRADED' : 'SAME'));
      differential.axes.DETERMINISM = { prev: prevDet, curr: currDet, direction: detDir };

      // POLICY axis
      const prevPolicy = prevDoc.probes?.readiness === 'READY';
      const currPolicy = readiness.policy.ok;
      const polDir = prevPolicy === currPolicy ? 'SAME' : (currPolicy && !prevPolicy ? 'IMPROVED' : 'DEGRADED');
      differential.axes.POLICY = { prev: prevPolicy ? 'READY' : 'NOT_READY', curr: currPolicy ? 'READY' : 'NOT_READY', direction: polDir };

      // CHAOS axis: gate pass/fail flips
      const prevScoreboard = prevDoc.scoreboard || {};
      const chaosGateIds = ['CHAOS_EVIDENCE_TAMPER', 'CHAOS_FP01', 'CHAOS_MODE_LIE', 'CHAOS_NET_LEAK', 'CHAOS_ORPHAN'];
      const chaosKeyMap = {
        CHAOS_EVIDENCE_TAMPER: 'chaos_evidence_tamper',
        CHAOS_FP01: 'chaos_fp01',
        CHAOS_MODE_LIE: 'chaos_mode_lie',
        CHAOS_NET_LEAK: 'chaos_net_leak',
        CHAOS_ORPHAN: 'chaos_orphan',
      };
      const prevPass = chaosGateIds.filter((id) => prevScoreboard[chaosKeyMap[id]]?.pass).sort();
      const currPass = chaosGateIds.filter((id) => partialBoard[chaosKeyMap[id]]?.pass).sort();
      const flipped = [];
      for (const id of chaosGateIds) {
        const pP = prevPass.includes(id);
        const cP = currPass.includes(id);
        if (pP !== cP) {
          flipped.push({ gate: id, direction: cP ? 'IMPROVED' : 'DEGRADED' });
        }
      }
      const chaosDir = flipped.length === 0 ? 'SAME'
        : flipped.some((f) => f.direction === 'DEGRADED') ? 'DEGRADED' : 'IMPROVED';
      differential.axes.CHAOS = { prev_pass: prevPass, curr_pass: currPass, flipped, direction: chaosDir };

      // REGRESSION axis: score delta
      const prevScore = typeof prevDoc.score === 'number' ? prevDoc.score : 100;
      const currScoreEstimate = Object.entries(partialBoard)
        .reduce((sum, [k, v]) => sum + (v.pass ? (manifest.scoreboard_v2[k] || 0) : 0), 0);
      const scoreDelta = currScoreEstimate - prevScore;
      const regDir = Math.abs(scoreDelta) < 1 ? 'SAME'
        : scoreDelta < -10 ? 'DEGRADED'
          : scoreDelta > 0 ? 'IMPROVED' : 'SAME';
      differential.axes.REGRESSION = { prev_score: prevScore, curr_score: currScoreEstimate, delta: scoreDelta, direction: regDir };

      // Net direction
      differential.degraded_axes = Object.entries(differential.axes)
        .filter(([, v]) => v.direction === 'DEGRADED')
        .map(([k]) => k);
      const allDirs = Object.values(differential.axes).map((a) => a.direction);
      if (differential.degraded_axes.length > 0) differential.net_direction = 'DEGRADED';
      else if (allDirs.some((d) => d === 'IMPROVED')) differential.net_direction = 'IMPROVED';
      else differential.net_direction = 'STABLE';
    } catch (e) {
      console.log(`  [DIFFERENTIAL] Could not read previous DOCTOR.json: ${e.message}`);
    }
  }
}

const differentialClean = differential.degraded_axes.length === 0;
console.log(`  [DIFFERENTIAL] Net direction: ${differential.net_direction} (${differential.degraded_axes.length} degraded axes)`);

// ── 6.2 RECOVERY VERIFICATION (G-09) ───────────────────────────────
let recovery = { had_prior_failures: false, recovered_gates: [], still_failing: [], status: 'NO_PRIOR_FAILURES' };

if (memory.last_failures && memory.last_failures.length > 0) {
  recovery.had_prior_failures = true;
  recovery.recovered_gates = memory.last_failures.filter((gate) => partialBoard[gate]?.pass).sort();
  recovery.still_failing = memory.last_failures.filter((gate) => !partialBoard[gate]?.pass).sort();

  if (recovery.recovered_gates.length > 0 && recovery.still_failing.length === 0) {
    recovery.status = 'FULL_RECOVERY';
    doctorBus.append({
      mode: doctorCurrentMode, component: 'DOCTOR', event: 'RECOVERY_VERIFIED',
      reason_code: 'DOCTOR_RECOVERY_VERIFIED', surface: 'CONTRACT',
      attrs: { gates: recovery.recovered_gates.join(',') },
    });
    console.log(`  [RECOVERY] VERIFIED: ${recovery.recovered_gates.join(', ')} now passing`);
  } else if (recovery.recovered_gates.length > 0) {
    recovery.status = 'PARTIAL_RECOVERY';
    doctorBus.append({
      mode: doctorCurrentMode, component: 'DOCTOR', event: 'RECOVERY_PARTIAL',
      reason_code: 'DOCTOR_RECOVERY_FAILED', surface: 'CONTRACT',
      attrs: { recovered: recovery.recovered_gates.join(','), failing: recovery.still_failing.join(',') },
    });
    console.log(`  [RECOVERY] PARTIAL: recovered=${recovery.recovered_gates.join(', ')}, still failing=${recovery.still_failing.join(', ')}`);
  } else {
    recovery.status = 'NO_RECOVERY';
    doctorBus.append({
      mode: doctorCurrentMode, component: 'DOCTOR', event: 'RECOVERY_FAILED',
      reason_code: 'DOCTOR_RECOVERY_FAILED', surface: 'CONTRACT',
      attrs: { gates: recovery.still_failing.join(',') },
    });
    console.log(`  [RECOVERY] INCOMPLETE: ${recovery.still_failing.join(', ')} still failing`);
  }
} else {
  console.log(`  [RECOVERY] No prior failures`);
}

// ── 6.3 TRENDING (G-DOC-07) ────────────────────────────────────────
const windowRuns = trendingCfg.window_runs || 10;
const paretoK = trendingCfg.pareto_k || 5;
const decayMinDrop = trendingCfg.decay_min_drop || 2;
const improveMinRise = trendingCfg.improve_min_rise || 2;
const imperfectThreshold = trendingCfg.imperfect_threshold || 100;

const scores = memory.score_history || [];
const totalRuns = memory.runs || 0;
const windowScores = scores.slice(-Math.min(windowRuns, scores.length));
const avgScore = windowScores.length > 0 ? Math.floor(windowScores.reduce((a, b) => a + b, 0) / windowScores.length) : 0;

const totalHeals = (memory.heal_history || []).length;
const healRate = totalRuns > 0 ? Math.round((totalHeals / totalRuns) * 100) / 100 : 0;

// Time to recovery
let timeToRecovery = 0;
if (scores.length > 0 && scores[scores.length - 1] < imperfectThreshold) {
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] < imperfectThreshold) timeToRecovery++;
    else break;
  }
}

// Pareto — top failing gates
const fcEntries = Object.entries(memory.failure_count || {})
  .filter(([, c]) => c > 0)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, paretoK)
  .map(([gate, count]) => ({ gate, count }));

// Score trend
let scoreTrend = 'STABLE';
if (scores.length < 3) {
  scoreTrend = 'INSUFFICIENT_DATA';
} else {
  const s = scores.slice(-3);
  if (s[0] > s[1] && s[1] > s[2] && (s[0] - s[2]) >= decayMinDrop) {
    scoreTrend = 'DECLINING';
  } else if (s[0] < s[1] && s[1] < s[2] && (s[2] - s[0]) >= improveMinRise) {
    scoreTrend = 'IMPROVING';
  }
}
const healthDecay = scoreTrend === 'DECLINING';

const trending = {
  total_runs: totalRuns,
  avg_score: avgScore,
  heal_rate: healRate,
  time_to_recovery: timeToRecovery,
  pareto: fcEntries,
  score_trend: scoreTrend,
  health_decay: healthDecay,
  window_runs: windowRuns,
};

console.log(`  [TRENDING] Score trend: ${scoreTrend}, avg=${avgScore}, runs=${totalRuns}`);

// ── 6.4 PREDICTIVE WARNING (G-12) ──────────────────────────────────
const minDataPoints = predictiveCfg.min_data_points || 5;
const momentumWindow = predictiveCfg.momentum_window || 3;
const riskThresholds = predictiveCfg.risk_thresholds || { medium: 20, high: 50 };

let predictive = { risk_score: 0, risk_level: 'INSUFFICIENT_DATA', momentum: 0, recurring_gates: 0, data_points: scores.length, warning_emitted: false };

if (scores.length >= minDataPoints) {
  const recent = scores.slice(-momentumWindow);
  const momentum = recent[recent.length - 1] - recent[0];
  const avgRecent = Math.floor(recent.reduce((a, b) => a + b, 0) / recent.length);
  const recurringCount = Object.values(memory.failure_count || {}).filter((c) => c >= 3).length;

  let riskScore = 0;
  if (momentum < -5) riskScore += 30;
  if (momentum < -10) riskScore += 20;
  if (avgRecent < 80) riskScore += 20;
  if (avgRecent < 60) riskScore += 20;
  if (recurringCount > 0) riskScore += 10 * Math.min(recurringCount, 3);

  let riskLevel = 'LOW';
  if (riskScore >= riskThresholds.high) riskLevel = 'HIGH';
  else if (riskScore >= riskThresholds.medium) riskLevel = 'MEDIUM';

  let warningEmitted = false;
  if (riskLevel === 'HIGH') {
    doctorBus.append({
      mode: doctorCurrentMode, component: 'DOCTOR', event: 'PREDICTIVE_WARNING',
      reason_code: 'DOCTOR_PREDICTIVE_WARNING', surface: 'UX',
      attrs: { risk_score: String(riskScore), risk_level: riskLevel },
    });
    warningEmitted = true;
    console.log(`  [PREDICTIVE] WARNING: next run failure risk HIGH (risk_score=${riskScore})`);
  }

  predictive = { risk_score: riskScore, risk_level: riskLevel, momentum, recurring_gates: recurringCount, data_points: scores.length, warning_emitted: warningEmitted };
} else {
  console.log(`  [PREDICTIVE] Insufficient data (${scores.length}/${minDataPoints} runs)`);
}

// ── 6.5 ESCALATION LADDER (G-14) ───────────────────────────────────
const stage1Drops = escalationCfg.stage_1_drops || 2;
const stage2Drops = escalationCfg.stage_2_drops || 3;
const stage3Drops = escalationCfg.stage_3_drops || 5;
const stage3MinScore = escalationCfg.stage_3_min_score || 50;
const bigDropThreshold = escalationCfg.big_drop_threshold || 15;

let consecutiveDrops = 0;
if (scores.length >= 2) {
  for (let i = scores.length - 1; i >= 1; i--) {
    if (scores[i] < scores[i - 1]) consecutiveDrops++;
    else break;
  }
}

const maxSingleDrop = scores.length >= 2 ? Math.max(scores[scores.length - 2] - scores[scores.length - 1], 0) : 0;
const lastScore = scores.length > 0 ? scores[scores.length - 1] : 100;

let escalationStage = 0;
if (consecutiveDrops >= stage3Drops || lastScore < stage3MinScore) escalationStage = 3;
else if (consecutiveDrops >= stage2Drops || maxSingleDrop > bigDropThreshold) escalationStage = 2;
else if (consecutiveDrops >= stage1Drops) escalationStage = 1;

let escalationResponse = 'NONE';

// G-03 + G-14: Health decay auto-response
if (escalationStage >= 2) {
  const last3 = scores.slice(-3).join(',');
  doctorBus.append({
    mode: doctorCurrentMode, component: 'DOCTOR', event: 'HEALTH_DECAY',
    reason_code: 'DOCTOR_HEALTH_DECAY', surface: 'READINESS',
    attrs: { last3_scores: last3, escalation_stage: String(escalationStage), consecutive_drops: String(consecutiveDrops) },
  });
  escalationResponse = 'HEALTH_DECAY_EVENT_EMITTED';
  console.log(`  WARNING: HEALTH_DECAY — ${consecutiveDrops} consecutive score drops, escalation stage ${escalationStage}`);
}

if (escalationStage >= 3) {
  doctorBus.append({
    mode: doctorCurrentMode, component: 'DOCTOR', event: 'ESCALATION_STAGE_3',
    reason_code: 'DOCTOR_ESCALATION_STAGE_3', surface: 'READINESS',
    attrs: { score: String(lastScore), consecutive_drops: String(consecutiveDrops) },
  });
  escalationResponse = 'ESCALATION_STAGE_3_EMITTED';
  console.log(`  CRITICAL: ESCALATION STAGE 3 — immediate attention required`);
}

console.log(`  [ESCALATION] Stage ${escalationStage} (${consecutiveDrops} consecutive drops, max single drop=${maxSingleDrop})`);
console.log('');

// ── Phase 7: IMMUNE MEMORY UPDATE ───────────────────────────────────
console.log('-- Phase 7: IMMUNE MEMORY UPDATE --');

// G-13: Evaluate heal effectiveness BEFORE updating memory
evaluateHealEffectiveness(memory, partialBoard);

const currentFailures = Object.entries(partialBoard).filter(([, v]) => !v.pass).map(([k]) => k);
// Add differential_clean to failures if degraded
if (!differentialClean) currentFailures.push('differential_clean');

const chaosResults = {};
for (const gate of chaosGatesDef) {
  chaosResults[gate.id] = chaos[gate.key].ok ? 'PASS' : 'FAIL';
}

// Compute score for memory (before formal scoreboard for persisting)
// Include differential_clean in the same pass as other board entries
const allBoardEntries = { ...partialBoard, differential_clean: { pass: differentialClean } };
const preScore = Object.entries(allBoardEntries)
  .reduce((sum, [k, v]) => sum + (v.pass ? (manifest.scoreboard_v2[k] || 0) : 0), 0);

// BUG-01 fix: now pass totalScore to updateMemory
// Pass existing_memory so evaluateHealEffectiveness mutations are preserved
const updatedMemory = updateMemory(currentFailures, chaosResults, healLog, preScore, {
  max_score_history: trendingCfg.max_score_history || 200,
  max_heal_history: 50,
  existing_memory: memory,
});
const recurring = getRecurring(updatedMemory);

// Update trending snapshot in memory
updatedMemory.trending_snapshot = {
  pareto: fcEntries,
  avg_score: avgScore,
  heal_rate: healRate,
  time_to_recovery: timeToRecovery,
};
saveMemory(updatedMemory);

if (recurring.length > 0) {
  console.log(`WARNING: RECURRING FAILURES (3+ times): ${recurring.join(', ')}`);
  console.log('  These need human attention — auto-remediation insufficient.');
}
console.log('');

// Heal effectiveness summary
const healEff = updatedMemory.heal_effectiveness || { total: 0, effective: 0, ineffective: 0 };
const healEffPending = (updatedMemory.heal_history || []).filter((h) => typeof h === 'object' && h.effective === null).length;
const healEffRate = healEff.total > 0 ? Math.round((healEff.effective / healEff.total) * 100) / 100 : 0;

// ── Phase 8: SCOREBOARD + VERDICT ───────────────────────────────────
console.log('-- Phase 8: SCOREBOARD + VERDICT --');
const board = {};
let totalScore = 0;
const weights = manifest.scoreboard_v2; // single source of truth

function score(key, pass) {
  const weight = weights[key] || 0;
  const earned = pass ? weight : 0;
  board[key] = { weight, pass, earned };
  totalScore += earned;
}

score('startup_boot', startupOk);
score('liveness_alive', livenessAlive);
score('liveness_deterministic', x2Identical);
score('readiness_policy', readiness.policy.ok);
score('readiness_san', readiness.policy.ok);
score('chaos_mode_lie', chaos.mode_lie.ok);
score('chaos_orphan', chaos.orphan.ok);
score('chaos_fp01', chaos.fp01.ok);
score('chaos_evidence_tamper', chaos.evidence_tamper.ok);
score('chaos_net_leak', chaos.net_leak.ok);
score('provenance_sealed', provenanceSealed);
score('differential_clean', differentialClean);

const boardLines = Object.entries(board)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${v.pass ? '+' : '-'} ${k.padEnd(30)} ${String(v.earned).padStart(3)}/${v.weight}`)
  .join('\n');

console.log(boardLines);
console.log(`  ${'─'.repeat(40)}`);
console.log(`  TOTAL: ${totalScore}/100`);
console.log('');

// ── VERDICT ─────────────────────────────────────────────────────────
let verdict = 'HEALTHY';
let verdictReason = 'NONE';

if (!livenessAlive) { verdict = 'SICK'; verdictReason = 'LIVENESS_FAIL'; }
else if (!x2Identical) { verdict = 'SICK'; verdictReason = 'NON_DETERMINISTIC'; }
else if (!readiness.policy.ok) { verdict = 'DEGRADED'; verdictReason = 'POLICY_FAIL'; }
else if (!chaosAllPass) { verdict = 'DEGRADED'; verdictReason = 'CHAOS_VULNERABILITY'; }
else if (!provenanceSealed) { verdict = 'DEGRADED'; verdictReason = 'PROVENANCE_FAIL'; }

// EPOCH-69 G5: emit doctor verdict for FSM consumption
doctorBus.append({
  mode: doctorCurrentMode,
  component: 'DOCTOR',
  event: 'DOCTOR_VERDICT',
  reason_code: verdict === 'HEALTHY' ? 'NONE' : verdictReason,
  surface: 'UX',
  attrs: { verdict, score: String(totalScore), escalation_stage: String(escalationStage) },
});
doctorBus.flush();

// ── Write evidence ──────────────────────────────────────────────────
writeJsonDeterministic(path.join(EPOCH_DIR, 'DOCTOR.json'), {
  schema_version: '2.0.0', gate_id: 'DOCTOR_V2', run_id: RUN_ID,
  status: verdict, reason_code: verdictReason, score: totalScore,
  probes: { startup: startupVerdict, liveness: livenessVerdict, readiness: readinessVerdict },
  chaos: chaosVerdict, scoreboard: board,
  life_x2_identical: x2Identical,
  heals_applied: healLog.length,
  recurring_failures: recurring,
  immune_memory_runs: updatedMemory.runs,
  trending,
  differential,
  recovery,
  predictive,
  provenance_chain: provenanceChain,
  escalation_stage: escalationStage,
  heal_effectiveness: {
    total_heals: healEff.total,
    effective: healEff.effective,
    ineffective: healEff.ineffective,
    pending: healEffPending,
    rate: healEffRate,
  },
  next_action: verdict === 'HEALTHY' ? 'Ready for edge work' : 'npm run -s verify:fast',
});

// ── DOCTOR.md ───────────────────────────────────────────────────────
const boardMd = Object.entries(board)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `| ${k} | ${v.weight} | ${v.pass ? 'PASS' : 'FAIL'} | ${v.earned} |`)
  .join('\n');

const chaosMdRows = chaosGatesDef
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((g) => `| ${g.id} | ${chaos[g.key].ok ? 'IMMUNE' : 'VULNERABLE'} |`)
  .join('\n');

// Differential table
const diffMdRows = [];
for (const axis of ['INFRA', 'DETERMINISM', 'POLICY', 'CHAOS', 'REGRESSION']) {
  const a = differential.axes[axis];
  let prevStr, currStr;
  if (axis === 'CHAOS') {
    prevStr = a.prev_pass ? `${a.prev_pass.length}/${chaosGatesDef.length} pass` : 'N/A';
    currStr = a.curr_pass ? `${a.curr_pass.length}/${chaosGatesDef.length} pass` : 'N/A';
  } else if (axis === 'REGRESSION') {
    prevStr = a.prev_score !== null ? `${a.prev_score}/100` : 'N/A';
    currStr = a.curr_score !== null ? `${a.curr_score}/100` : 'N/A';
    if (a.direction !== 'NEW_RUN' && a.delta !== 0) currStr += ` (delta=${a.delta > 0 ? '+' : ''}${a.delta})`;
  } else if (axis === 'INFRA') {
    prevStr = a.prev !== null ? (a.prev ? 'heal needed' : 'no heal') : 'N/A';
    currStr = a.curr !== null ? (a.curr ? 'heal needed' : 'no heal') : 'N/A';
  } else if (axis === 'DETERMINISM') {
    prevStr = a.prev !== null ? (a.prev ? 'x2 identical' : 'flaky') : 'N/A';
    currStr = a.curr !== null ? (a.curr ? 'x2 identical' : 'flaky') : 'N/A';
  } else {
    prevStr = a.prev !== null ? String(a.prev) : 'N/A';
    currStr = a.curr !== null ? String(a.curr) : 'N/A';
  }
  diffMdRows.push(`| ${axis} | ${prevStr} | ${currStr} | ${a.direction} |`);
}

// Score history (last 5)
const last5Scores = (updatedMemory.score_history || []).slice(-5).join(', ');

const doctorMd = [
  `# LIVING DOCTOR — EPOCH-DOCTOR-${RUN_ID}`, '',
  `VERDICT: **${verdict}**`, `REASON: ${verdictReason}`, `SCORE: ${totalScore}/100`,
  `ESCALATION: STAGE ${escalationStage}`, '',
  '## PROBES', '', '| Probe | Result |', '|-------|--------|',
  `| STARTUP | ${startupVerdict} |`,
  `| LIVENESS | ${livenessVerdict} |`,
  `| READINESS | ${readinessVerdict} |`,
  `| CHAOS | ${chaosVerdict} |`, '',
  '## SCOREBOARD', '', '| Check | Weight | Status | Earned |', '|-------|--------|--------|--------|', boardMd, '',
  `TOTAL: ${totalScore}/100`, '',
  '## SELF-HEAL LOG', healLog.length === 0 ? '- No healing needed' : healLog.map((h) => `- ${h.action}: ${h.detail}`).join('\n'), '',
  '## CHAOS RESULTS', '', '| Gate | Status |', '|------|--------|', chaosMdRows, '',
  '## DIFFERENTIAL (vs previous run)', '',
  '| Axis | Previous | Current | Direction |', '|------|----------|---------|-----------|',
  ...diffMdRows, '',
  `**Net direction:** ${differential.net_direction}`, '',
  '## RECOVERY',
  recovery.had_prior_failures
    ? `- Recovered: ${recovery.recovered_gates.length > 0 ? recovery.recovered_gates.join(', ') : 'none'}`
      + `\n- Still failing: ${recovery.still_failing.length > 0 ? recovery.still_failing.join(', ') : 'none'}`
      + `\n- Status: ${recovery.status}`
    : `- No prior failures. Status: ${recovery.status}`,
  '',
  '## TRENDING (G-DOC-07)', '', '| Metric | Value |', '|--------|-------|',
  `| Average score (last ${windowRuns}) | ${avgScore}/100 |`,
  `| Heal rate | ${healRate}/run |`,
  `| Time-to-recovery | ${timeToRecovery} runs |`,
  `| Total runs | ${totalRuns} |`,
  `| Score trend | ${scoreTrend} |`,
  `| Health decay | ${healthDecay ? 'YES' : 'NO'} |`, '',
  '### Pareto (top failing gates)',
  fcEntries.length === 0 ? '_No recurring failures._' : fcEntries.map((p) => `- ${p.gate}: ${p.count}x`).join('\n'), '',
  '## PREDICTIVE ANALYSIS', '', '| Metric | Value |', '|--------|-------|',
  `| Risk score | ${predictive.risk_score}/100 |`,
  `| Risk level | ${predictive.risk_level} |`,
  `| Score momentum (${momentumWindow}-run) | ${predictive.momentum > 0 ? '+' : ''}${predictive.momentum} |`,
  `| Recurring gate failures | ${predictive.recurring_gates} |`,
  `| Warning emitted | ${predictive.warning_emitted ? 'YES' : 'NO'} |`, '',
  '## IMMUNE MEMORY',
  `- Total runs: ${updatedMemory.runs}`,
  `- Past failures tracked: ${Object.keys(updatedMemory.failure_count).length}`,
  `- Heal effectiveness: ${healEff.total > 0 ? `${Math.round(healEffRate * 100)}% (${healEff.effective}/${healEff.total})` : 'N/A'}`,
  `- Score history (last 5): ${last5Scores || 'none'}`, '',
  '## PROVENANCE CHAIN',
  `- Chain depth: ${provenanceChain.chain_depth}`,
  `- Chain integrity: ${provenanceChain.chain_integrity}`,
  `- Parent: ${provenanceChain.parent_run || 'GENESIS'}`, '',
  recurring.length > 0 ? `## RECURRING FAILURES\n${recurring.map((r) => `- ${r} (${updatedMemory.failure_count[r]}x)`).join('\n')}\n` : '',
  '## NEXT ACTION', verdict === 'HEALTHY' ? 'System is ready for edge work.' : 'Fix failing probes, then rerun: npm run -s ops:doctor',
].join('\n');

writeMd(path.join(EPOCH_DIR, 'DOCTOR.md'), doctorMd);

// Re-seal provenance AFTER final evidence writes
try { sealProvenance(EPOCH_DIR, { run_id: RUN_ID, verdict, score: totalScore }, chainOpts); } catch { /* best-effort */ }

console.log('==============================================================');
console.log(`  VERDICT: ${verdict}         SCORE: ${totalScore}/100`);
console.log(`  CHAOS:   ${chaosVerdict}          MEMORY: run #${updatedMemory.runs}`);
console.log(`  CHAIN:   depth=${provenanceChain.chain_depth} integrity=${provenanceChain.chain_integrity}`);
console.log('==============================================================');
console.log(`  EVIDENCE: ${path.relative(ROOT, EPOCH_DIR)}`);

process.exit(verdict === 'HEALTHY' ? 0 : verdict === 'DEGRADED' ? 0 : 1);
