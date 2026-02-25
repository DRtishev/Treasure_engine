import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const TARGET = path.join(ROOT, 'scripts/verify/regression_victory_precheck_clean_tree_contract.mjs');
const TARGET_REL = 'scripts/verify/regression_victory_precheck_clean_tree_contract.mjs';

fs.mkdirSync(MANUAL, { recursive: true });

function readPrecheckJson() {
  return JSON.parse(fs.readFileSync(path.join(MANUAL, 'victory_precheck.json'), 'utf8'));
}

function runSeal() {
  return runBounded('npm run -s epoch:victory:seal', {
    cwd: ROOT,
    env: { ...process.env, TREASURE_I_UNDERSTAND_RESTORE: '1' },
    timeoutMs: 180000,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function cleanupAll() {
  runBounded(`git restore --staged --worktree -- '${TARGET_REL}'`, { cwd: ROOT, env: process.env, timeoutMs: 10000 });
  fs.rmSync(path.join(ROOT, '.tmp_drv'), { recursive: true, force: true });
  runBounded('git clean -fd -- .tmp_drv', { cwd: ROOT, env: process.env, timeoutMs: 10000 });
  runBounded('git restore reports/evidence/EXECUTOR/VICTORY_PRECHECK.md reports/evidence/EXECUTOR/VICTORY_SEAL.md reports/evidence/EXECUTOR/gates/manual/victory_precheck.json reports/evidence/EXECUTOR/gates/manual/victory_seal.json', { cwd: ROOT, env: process.env, timeoutMs: 10000 });
}

const stashPush = runBounded('git stash push -u -m "rg-drv01-temp"', { cwd: ROOT, env: process.env, timeoutMs: 15000, maxBuffer: 16 * 1024 * 1024 });
const stashActive = stashPush.ec === 0 && !/No local changes to save/i.test(String(stashPush.stdout + stashPush.stderr));

cleanupAll();

const scenarios = [];

// A) untracked only -> LOW
fs.mkdirSync(path.join(ROOT, '.tmp_drv'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.tmp_drv', 'u_only.tmp'), 'u\n');
let r = runSeal();
let j = readPrecheckJson();
scenarios.push({ id: 'untracked_only', expected: 'LOW', actual: j.drift_severity, reason_code: j.reason_code, ec: r.ec });
cleanupAll();

// B) staged only -> MEDIUM
const original = fs.readFileSync(TARGET, 'utf8');
fs.writeFileSync(TARGET, `${original}\n// RG_DRV01 staged scenario\n`);
runBounded(`git add -- '${TARGET_REL}'`, { cwd: ROOT, env: process.env, timeoutMs: 10000 });
r = runSeal();
j = readPrecheckJson();
scenarios.push({ id: 'staged_only', expected: 'MEDIUM', actual: j.drift_severity, reason_code: j.reason_code, ec: r.ec });
cleanupAll();

// C) tracked worktree diff -> HIGH
const orig2 = fs.readFileSync(TARGET, 'utf8');
fs.writeFileSync(TARGET, `${orig2}\n// RG_DRV01 tracked scenario\n`);
r = runSeal();
j = readPrecheckJson();
scenarios.push({ id: 'tracked_only', expected: 'HIGH', actual: j.drift_severity, reason_code: j.reason_code, ec: r.ec });
cleanupAll();

if (stashActive) {
  runBounded('git stash pop', { cwd: ROOT, env: process.env, timeoutMs: 15000, maxBuffer: 16 * 1024 * 1024 });
}

const checks = {
  all_blocked_snap01: scenarios.every((s) => s.reason_code === 'SNAP01' && s.ec === 1),
  untracked_only_low: scenarios.find((s) => s.id === 'untracked_only')?.actual === 'LOW',
  staged_only_medium: scenarios.find((s) => s.id === 'staged_only')?.actual === 'MEDIUM',
  tracked_only_high: scenarios.find((s) => s.id === 'tracked_only')?.actual === 'HIGH',
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_DRV01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_DRIFT_SEVERITY_CLASSIFICATION.md'), `# REGRESSION_DRIFT_SEVERITY_CLASSIFICATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n## SCENARIOS\n${scenarios.map((s) => `- ${s.id}: expected=${s.expected} actual=${s.actual} reason_code=${s.reason_code} ec=${s.ec}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_drift_severity_classification.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  scenarios,
  stash_isolation: stashActive,
});

console.log(`[${status}] regression_drift_severity_classification — ${reason_code}`);
process.exit(ok ? 0 : 1);
