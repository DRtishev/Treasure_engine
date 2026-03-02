/**
 * doctor.mjs — ops:doctor — Single-button deterministic health proof
 *
 * Pipeline: baseline:restore → ops:life x2 → byte-compare → verify:doctor:policy → scoreboard
 * Network: FORBIDDEN (TREASURE_NET_KILL=1 self-set)
 * Write-scope: reports/evidence/EPOCH-DOCTOR-<RUN_ID>/
 * Exit: 0=PASS, 1=FAIL, 2=BLOCKED
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getScoreboardWeights } from '../gov/policy_engine.mjs';

const ROOT = process.cwd();
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
  const r = spawnSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: true, env: { ...process.env } });
  const ec = r.status ?? 127;
  console.log(ec === 0 ? 'PASS' : `FAIL (ec=${ec})`);
  return { label, ec, ok: ec === 0, stdout: (r.stdout ?? '').trim().slice(0, 500) };
}

console.log(`[DOCTOR] BOOT — RUN_ID=${RUN_ID}`);
console.log('');

const results = {};
results.baseline = run('baseline:restore', 'npm run -s ops:baseline:restore');
results.life1 = run('ops:life (run 1)', 'npm run -s ops:life');

// Capture LIFE_SUMMARY after run 1
const evidenceDir = path.join(ROOT, 'reports', 'evidence');
const norm = (s) => s.replace(/"run_id":\s*"[^"]+"/g, '"run_id":"X"');
let life1Summary = '';
const lifeEpochs1 = fs.readdirSync(evidenceDir).filter((d) => d.startsWith('EPOCH-LIFE-')).sort();
if (lifeEpochs1.length > 0) {
  const p1 = path.join(evidenceDir, lifeEpochs1.at(-1), 'LIFE_SUMMARY.json');
  if (fs.existsSync(p1)) life1Summary = norm(fs.readFileSync(p1, 'utf8'));
}

results.life2 = run('ops:life (run 2)', 'npm run -s ops:life');

// Capture LIFE_SUMMARY after run 2 and compare
let life2Summary = '';
const lifeEpochs2 = fs.readdirSync(evidenceDir).filter((d) => d.startsWith('EPOCH-LIFE-')).sort();
if (lifeEpochs2.length > 0) {
  const p2 = path.join(evidenceDir, lifeEpochs2.at(-1), 'LIFE_SUMMARY.json');
  if (fs.existsSync(p2)) life2Summary = norm(fs.readFileSync(p2, 'utf8'));
}

let x2Identical = life1Summary.length > 0 && life1Summary === life2Summary;
console.log(`  [DOCTOR] life x2 identical: ${x2Identical}`);

results.policy = run('verify:doctor:policy', 'npm run -s verify:doctor:policy');

// Scoreboard
const weights = getScoreboardWeights();
const board = {};
let total = 0;
function score(key, pass) {
  const w = weights[key] ?? 0;
  const earned = pass ? w : 0;
  board[key] = { weight: w, pass, earned };
  total += earned;
}
score('verify_fast_pass', results.life1.ok);
score('ops_life_pass', results.life1.ok && results.life2.ok && x2Identical);
score('kernel_valid', results.policy.ok);
score('mode_truth_clean', results.policy.ok);
score('write_scope_clean', results.policy.ok);
score('san_cert_offline_pass', results.policy.ok);
score('san_research_net_pass', results.policy.ok);

let doctorStatus = 'PASS';
let doctorReason = 'NONE';
if (!results.life1.ok || !results.life2.ok) { doctorStatus = 'FAIL'; doctorReason = 'LIFE_STEP_FAIL'; }
else if (!x2Identical) { doctorStatus = 'FAIL'; doctorReason = 'RG_DOCTOR01_VIOLATION'; }
else if (!results.policy.ok) { doctorStatus = 'FAIL'; doctorReason = 'POLICY_CHECK_FAIL'; }

writeJsonDeterministic(path.join(EPOCH_DIR, 'DOCTOR.json'), {
  schema_version: '1.0.0', gate_id: 'DOCTOR_OS', run_id: RUN_ID,
  status: doctorStatus, reason_code: doctorReason, score: total,
  scoreboard: board, life_x2_identical: x2Identical,
  steps: { baseline: { ec: results.baseline.ec }, life1: { ec: results.life1.ec }, life2: { ec: results.life2.ec }, policy: { ec: results.policy.ec } },
  next_action: doctorStatus === 'PASS' ? 'npm run -s ops:doctor' : 'npm run -s verify:fast',
});

const boardRows = Object.entries(board).sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `| ${k} | ${v.weight} | ${v.pass ? 'PASS' : 'FAIL'} | ${v.earned} |`).join('\n');

writeMd(path.join(EPOCH_DIR, 'DOCTOR.md'), [
  `# DOCTOR — EPOCH-DOCTOR-${RUN_ID}`, '',
  `STATUS: ${doctorStatus}`, `REASON_CODE: ${doctorReason}`, `RUN_ID: ${RUN_ID}`, `SCORE: ${total}/100`, '',
  '## SCOREBOARD', '', '| Check | Weight | Status | Earned |', '|-------|--------|--------|--------|', boardRows, '', `TOTAL: ${total}/100`, '',
  '## STEPS', '', `- baseline: ec=${results.baseline.ec}`, `- life1: ec=${results.life1.ec}`,
  `- life2: ec=${results.life2.ec}`, `- policy: ec=${results.policy.ec}`, `- x2_identical: ${x2Identical}`, '',
  '## NEXT_ACTION', doctorStatus === 'PASS' ? 'npm run -s ops:doctor' : 'npm run -s verify:fast',
].join('\n'));

console.log('');
console.log(`[${doctorStatus}] ops:doctor — ${doctorReason} — SCORE ${total}/100`);
console.log(`  EVIDENCE: ${path.relative(ROOT, EPOCH_DIR)}`);
process.exit(doctorStatus === 'PASS' ? 0 : 1);
