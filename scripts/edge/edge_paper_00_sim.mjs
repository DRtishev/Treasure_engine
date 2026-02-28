/**
 * edge_paper_00_sim.mjs — Deterministic Paper Sim v2
 *
 * P2.1 realism additions over v1:
 *   C1) Fee + slippage model (per-side, deterministic):
 *         fee_rate   default 0.0006 (taker fee per side)
 *         slippage_bps default 5bps per side
 *   C2) Position constraints:
 *         max 1 open position per symbol at a time
 *         cooldown_bars=1 after exit before next entry
 *   C3) Metrics pack:
 *         profit_factor, max_drawdown, expectancy,
 *         trades_n, win_rate, avg_slippage_cost, total_fee_cost
 *
 * CLI:
 *   TREASURE_NET_KILL=1 node scripts/edge/edge_paper_00_sim.mjs \
 *     [--price-provider offline_fixture] [--price-run-id RG_PRICE01_FIXTURE] \
 *     [--fee-rate 0.0006] [--slippage-bps 5] [--cooldown-bars 1]
 *
 * Inputs:
 *   artifacts/outgoing/features_liq.jsonl
 *   artifacts/incoming/price_bars/<provider>/<run_id>/raw.jsonl
 * Outputs:
 *   artifacts/outgoing/paper_sim.jsonl      — per-decision rows (canonical)
 *   artifacts/outgoing/paper_sim.lock.json  — summary + sha256 + metrics
 *
 * Constraints: TREASURE_NET_KILL=1; no Date.now(); no Math.random()
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCHEMA_VERSION = 'paper_sim.v2';
const ROOT = process.cwd();

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const fail = (c, m) => { console.error(`[FAIL] ${c} ${m}`); process.exit(1); };

function parseArgs(argv) {
  const args = {
    priceProvider: 'offline_fixture',
    priceRunId: '',
    feeRate: 0.0006,
    slippageBps: 5,
    cooldownBars: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--price-provider') args.priceProvider = argv[++i] || args.priceProvider;
    else if (a === '--price-run-id') args.priceRunId = argv[++i] || '';
    else if (a === '--fee-rate') args.feeRate = Number(argv[++i] ?? args.feeRate);
    else if (a === '--slippage-bps') args.slippageBps = Number(argv[++i] ?? args.slippageBps);
    else if (a === '--cooldown-bars') args.cooldownBars = Number(argv[++i] ?? args.cooldownBars);
  }
  return args;
}

// ── Guards ────────────────────────────────────────────────────────────────────
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_PAPER01', 'TREASURE_NET_KILL must be 1');

const args = parseArgs(process.argv.slice(2));
const { feeRate, slippageBps, cooldownBars } = args;
const slippageFrac = slippageBps / 10000;

// ── Load signals ──────────────────────────────────────────────────────────────
const signalsPath = path.join(ROOT, 'artifacts/outgoing/features_liq.jsonl');
if (!fs.existsSync(signalsPath)) {
  console.log('[NEEDS_DATA] PAPER_RDY01 features_liq.jsonl missing — run edge:liq:signals first');
  process.exit(2);
}
const signals = fs.readFileSync(signalsPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
if (signals.length === 0) fail('PAPER_RDY01', 'features_liq.jsonl is empty');

// ── Load price bars ───────────────────────────────────────────────────────────
const priceBaseDir = path.join(ROOT, 'artifacts/incoming/price_bars', args.priceProvider);
if (!fs.existsSync(priceBaseDir)) {
  console.log(`[NEEDS_DATA] PAPER_RDY01 price_bars dir missing for ${args.priceProvider}`);
  process.exit(2);
}

const priceRunId = args.priceRunId || fs.readdirSync(priceBaseDir, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name)
  .sort((a, b) => a.localeCompare(b)).at(-1) || '';
if (!priceRunId) fail('PAPER_RDY01', `no price bar runs found for ${args.priceProvider}`);

const priceRawPath = path.join(priceBaseDir, priceRunId, 'raw.jsonl');
const priceLockPath = path.join(priceBaseDir, priceRunId, 'lock.json');
if (!fs.existsSync(priceRawPath) || !fs.existsSync(priceLockPath))
  fail('PAPER_RDY01', `missing raw/lock for price run ${priceRunId}`);

const priceRows = fs.readFileSync(priceRawPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const priceLock = JSON.parse(fs.readFileSync(priceLockPath, 'utf8'));

// ── Build lookup: symbol → sorted bars by ts ──────────────────────────────────
const barsBySymbol = new Map();
for (const row of priceRows) {
  if (!barsBySymbol.has(row.symbol)) barsBySymbol.set(row.symbol, []);
  barsBySymbol.get(row.symbol).push(row);
}
for (const bars of barsBySymbol.values()) bars.sort((a, b) => a.bar_ts_ms - b.bar_ts_ms);

// ── Group + sort signals per symbol ──────────────────────────────────────────
const signalsBySymbol = new Map();
for (const sig of signals) {
  if (!signalsBySymbol.has(sig.symbol)) signalsBySymbol.set(sig.symbol, []);
  signalsBySymbol.get(sig.symbol).push(sig);
}
for (const sigs of signalsBySymbol.values()) sigs.sort((a, b) => a.bar_ts_ms - b.bar_ts_ms);

// ── Simulate ──────────────────────────────────────────────────────────────────
const decisions = [];

for (const [symbol, sigs] of [...signalsBySymbol.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const bars = barsBySymbol.get(symbol) || [];
  const barByTs = new Map(bars.map((b) => [b.bar_ts_ms, b]));

  // C2: position state per symbol
  let in_position = false;
  let last_exit_bar_ts = -Infinity;
  const windowMs = signals.find((s) => s.symbol === symbol)?.window_ms ?? 60000;

  for (const sig of sigs) {
    const entryBar = barByTs.get(sig.bar_ts_ms);
    if (!entryBar) continue;

    // Skip NEUTRAL
    let direction = 0;
    if (sig.regime_flag === 'BEAR_LIQ' || sig.regime_flag === 'BEAR_LIQ_BURST') direction = -1;
    else if (sig.regime_flag === 'BULL_LIQ' || sig.regime_flag === 'BULL_LIQ_BURST') direction = 1;
    else continue;

    // C2: enforce max-1-position and cooldown
    if (in_position) continue;
    if (sig.bar_ts_ms < last_exit_bar_ts + cooldownBars * windowMs) continue;

    const exitBar = bars.find((b) => b.bar_ts_ms > sig.bar_ts_ms) || null;

    const entry_raw = entryBar.close;
    const exit_raw = exitBar ? exitBar.close : null;

    // C1: slippage — worsen fill for buyer/seller
    // LONG:  buy at ask (entry_raw*(1+slippage)), sell at bid (exit_raw*(1-slippage))
    // SHORT: sell at bid (entry_raw*(1-slippage)), buy at ask (exit_raw*(1+slippage))
    const entry_adj = direction === 1
      ? r6(entry_raw * (1 + slippageFrac))
      : r6(entry_raw * (1 - slippageFrac));

    const exit_adj = exit_raw === null ? null
      : direction === 1
        ? r6(exit_raw * (1 - slippageFrac))
        : r6(exit_raw * (1 + slippageFrac));

    // C1: fee per side (applied to notional)
    const fee_entry = r6(entry_adj * feeRate);
    const fee_exit = exit_adj !== null ? r6(exit_adj * feeRate) : null;
    const fee_cost = fee_exit !== null ? r6(fee_entry + fee_exit) : null;

    // slippage cost (absolute, per trade)
    const slippage_cost = exit_raw !== null
      ? r6(Math.abs(entry_adj - entry_raw) + Math.abs(exit_adj - exit_raw))
      : null;

    const pnl_gross = exit_adj !== null
      ? r6((exit_adj - entry_adj) * direction)
      : null;

    const pnl_net = pnl_gross !== null && fee_cost !== null
      ? r6(pnl_gross - fee_cost)
      : null;

    const closed = exit_adj !== null;
    if (closed) {
      in_position = false;
      last_exit_bar_ts = exitBar.bar_ts_ms;
    } else {
      in_position = true; // open position — mark occupied
    }

    decisions.push({
      schema_version: SCHEMA_VERSION,
      symbol,
      bar_ts_ms: sig.bar_ts_ms,
      regime_flag: sig.regime_flag,
      liq_pressure: sig.liq_pressure,
      burst_score: sig.burst_score,
      direction: direction === 1 ? 'LONG' : 'SHORT',
      entry_price_raw: entry_raw,
      entry_price_adj: entry_adj,
      exit_bar_ts_ms: exitBar ? exitBar.bar_ts_ms : null,
      exit_price_raw: exit_raw,
      exit_price_adj: exit_adj,
      fee_cost,
      slippage_cost,
      pnl_gross,
      pnl_net,
      closed,
    });
  }
}

// Sort deterministically
decisions.sort((a, b) => a.symbol !== b.symbol
  ? a.symbol.localeCompare(b.symbol)
  : a.bar_ts_ms - b.bar_ts_ms);

// ── C3: Metrics pack ──────────────────────────────────────────────────────────
const closed_decisions = decisions.filter((d) => d.closed);
const trades_n = closed_decisions.length;

const total_pnl_net = r6(closed_decisions.reduce((s, d) => s + d.pnl_net, 0));
const total_pnl_gross = r6(closed_decisions.reduce((s, d) => s + d.pnl_gross, 0));
const total_fee_cost = r6(closed_decisions.reduce((s, d) => s + d.fee_cost, 0));
const avg_slippage_cost = trades_n > 0
  ? r6(closed_decisions.reduce((s, d) => s + d.slippage_cost, 0) / trades_n)
  : null;

const wins_n = closed_decisions.filter((d) => d.pnl_net > 0).length;
const losses_n = closed_decisions.filter((d) => d.pnl_net < 0).length;
const win_rate = trades_n > 0 ? r4(wins_n / trades_n) : null;

const gross_wins = r6(closed_decisions.filter((d) => d.pnl_net > 0).reduce((s, d) => s + d.pnl_net, 0));
const gross_losses_abs = r6(Math.abs(closed_decisions.filter((d) => d.pnl_net < 0).reduce((s, d) => s + d.pnl_net, 0)));
const profit_factor = gross_losses_abs > 0 ? r4(gross_wins / gross_losses_abs) : null;

const expectancy = trades_n > 0 ? r6(total_pnl_net / trades_n) : null;

// Max drawdown (equity curve, chronological)
const sortedClosed = [...closed_decisions].sort((a, b) =>
  a.bar_ts_ms !== b.bar_ts_ms ? a.bar_ts_ms - b.bar_ts_ms : a.symbol.localeCompare(b.symbol));
let equity = 0, peak = 0, max_drawdown = 0;
for (const d of sortedClosed) {
  equity += d.pnl_net;
  if (equity > peak) peak = equity;
  const dd = peak - equity;
  if (dd > max_drawdown) max_drawdown = dd;
}
max_drawdown = r6(max_drawdown);

// ── Write outputs ─────────────────────────────────────────────────────────────
const outDir = path.join(ROOT, 'artifacts/outgoing');
fs.mkdirSync(outDir, { recursive: true });

const jsonlLines = decisions.map((d) => JSON.stringify(canon(d)));
const jsonlContent = jsonlLines.join('\n') + '\n';
const jsonlSha = sha(jsonlContent);

const simLock = {
  schema_version: SCHEMA_VERSION,
  params: { fee_rate: feeRate, slippage_bps: slippageBps, cooldown_bars: cooldownBars },
  signals_source: 'features_liq.jsonl',
  price_provider: args.priceProvider,
  price_run_id: priceRunId,
  price_schema_version: priceLock.schema_version,
  decisions_n: decisions.length,
  closed_n: trades_n,
  wins_n,
  losses_n,
  total_pnl_gross,
  total_pnl_net,
  total_fee_cost,
  avg_slippage_cost,
  win_rate,
  profit_factor,
  expectancy,
  max_drawdown,
  paper_sim_sha256: jsonlSha,
};

fs.writeFileSync(path.join(outDir, 'paper_sim.jsonl'), jsonlContent);
fs.writeFileSync(path.join(outDir, 'paper_sim.lock.json'), JSON.stringify(simLock, null, 2) + '\n');

console.log(`[PASS] edge_paper_00_sim v2 — decisions=${decisions.length} closed=${trades_n} pnl_net=${total_pnl_net} pf=${profit_factor} wr=${win_rate} maxDD=${max_drawdown}`);
console.log(`  fee_rate=${feeRate} slippage_bps=${slippageBps} cooldown_bars=${cooldownBars}`);
console.log(`  avg_slippage_cost=${avg_slippage_cost} total_fee_cost=${total_fee_cost}`);
console.log(`  sha256: ${jsonlSha.slice(0, 16)}...`);
