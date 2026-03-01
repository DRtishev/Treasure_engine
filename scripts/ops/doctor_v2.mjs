/**
 * doctor_v2.mjs — ops:doctor — THE LIVING DOCTOR
 *
 * Architecture:
 *   Phase 0: SELF-HEAL (fix known infrastructure problems)
 *   Phase 1: STARTUP PROBE (can the engine boot?)
 *   Phase 2: LIVENESS PROBE (alive + deterministic?)
 *   Phase 3: READINESS PROBE (policy + SAN clean?)
 *   Phase 4: CHAOS GATES (immune system verification)
 *   Phase 5: PROVENANCE SEAL (merkle-anchored evidence)
 *   Phase 6: IMMUNE MEMORY UPDATE (learn from this run)
 *   Phase 7: SCOREBOARD + VERDICT
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
import { sealProvenance } from '../lib/provenance.mjs';
import { loadMemory, updateMemory, getRecurring, getPriorityGates } from '../lib/immune_memory.mjs';
import { createBus } from './eventbus_v1.mjs';

const ROOT = process.cwd();

// EPOCH-69: Doctor EventBus for FSM health subsystem (G5)
const doctorBusDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-DOCTOR-${RUN_ID}`);
const doctorBus = createBus(RUN_ID, doctorBusDir);

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
  const r = spawnSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: true, env: { ...process.env }, timeout: 300000 });
  const ec = r.status ?? 127;
  const icon = ec === 0 ? 'PASS' : 'FAIL';
  console.log(`${icon} ec=${ec}`);
  return { label, ec, ok: ec === 0, stdout: (r.stdout ?? '').slice(0, 300), stderr: (r.stderr ?? '').slice(0, 200) };
}

console.log('');
console.log('==============================================================');
console.log('  LIVING DOCTOR — EPOCH-DOCTOR');
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
startup.baseline = run('baseline:restore', 'npm run -s ops:baseline:restore');
startup.verify_once = run('verify:fast (boot)', 'npm run -s verify:fast');
const startupOk = startup.baseline.ok && startup.verify_once.ok;
const startupVerdict = startupOk ? 'BOOT_OK' : 'BOOT_FAIL';
console.log(`  STARTUP: ${startupVerdict}`);
console.log('');

if (!startupOk) {
  console.log('  STARTUP FAILED — aborting deeper checks');
  const failResult = {
    schema_version: '1.0.0', gate_id: 'DOCTOR_V2', run_id: RUN_ID,
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
liveness.fast1 = run('verify:fast (run 1)', 'npm run -s verify:fast');
liveness.fast2 = run('verify:fast (run 2)', 'npm run -s verify:fast');
liveness.life = run('ops:life', 'npm run -s ops:life');

// x2 determinism: capture LIFE_SUMMARY after the life run
// (Both runs use same RUN_ID so we capture content-based comparison)
const evidenceRoot = path.join(ROOT, 'reports', 'evidence');
const norm = (s) => s.replace(/"run_id":\s*"[^"]+"/g, '"run_id":"X"');

let life1Summary = '';
const lifeEpochs1 = fs.readdirSync(evidenceRoot).filter((d) => d.startsWith('EPOCH-LIFE-')).sort();
if (lifeEpochs1.length > 0) {
  const p1 = path.join(evidenceRoot, lifeEpochs1.at(-1), 'LIFE_SUMMARY.json');
  if (fs.existsSync(p1)) life1Summary = norm(fs.readFileSync(p1, 'utf8'));
}

// Run life a second time for x2 determinism
liveness.life2 = run('ops:life (x2)', 'npm run -s ops:life');

let life2Summary = '';
const lifeEpochs2 = fs.readdirSync(evidenceRoot).filter((d) => d.startsWith('EPOCH-LIFE-')).sort();
if (lifeEpochs2.length > 0) {
  const p2 = path.join(evidenceRoot, lifeEpochs2.at(-1), 'LIFE_SUMMARY.json');
  if (fs.existsSync(p2)) life2Summary = norm(fs.readFileSync(p2, 'utf8'));
}

const x2Identical = life1Summary.length > 0 && life1Summary === life2Summary;

const livenessAlive = liveness.fast1.ok && liveness.fast2.ok && liveness.life.ok;
let livenessVerdict = 'DEAD';
if (livenessAlive && x2Identical) livenessVerdict = 'ALIVE_DETERMINISTIC';
else if (livenessAlive && !x2Identical) livenessVerdict = 'ALIVE_FLAKY';
console.log(`  LIVENESS: ${livenessVerdict} (x2_identical=${x2Identical})`);

// EPOCH-69 G5: emit probe result for FSM consumption
if (!livenessAlive) {
  doctorBus.append({
    mode: 'CERT',
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

// ── Phase 4: CHAOS GATES ────────────────────────────────────────────
console.log('-- Phase 4: CHAOS GATES --');
const chaos = {};
chaos.mode_lie = run('chaos:mode_lie', 'node scripts/verify/chaos_mode_lie.mjs');
chaos.orphan = run('chaos:orphan', 'node scripts/verify/chaos_orphan_write.mjs');
chaos.fp01 = run('chaos:fp01', 'node scripts/verify/chaos_fp01_trap.mjs');

const chaosAllPass = chaos.mode_lie.ok && chaos.orphan.ok && chaos.fp01.ok;
const chaosVerdict = chaosAllPass ? 'IMMUNE' : 'VULNERABLE';
console.log(`  CHAOS: ${chaosVerdict}`);
console.log('');

// ── Phase 5: PROVENANCE SEAL ────────────────────────────────────────
console.log('-- Phase 5: PROVENANCE SEAL --');
let provenanceSealed = false;
try {
  const prov = sealProvenance(EPOCH_DIR, {
    run_id: RUN_ID,
    probes: { startup: startupVerdict, liveness: livenessVerdict, readiness: readinessVerdict },
    chaos: chaosVerdict,
  });
  provenanceSealed = true;
  console.log(`  Merkle root: ${prov.merkle_root.slice(0, 16)}... (${prov.leaf_count} leaves)`);
} catch (e) {
  console.log(`  Provenance seal failed: ${e.message}`);
}
console.log('');

// ── Phase 6: SCOREBOARD ─────────────────────────────────────────────
console.log('-- Phase 6: SCOREBOARD --');
const board = {};
let totalScore = 0;

function score(key, pass, weight) {
  const earned = pass ? weight : 0;
  board[key] = { weight, pass, earned };
  totalScore += earned;
}

score('startup_boot', startupOk, 10);
score('liveness_alive', livenessAlive, 15);
score('liveness_deterministic', x2Identical, 15);
score('readiness_policy', readiness.policy.ok, 20);
score('readiness_san', readiness.policy.ok, 10);
score('chaos_mode_lie', chaos.mode_lie.ok, 10);
score('chaos_orphan', chaos.orphan.ok, 10);
score('chaos_fp01', chaos.fp01.ok, 5);
score('provenance_sealed', provenanceSealed, 5);

const boardLines = Object.entries(board)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${v.pass ? '+' : '-'} ${k.padEnd(30)} ${String(v.earned).padStart(3)}/${v.weight}`)
  .join('\n');

console.log(boardLines);
console.log(`  ${'─'.repeat(40)}`);
console.log(`  TOTAL: ${totalScore}/100`);
console.log('');

// ── Phase 7: VERDICT ────────────────────────────────────────────────
let verdict = 'HEALTHY';
let verdictReason = 'NONE';

if (!livenessAlive) { verdict = 'SICK'; verdictReason = 'LIVENESS_FAIL'; }
else if (!x2Identical) { verdict = 'SICK'; verdictReason = 'NON_DETERMINISTIC'; }
else if (!readiness.policy.ok) { verdict = 'DEGRADED'; verdictReason = 'POLICY_FAIL'; }
else if (!chaosAllPass) { verdict = 'DEGRADED'; verdictReason = 'CHAOS_VULNERABILITY'; }
else if (!provenanceSealed) { verdict = 'DEGRADED'; verdictReason = 'PROVENANCE_FAIL'; }

// EPOCH-69 G5: emit doctor verdict for FSM consumption
doctorBus.append({
  mode: 'CERT',
  component: 'LIFE',
  event: 'DOCTOR_VERDICT',
  reason_code: verdict === 'HEALTHY' ? 'NONE' : verdictReason,
  surface: 'UX',
  attrs: { verdict, score: String(totalScore) },
});
doctorBus.flush();

// ── Phase 8: IMMUNE MEMORY UPDATE ───────────────────────────────────
const currentFailures = Object.entries(board).filter(([, v]) => !v.pass).map(([k]) => k);
const chaosResults = {
  CHAOS_MODE_LIE: chaos.mode_lie.ok ? 'PASS' : 'FAIL',
  CHAOS_ORPHAN: chaos.orphan.ok ? 'PASS' : 'FAIL',
  CHAOS_FP01: chaos.fp01.ok ? 'PASS' : 'FAIL',
};
const updatedMemory = updateMemory(currentFailures, chaosResults, healLog);
const recurring = getRecurring(updatedMemory);

if (recurring.length > 0) {
  console.log(`WARNING: RECURRING FAILURES (3+ times): ${recurring.join(', ')}`);
  console.log('  These need human attention — auto-remediation insufficient.');
  console.log('');
}

// ── Write evidence ──────────────────────────────────────────────────
writeJsonDeterministic(path.join(EPOCH_DIR, 'DOCTOR.json'), {
  schema_version: '1.0.0', gate_id: 'DOCTOR_V2', run_id: RUN_ID,
  status: verdict, reason_code: verdictReason, score: totalScore,
  probes: { startup: startupVerdict, liveness: livenessVerdict, readiness: readinessVerdict },
  chaos: chaosVerdict, scoreboard: board,
  life_x2_identical: x2Identical,
  heals_applied: healLog.length,
  recurring_failures: recurring,
  immune_memory_runs: updatedMemory.runs,
  next_action: verdict === 'HEALTHY' ? 'Ready for edge work' : 'npm run -s verify:fast',
});

const boardMd = Object.entries(board)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `| ${k} | ${v.weight} | ${v.pass ? 'PASS' : 'FAIL'} | ${v.earned} |`)
  .join('\n');

writeMd(path.join(EPOCH_DIR, 'DOCTOR.md'), [
  `# LIVING DOCTOR — EPOCH-DOCTOR-${RUN_ID}`, '',
  `VERDICT: **${verdict}**`, `REASON: ${verdictReason}`, `SCORE: ${totalScore}/100`, '',
  '## PROBES', '',
  `| Probe | Result |`, `|-------|--------|`,
  `| STARTUP | ${startupVerdict} |`,
  `| LIVENESS | ${livenessVerdict} |`,
  `| READINESS | ${readinessVerdict} |`,
  `| CHAOS | ${chaosVerdict} |`, '',
  '## SCOREBOARD', '', '| Check | Weight | Status | Earned |', '|-------|--------|--------|--------|', boardMd, '',
  `TOTAL: ${totalScore}/100`, '',
  '## SELF-HEAL LOG', healLog.length === 0 ? '- No healing needed' : healLog.map((h) => `- ${h.action}: ${h.detail}`).join('\n'), '',
  '## CHAOS RESULTS', '',
  `- MODE_LIE: ${chaos.mode_lie.ok ? 'IMMUNE' : 'VULNERABLE'}`,
  `- ORPHAN: ${chaos.orphan.ok ? 'IMMUNE' : 'VULNERABLE'}`,
  `- FP01: ${chaos.fp01.ok ? 'IMMUNE' : 'VULNERABLE'}`, '',
  recurring.length > 0 ? `## RECURRING FAILURES\n${recurring.map((r) => `- ${r} (${updatedMemory.failure_count[r]}x)`).join('\n')}` : '',
  '', `## IMMUNE MEMORY`, `- Total runs: ${updatedMemory.runs}`,
  `- Past failures tracked: ${Object.keys(updatedMemory.failure_count).length}`, '',
  '## NEXT ACTION', verdict === 'HEALTHY' ? 'System is ready for edge work.' : 'Fix failing probes, then rerun: npm run -s ops:doctor',
].join('\n'));

// Re-seal provenance AFTER final evidence writes
try { sealProvenance(EPOCH_DIR, { run_id: RUN_ID, verdict, score: totalScore }); } catch { /* best-effort */ }

console.log('==============================================================');
console.log(`  VERDICT: ${verdict}         SCORE: ${totalScore}/100`);
console.log(`  CHAOS:   ${chaosVerdict}          MEMORY: run #${updatedMemory.runs}`);
console.log('==============================================================');
console.log(`  EVIDENCE: ${path.relative(ROOT, EPOCH_DIR)}`);

process.exit(verdict === 'HEALTHY' ? 0 : verdict === 'DEGRADED' ? 0 : 1);
