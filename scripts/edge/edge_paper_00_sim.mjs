/**
 * edge_paper_00_sim.mjs — Deterministic Paper Sim
 *
 * Consumes features_liq.jsonl (liq signals) + price bar fixture to produce
 * per-bar paper trading decisions and a cumulative P&L trace.
 *
 * Rules (deterministic, no random state):
 *   - If regime_flag=BEAR_LIQ → SHORT signal (sell at bar close, cover at next close)
 *   - If regime_flag=BULL_LIQ → LONG signal (buy at bar close, exit at next close)
 *   - NEUTRAL / *_BURST → FLAT (no position)
 *   - One position per symbol per bar, flat at end of last bar
 *   - P&L = (exit_close - entry_close) * direction  (direction: LONG=+1, SHORT=-1)
 *   - Slippage: 0 (paper sim, not live)
 *
 * Inputs (read from disk):
 *   artifacts/outgoing/features_liq.jsonl   — signals (must have run edge:liq:signals)
 *   artifacts/incoming/price_bars/<provider>/<run_id>/raw.jsonl — OHLCV bars
 *
 * Outputs:
 *   artifacts/outgoing/paper_sim.jsonl      — per-decision rows
 *   artifacts/outgoing/paper_sim.lock.json  — summary + sha256
 *
 * Constraints:
 *   - TREASURE_NET_KILL=1 required
 *   - Fully deterministic: no Date.now(), no Math.random()
 *
 * Usage:
 *   TREASURE_NET_KILL=1 node scripts/edge/edge_paper_00_sim.mjs \
 *     [--price-provider offline_fixture] [--price-run-id RG_PRICE01_FIXTURE]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCHEMA_VERSION = 'paper_sim.v1';
const ROOT = process.cwd();

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;
const fail = (c, m) => { console.error(`[FAIL] ${c} ${m}`); process.exit(1); };

function parseArgs(argv) {
  const args = { priceProvider: 'offline_fixture', priceRunId: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--price-provider') args.priceProvider = argv[++i] || args.priceProvider;
    else if (a === '--price-run-id') args.priceRunId = argv[++i] || '';
  }
  return args;
}

// Guards
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_PAPER01', 'TREASURE_NET_KILL must be 1');

const args = parseArgs(process.argv.slice(2));

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
  console.log(`[NEEDS_DATA] PAPER_RDY01 price_bars dir missing for ${args.priceProvider} — run price fixture first`);
  process.exit(2);
}

const priceRunId = args.priceRunId || fs.readdirSync(priceBaseDir, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name)
  .sort((a, b) => a.localeCompare(b)).at(-1) || '';
if (!priceRunId) fail('PAPER_RDY01', `no price bar runs found for ${args.priceProvider}`);

const priceRawPath = path.join(priceBaseDir, priceRunId, 'raw.jsonl');
const priceLockPath = path.join(priceBaseDir, priceRunId, 'lock.json');
if (!fs.existsSync(priceRawPath) || !fs.existsSync(priceLockPath)) {
  fail('PAPER_RDY01', `missing raw/lock for price run ${priceRunId}`);
}

const priceRows = fs.readFileSync(priceRawPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const priceLock = JSON.parse(fs.readFileSync(priceLockPath, 'utf8'));

// ── Build lookup: symbol → sorted bars ───────────────────────────────────────
const barsBySymbol = new Map();
for (const row of priceRows) {
  if (!barsBySymbol.has(row.symbol)) barsBySymbol.set(row.symbol, []);
  barsBySymbol.get(row.symbol).push(row);
}
for (const bars of barsBySymbol.values()) {
  bars.sort((a, b) => a.bar_ts_ms - b.bar_ts_ms);
}

// ── Simulate per signal ───────────────────────────────────────────────────────
// Group signals by symbol → sorted by bar_ts_ms
const signalsBySymbol = new Map();
for (const sig of signals) {
  if (!signalsBySymbol.has(sig.symbol)) signalsBySymbol.set(sig.symbol, []);
  signalsBySymbol.get(sig.symbol).push(sig);
}
for (const sigs of signalsBySymbol.values()) {
  sigs.sort((a, b) => a.bar_ts_ms - b.bar_ts_ms);
}

const decisions = [];

for (const [symbol, sigs] of [...signalsBySymbol.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const bars = barsBySymbol.get(symbol) || [];
  const barByTs = new Map(bars.map((b) => [b.bar_ts_ms, b]));

  for (let i = 0; i < sigs.length; i++) {
    const sig = sigs[i];
    const entryBar = barByTs.get(sig.bar_ts_ms);
    if (!entryBar) continue; // no matching price bar — skip

    let direction = 0;
    if (sig.regime_flag === 'BEAR_LIQ' || sig.regime_flag === 'BEAR_LIQ_BURST') direction = -1;
    else if (sig.regime_flag === 'BULL_LIQ' || sig.regime_flag === 'BULL_LIQ_BURST') direction = 1;
    else continue; // NEUTRAL — no trade

    // Find exit bar: next bar by ts for this symbol
    const exitBar = bars.find((b) => b.bar_ts_ms > sig.bar_ts_ms) || null;

    const entry_price = entryBar.close;
    const exit_price = exitBar ? exitBar.close : null;
    const pnl = exit_price !== null
      ? Math.round((exit_price - entry_price) * direction * 1e6) / 1e6
      : null; // open at end of data → unrealized

    decisions.push({
      schema_version: SCHEMA_VERSION,
      symbol,
      bar_ts_ms: sig.bar_ts_ms,
      regime_flag: sig.regime_flag,
      liq_pressure: sig.liq_pressure,
      burst_score: sig.burst_score,
      direction: direction === 1 ? 'LONG' : 'SHORT',
      entry_price,
      exit_bar_ts_ms: exitBar ? exitBar.bar_ts_ms : null,
      exit_price,
      pnl,
      closed: exit_price !== null,
    });
  }
}

// Sort decisions deterministically: symbol ASC, bar_ts_ms ASC
decisions.sort((a, b) => a.symbol !== b.symbol ? a.symbol.localeCompare(b.symbol) : a.bar_ts_ms - b.bar_ts_ms);

// ── Compute summary ───────────────────────────────────────────────────────────
const closed = decisions.filter((d) => d.closed);
const total_pnl = Math.round(closed.reduce((s, d) => s + d.pnl, 0) * 1e6) / 1e6;
const wins = closed.filter((d) => d.pnl > 0).length;
const losses = closed.filter((d) => d.pnl < 0).length;
const win_rate = closed.length > 0 ? Math.round((wins / closed.length) * 1e4) / 1e4 : null;

// ── Write outputs ─────────────────────────────────────────────────────────────
const outDir = path.join(ROOT, 'artifacts/outgoing');
fs.mkdirSync(outDir, { recursive: true });

const jsonlLines = decisions.map((d) => JSON.stringify(canon(d)));
const jsonlContent = jsonlLines.join('\n') + '\n';
const jsonlSha = sha(jsonlContent);

const simLock = {
  schema_version: SCHEMA_VERSION,
  signals_source: 'features_liq.jsonl',
  price_provider: args.priceProvider,
  price_run_id: priceRunId,
  price_schema_version: priceLock.schema_version,
  decisions_n: decisions.length,
  closed_n: closed.length,
  wins,
  losses,
  total_pnl,
  win_rate,
  paper_sim_sha256: jsonlSha,
};

fs.writeFileSync(path.join(outDir, 'paper_sim.jsonl'), jsonlContent);
fs.writeFileSync(path.join(outDir, 'paper_sim.lock.json'), JSON.stringify(simLock, null, 2) + '\n');

console.log(`[PASS] edge_paper_00_sim — decisions=${decisions.length} closed=${closed.length} pnl=${total_pnl} win_rate=${win_rate}`);
console.log(`  sha256: ${jsonlSha.slice(0, 16)}...`);
console.log(`  paper_sim.jsonl:      ${path.join(outDir, 'paper_sim.jsonl')}`);
console.log(`  paper_sim.lock.json:  ${path.join(outDir, 'paper_sim.lock.json')}`);
