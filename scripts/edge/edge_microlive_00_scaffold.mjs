/**
 * edge_microlive_00_scaffold.mjs — Microlive Scaffold (C1+C2)
 *
 * Must-fail by default. Requires explicit unlock contract:
 *   artifacts/incoming/MICROLIVE_UNLOCK  containing token "MICROLIVE: UNLOCKED"
 *
 * When unlocked, runs a deterministic kill-switch decision engine:
 *   - Reads paper_sim.lock.json for aggregated metrics
 *   - Evaluates kill-switch conditions (configurable thresholds)
 *   - Outputs decision: PROCEED | KILL_SWITCH | NEEDS_DATA
 *
 * Kill-switch conditions (any triggers KILL):
 *   - total_pnl < KILL_PNL_FLOOR  (default: -500)
 *   - win_rate < KILL_WIN_RATE     (default: 0.30 when closed_n >= MIN_TRADES)
 *   - closed_n < MIN_TRADES        → NEEDS_DATA (not enough evidence)
 *
 * Outputs:
 *   artifacts/outgoing/microlive_decision.json — kill-switch verdict
 *
 * Exit codes:
 *   0 — PROCEED
 *   1 — KILL_SWITCH (metrics failed threshold)
 *   2 — NEEDS_DATA (not enough closed trades) or NOT_UNLOCKED
 *
 * Constraints:
 *   - TREASURE_NET_KILL=1 required
 *   - All thresholds compile-time constants (no config file reads for safety)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UNLOCK_FILE = path.join(ROOT, 'artifacts/incoming/MICROLIVE_UNLOCK');
const PAPER_LOCK = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');
const OUT_DIR = path.join(ROOT, 'artifacts/outgoing');
const DECISION_PATH = path.join(OUT_DIR, 'microlive_decision.json');

// Kill-switch thresholds — compile-time constants
const KILL_PNL_FLOOR = -500;
const KILL_WIN_RATE = 0.30;
const MIN_TRADES = 3;

const fail = (c, m) => { console.error(`[FAIL] ${c} ${m}`); process.exit(1); };

// G1: offline-authoritative guard
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_ML01', 'TREASURE_NET_KILL must be 1');

// C1: must-fail by default — require explicit unlock
function checkUnlock() {
  if (!fs.existsSync(UNLOCK_FILE)) return false;
  const content = fs.readFileSync(UNLOCK_FILE, 'utf8').trim();
  return content === 'MICROLIVE: UNLOCKED';
}

if (!checkUnlock()) {
  console.error('[NOT_UNLOCKED] ML_LOCK01 Microlive requires artifacts/incoming/MICROLIVE_UNLOCK with token "MICROLIVE: UNLOCKED"');
  process.exit(2);
}

// Load paper sim results
if (!fs.existsSync(PAPER_LOCK)) {
  console.log('[NEEDS_DATA] ML_RDY01 paper_sim.lock.json missing — run edge:paper:sim first');
  process.exit(2);
}

const simLock = JSON.parse(fs.readFileSync(PAPER_LOCK, 'utf8'));
const { total_pnl, win_rate, closed_n, decisions_n } = simLock;

// C2: deterministic kill-switch evaluation
const killReasons = [];

if (!Number.isFinite(closed_n) || closed_n < MIN_TRADES) {
  // Not enough data — NEEDS_DATA
  const decision = {
    schema_version: 'microlive_decision.v1',
    verdict: 'NEEDS_DATA',
    reason: `closed_n=${closed_n} < MIN_TRADES=${MIN_TRADES}`,
    total_pnl, win_rate, closed_n, decisions_n,
    thresholds: { KILL_PNL_FLOOR, KILL_WIN_RATE, MIN_TRADES },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(DECISION_PATH, JSON.stringify(decision, null, 2) + '\n');
  console.log(`[NEEDS_DATA] ML_RDY01 closed_n=${closed_n} < MIN_TRADES=${MIN_TRADES} — collect more data`);
  process.exit(2);
}

if (Number.isFinite(total_pnl) && total_pnl < KILL_PNL_FLOOR)
  killReasons.push(`total_pnl=${total_pnl} < floor=${KILL_PNL_FLOOR}`);
if (Number.isFinite(win_rate) && win_rate < KILL_WIN_RATE)
  killReasons.push(`win_rate=${win_rate} < threshold=${KILL_WIN_RATE}`);

const verdict = killReasons.length > 0 ? 'KILL_SWITCH' : 'PROCEED';

const decision = {
  schema_version: 'microlive_decision.v1',
  verdict,
  kill_reasons: killReasons,
  total_pnl, win_rate, closed_n, decisions_n,
  thresholds: { KILL_PNL_FLOOR, KILL_WIN_RATE, MIN_TRADES },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(DECISION_PATH, JSON.stringify(decision, null, 2) + '\n');

if (verdict === 'KILL_SWITCH') {
  console.error(`[KILL_SWITCH] ML_KILL01 ${killReasons.join('; ')}`);
  process.exit(1);
}

console.log(`[PROCEED] edge_microlive_00_scaffold — pnl=${total_pnl} win_rate=${win_rate} closed=${closed_n}/${decisions_n}`);
process.exit(0);
