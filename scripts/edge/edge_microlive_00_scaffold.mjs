/**
 * edge_microlive_00_scaffold.mjs — Microlive Scaffold v2 (E1+E2)
 *
 * Must-fail by default. Requires explicit unlock contract:
 *   artifacts/incoming/MICROLIVE_UNLOCK  containing token "MICROLIVE: UNLOCKED"
 *
 * Reads paper_sim.lock.json (v2) and evaluates:
 *   E1) Readiness gate:
 *         closed_n < MIN_TRADES            → NEEDS_DATA
 *         profit_factor < KILL_PF_FLOOR    → KILL_SWITCH
 *         max_drawdown > KILL_MAX_DD       → KILL_SWITCH
 *         total_pnl_net < KILL_PNL_FLOOR  → KILL_SWITCH
 *         win_rate < KILL_WIN_RATE         → KILL_SWITCH
 *   E2) Slippage/latency triggers:
 *         avg_slippage_cost > KILL_SLIPPAGE_COST → KILL_SWITCH
 *
 * Outputs:
 *   artifacts/outgoing/microlive_decision.json — stable telemetry + verdict
 *
 * Exit codes:
 *   0 — PROCEED
 *   1 — KILL_SWITCH
 *   2 — NEEDS_DATA or NOT_UNLOCKED
 *
 * Constraints:
 *   - TREASURE_NET_KILL=1 required
 *   - All thresholds compile-time constants (no config file reads for safety)
 *   - Fully deterministic: no Date.now(), no Math.random()
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UNLOCK_FILE = path.join(ROOT, 'artifacts/incoming/MICROLIVE_UNLOCK');
const PAPER_LOCK = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');
const OUT_DIR = path.join(ROOT, 'artifacts/outgoing');
const DECISION_PATH = path.join(OUT_DIR, 'microlive_decision.json');

// E1+E2: kill-switch thresholds — compile-time constants
const KILL_PNL_FLOOR = -500;          // E1: net PnL floor
const KILL_WIN_RATE = 0.30;           // E1: minimum win rate (>= MIN_TRADES required)
const KILL_PF_FLOOR = 0.5;            // E1: minimum profit factor
const KILL_MAX_DD = 1000;             // E1: maximum drawdown allowed
const KILL_SLIPPAGE_COST = 100;       // E2: maximum avg slippage cost per trade
const MIN_TRADES = 3;                 // E1: minimum closed trades for evidence

const fail = (c, m) => { console.error(`[FAIL] ${c} ${m}`); process.exit(1); };

// G1: offline-authoritative guard
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_ML01', 'TREASURE_NET_KILL must be 1');

// C1: must-fail by default
function checkUnlock() {
  if (!fs.existsSync(UNLOCK_FILE)) return false;
  return fs.readFileSync(UNLOCK_FILE, 'utf8').trim() === 'MICROLIVE: UNLOCKED';
}

if (!checkUnlock()) {
  console.error('[NOT_UNLOCKED] ML_LOCK01 Microlive requires artifacts/incoming/MICROLIVE_UNLOCK with token "MICROLIVE: UNLOCKED"');
  process.exit(2);
}

// Load paper sim v2 results
if (!fs.existsSync(PAPER_LOCK)) {
  console.log('[NEEDS_DATA] ML_RDY01 paper_sim.lock.json missing — run edge:paper:sim first');
  process.exit(2);
}

const simLock = JSON.parse(fs.readFileSync(PAPER_LOCK, 'utf8'));
const {
  total_pnl_net, win_rate, closed_n, decisions_n,
  profit_factor, max_drawdown, avg_slippage_cost,
  total_fee_cost, total_pnl_gross, wins_n, losses_n,
} = simLock;

const thresholds = {
  KILL_PNL_FLOOR, KILL_WIN_RATE, KILL_PF_FLOOR,
  KILL_MAX_DD, KILL_SLIPPAGE_COST, MIN_TRADES,
};

// E1: readiness gate — insufficient data
if (!Number.isFinite(closed_n) || closed_n < MIN_TRADES) {
  const decision = {
    schema_version: 'microlive_decision.v2',
    verdict: 'NEEDS_DATA',
    reason: `closed_n=${closed_n} < MIN_TRADES=${MIN_TRADES}`,
    kill_reasons: [],
    telemetry: { total_pnl_net, win_rate, closed_n, decisions_n, profit_factor, max_drawdown, avg_slippage_cost, total_fee_cost, wins_n, losses_n },
    thresholds,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(DECISION_PATH, JSON.stringify(decision, null, 2) + '\n');
  console.log(`[NEEDS_DATA] ML_RDY01 closed_n=${closed_n} < MIN_TRADES=${MIN_TRADES}`);
  process.exit(2);
}

// E1+E2: kill-switch evaluation
const killReasons = [];

if (Number.isFinite(total_pnl_net) && total_pnl_net < KILL_PNL_FLOOR)
  killReasons.push(`total_pnl_net=${total_pnl_net} < floor=${KILL_PNL_FLOOR}`);
if (Number.isFinite(win_rate) && win_rate < KILL_WIN_RATE)
  killReasons.push(`win_rate=${win_rate} < threshold=${KILL_WIN_RATE}`);
if (profit_factor !== null && Number.isFinite(profit_factor) && profit_factor < KILL_PF_FLOOR)
  killReasons.push(`profit_factor=${profit_factor} < floor=${KILL_PF_FLOOR}`);
if (Number.isFinite(max_drawdown) && max_drawdown > KILL_MAX_DD)
  killReasons.push(`max_drawdown=${max_drawdown} > limit=${KILL_MAX_DD}`);
if (avg_slippage_cost !== null && Number.isFinite(avg_slippage_cost) && avg_slippage_cost > KILL_SLIPPAGE_COST)
  killReasons.push(`avg_slippage_cost=${avg_slippage_cost} > limit=${KILL_SLIPPAGE_COST}`);

const verdict = killReasons.length > 0 ? 'KILL_SWITCH' : 'PROCEED';

const decision = {
  schema_version: 'microlive_decision.v2',
  verdict,
  kill_reasons: killReasons,
  telemetry: { total_pnl_net, win_rate, closed_n, decisions_n, profit_factor, max_drawdown, avg_slippage_cost, total_fee_cost, wins_n, losses_n },
  thresholds,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(DECISION_PATH, JSON.stringify(decision, null, 2) + '\n');

if (verdict === 'KILL_SWITCH') {
  console.error(`[KILL_SWITCH] ML_KILL01 ${killReasons.join('; ')}`);
  process.exit(1);
}

console.log(`[PROCEED] edge_microlive_00_scaffold v2 — pnl_net=${total_pnl_net} pf=${profit_factor} wr=${win_rate} maxDD=${max_drawdown} closed=${closed_n}/${decisions_n}`);
process.exit(0);
