/**
 * regression_microlive02_kill_switch.mjs — RG_ML02
 *
 * Verifies C2: deterministic kill-switch decisions.
 * Tests both KILL_SWITCH and PROCEED paths by manipulating paper_sim.lock.json.
 *
 * Uses a temp paper_sim.lock.json with controlled metrics to test thresholds.
 * Restores the original after each test.
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

fs.mkdirSync(path.dirname(UNLOCK_FILE), { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const fails = [];

function withLock(metrics, fn) {
  const hadFile = fs.existsSync(PAPER_LOCK);
  const orig = hadFile ? fs.readFileSync(PAPER_LOCK, 'utf8') : null;
  const lock = {
    schema_version: 'paper_sim.v1',
    signals_source: 'features_liq.jsonl',
    price_provider: 'offline_fixture',
    price_run_id: 'RG_PRICE01_FIXTURE',
    price_schema_version: 'price_bars.offline_fixture.v1',
    ...metrics,
  };
  try {
    fs.writeFileSync(PAPER_LOCK, JSON.stringify(lock, null, 2) + '\n');
    return fn();
  } finally {
    if (hadFile) fs.writeFileSync(PAPER_LOCK, orig);
    else if (fs.existsSync(PAPER_LOCK)) fs.unlinkSync(PAPER_LOCK);
  }
}

function withUnlock(content, fn) {
  const hadFile = fs.existsSync(UNLOCK_FILE);
  const orig = hadFile ? fs.readFileSync(UNLOCK_FILE, 'utf8') : null;
  try {
    fs.writeFileSync(UNLOCK_FILE, content);
    return fn();
  } finally {
    if (hadFile) fs.writeFileSync(UNLOCK_FILE, orig);
    else if (fs.existsSync(UNLOCK_FILE)) fs.unlinkSync(UNLOCK_FILE);
  }
}

function runSim() {
  return spawnSync(process.execPath, [ML_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
}

// v2 mock lock uses total_pnl_net (not total_pnl)
const GOOD_LOCK = {
  schema_version: 'paper_sim.v2',
  total_pnl_net: 200, total_pnl_gross: 250, total_fee_cost: 50,
  win_rate: 0.60, profit_factor: 2.0, max_drawdown: 80,
  avg_slippage_cost: 10, wins_n: 6, losses_n: 4,
  closed_n: 10, decisions_n: 10,
};

// T1: PNL_NET below floor → KILL_SWITCH (exit 1)
const t1 = withUnlock('MICROLIVE: UNLOCKED', () =>
  withLock({ ...GOOD_LOCK, total_pnl_net: -600 }, runSim)
);
if (t1.status !== 1)
  fails.push(`T1_KILL_PNL: expected exit 1 (KILL_SWITCH), got ${t1.status}`);
if (!t1.stderr.includes('KILL_SWITCH'))
  fails.push(`T1_REASON: KILL_SWITCH not in stderr="${t1.stderr.slice(0, 150)}"`);

// T2: Win rate below threshold → KILL_SWITCH (exit 1)
const t2 = withUnlock('MICROLIVE: UNLOCKED', () =>
  withLock({ ...GOOD_LOCK, win_rate: 0.20 }, runSim)
);
if (t2.status !== 1)
  fails.push(`T2_KILL_WIN_RATE: expected exit 1 (KILL_SWITCH), got ${t2.status}`);

// T3: Good metrics → PROCEED (exit 0)
const t3 = withUnlock('MICROLIVE: UNLOCKED', () =>
  withLock(GOOD_LOCK, runSim)
);
if (t3.status !== 0)
  fails.push(`T3_PROCEED: expected exit 0, got ${t3.status} stderr="${t3.stderr.slice(0, 150)}"`);
if (!t3.stdout.includes('PROCEED'))
  fails.push(`T3_PROCEED_MSG: PROCEED not in stdout="${t3.stdout.slice(0, 150)}"`);

// T4: Fewer than MIN_TRADES closed → NEEDS_DATA (exit 2)
const t4 = withUnlock('MICROLIVE: UNLOCKED', () =>
  withLock({ ...GOOD_LOCK, closed_n: 1 }, runSim)
);
if (t4.status !== 2)
  fails.push(`T4_NEEDS_DATA: expected exit 2, got ${t4.status}`);

// T5: Verify microlive_decision.json written on PROCEED with v2 schema
withUnlock('MICROLIVE: UNLOCKED', () =>
  withLock(GOOD_LOCK, () => {
    spawnSync(process.execPath, [ML_SCRIPT],
      { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
    const decisionPath = path.join(OUT_DIR, 'microlive_decision.json');
    if (!fs.existsSync(decisionPath)) {
      fails.push('T5_DECISION_FILE: microlive_decision.json not written on PROCEED');
    } else {
      const d = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
      if (d.verdict !== 'PROCEED') fails.push(`T5_VERDICT: expected PROCEED, got ${d.verdict}`);
      if (d.schema_version !== 'microlive_decision.v2') fails.push(`T5_SCHEMA: expected microlive_decision.v2, got ${d.schema_version}`);
      if (!d.telemetry) fails.push('T5_TELEMETRY: telemetry block missing');
      if (!d.thresholds) fails.push('T5_THRESHOLDS: thresholds block missing');
    }
  })
);

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_ML02';

writeMd(path.join(EXEC, 'REGRESSION_MICROLIVE02_KILL_SWITCH.md'),
  `# REGRESSION_MICROLIVE02_KILL_SWITCH.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:microlive02-kill-switch\n\n## Tests\n\n- T1 (pnl below floor): exit=${t1.status}\n- T2 (win_rate below threshold): exit=${t2.status}\n- T3 (good metrics → PROCEED): exit=${t3.status}\n- T4 (closed_n < MIN_TRADES → NEEDS_DATA): exit=${t4.status}\n- T5 (decision file written): see fails\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_microlive02_kill_switch.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  t1: { exit: t1.status }, t2: { exit: t2.status }, t3: { exit: t3.status }, t4: { exit: t4.status }, fails,
});

console.log(`[${status}] regression_microlive02_kill_switch — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
