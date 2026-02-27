/**
 * regression_live03_readiness_gate.mjs — RG_LIVE03
 *
 * Verifies deterministic decision mapping for all microlive gate conditions:
 *   - NEEDS_DATA when closed_n < MIN_TRADES
 *   - KILL_SWITCH when profit_factor < threshold
 *   - KILL_SWITCH when max_drawdown > threshold
 *   - KILL_SWITCH when avg_slippage_cost > threshold
 *   - PROCEED when all conditions pass
 *   - Decision mapping is stable (same inputs → same verdict, run twice)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const ML_SCRIPT = path.join(ROOT, 'scripts/edge/edge_microlive_00_scaffold.mjs');
const UNLOCK_FILE = path.join(ROOT, 'artifacts/incoming/MICROLIVE_UNLOCK');
const PAPER_LOCK = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');
const OUT_DIR = path.join(ROOT, 'artifacts/outgoing');
const DECISION_PATH = path.join(OUT_DIR, 'microlive_decision.json');

fs.mkdirSync(path.dirname(UNLOCK_FILE), { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const fails = [];

const BASE_LOCK = {
  schema_version: 'paper_sim.v2',
  total_pnl_net: 300, total_pnl_gross: 400, total_fee_cost: 100,
  win_rate: 0.65, profit_factor: 2.5, max_drawdown: 200,
  avg_slippage_cost: 15, wins_n: 13, losses_n: 7,
  closed_n: 20, decisions_n: 22,
};

function withState(lockData, unlockContent, fn) {
  const hadLock = fs.existsSync(PAPER_LOCK);
  const origLock = hadLock ? fs.readFileSync(PAPER_LOCK, 'utf8') : null;
  const hadUnlock = fs.existsSync(UNLOCK_FILE);
  const origUnlock = hadUnlock ? fs.readFileSync(UNLOCK_FILE, 'utf8') : null;
  try {
    if (lockData !== null) fs.writeFileSync(PAPER_LOCK, JSON.stringify(lockData, null, 2) + '\n');
    if (unlockContent !== null) fs.writeFileSync(UNLOCK_FILE, unlockContent);
    else if (fs.existsSync(UNLOCK_FILE)) fs.unlinkSync(UNLOCK_FILE);
    return fn();
  } finally {
    if (hadLock) fs.writeFileSync(PAPER_LOCK, origLock);
    else if (fs.existsSync(PAPER_LOCK)) fs.unlinkSync(PAPER_LOCK);
    if (hadUnlock) fs.writeFileSync(UNLOCK_FILE, origUnlock);
    else if (fs.existsSync(UNLOCK_FILE)) fs.unlinkSync(UNLOCK_FILE);
  }
}

function runML() {
  return spawnSync(process.execPath, [ML_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
}

// T1: profit_factor < 0.5 → KILL
const t1 = withState({ ...BASE_LOCK, profit_factor: 0.3 }, 'MICROLIVE: UNLOCKED', runML);
if (t1.status !== 1) fails.push(`T1_PF_KILL: expected exit 1, got ${t1.status}`);
if (!t1.stderr.includes('profit_factor')) fails.push(`T1_PF_REASON: profit_factor not in stderr`);

// T2: max_drawdown > 1000 → KILL
const t2 = withState({ ...BASE_LOCK, max_drawdown: 1500 }, 'MICROLIVE: UNLOCKED', runML);
if (t2.status !== 1) fails.push(`T2_DD_KILL: expected exit 1, got ${t2.status}`);
if (!t2.stderr.includes('max_drawdown')) fails.push(`T2_DD_REASON: max_drawdown not in stderr`);

// T3: avg_slippage_cost > 100 → KILL (E2)
const t3 = withState({ ...BASE_LOCK, avg_slippage_cost: 150 }, 'MICROLIVE: UNLOCKED', runML);
if (t3.status !== 1) fails.push(`T3_SLIPPAGE_KILL: expected exit 1, got ${t3.status}`);
if (!t3.stderr.includes('avg_slippage_cost')) fails.push(`T3_SLIPPAGE_REASON: avg_slippage_cost not in stderr`);

// T4: All thresholds good → PROCEED
const t4 = withState(BASE_LOCK, 'MICROLIVE: UNLOCKED', runML);
if (t4.status !== 0) fails.push(`T4_PROCEED: expected exit 0, got ${t4.status} err=${t4.stderr.slice(0, 100)}`);

// T5: Stability — same inputs × 2 → same verdict
const t5a = withState(BASE_LOCK, 'MICROLIVE: UNLOCKED', () => {
  const r = runML();
  return fs.existsSync(DECISION_PATH) ? JSON.parse(fs.readFileSync(DECISION_PATH, 'utf8')).verdict : null;
});
const t5b = withState(BASE_LOCK, 'MICROLIVE: UNLOCKED', () => {
  const r = runML();
  return fs.existsSync(DECISION_PATH) ? JSON.parse(fs.readFileSync(DECISION_PATH, 'utf8')).verdict : null;
});
if (t5a !== t5b) fails.push(`T5_STABILITY: verdict(run1)=${t5a} != verdict(run2)=${t5b}`);
if (t5a !== 'PROCEED') fails.push(`T5_VERDICT: expected PROCEED, got ${t5a}`);

// T6: NEEDS_DATA → exit 2 (closed_n=2 < 3)
const t6 = withState({ ...BASE_LOCK, closed_n: 2 }, 'MICROLIVE: UNLOCKED', runML);
if (t6.status !== 2) fails.push(`T6_NEEDS_DATA: expected exit 2, got ${t6.status}`);

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_LIVE03';

writeMd(path.join(EXEC, 'REGRESSION_LIVE03_READINESS_GATE.md'),
  `# REGRESSION_LIVE03_READINESS_GATE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:live03-readiness-gate\n\n## Tests\n\n- T1 (pf<0.5 → KILL): exit=${t1.status}\n- T2 (maxDD>1000 → KILL): exit=${t2.status}\n- T3 (slippage>100 → KILL): exit=${t3.status}\n- T4 (all ok → PROCEED): exit=${t4.status}\n- T5 (stability x2): verdict_a=${t5a} verdict_b=${t5b}\n- T6 (closed_n<3 → NEEDS_DATA): exit=${t6.status}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_live03_readiness_gate.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  tests: { t1: t1.status, t2: t2.status, t3: t3.status, t4: t4.status, t5_stable: t5a === t5b, t6: t6.status },
  fails,
});

console.log(`[${status}] regression_live03_readiness_gate — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
