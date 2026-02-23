import fs from 'node:fs';
import path from 'node:path';
import { assertNetworkAllowed } from '../../../core/net/network_guard.mjs';
import { probeSelectProvider, providerById, providersFromAllowlist } from './real_public/real_public_provider_select.mjs';
import { normalizeRows, schemaSignature, sha256Text } from './real_public/providers/_provider_interface.mjs';

const ROOT = path.resolve(process.cwd());
const INCOMING = path.join(ROOT, 'artifacts', 'incoming');
const HYP = path.join(ROOT, 'EDGE_PROFIT_00', 'HYPOTHESES_SSOT.md');
const MARKET_JSONL = path.join(INCOMING, 'real_public_market.jsonl');
const LOCK_MD = path.join(INCOMING, 'real_public_market.lock.md');
const CSV = path.join(INCOMING, 'raw_paper_telemetry.csv');
const PROFILE = path.join(INCOMING, 'paper_telemetry.profile');

fs.mkdirSync(INCOMING, { recursive: true });

function sha256File(abs) { return sha256Text(fs.readFileSync(abs)); }

function fail(code, msg, attempts = []) {
  console.error(`[FAIL] edge_profit_00_acquire_real_public — ${code}: ${msg}`);
  if (attempts.length) {
    console.error('provider_failures:');
    for (const a of attempts) console.error(`- ${a.provider_id} | ${a.class} | ${a.code || 'NA'} | ${a.message}`);
  }
  process.exit(1);
}

function parseHyp() {
  const fallback = { symbol: 'BTCUSDT', tf: '5m', venue: 'BINANCE_SPOT', source: 'fallback' };
  if (!fs.existsSync(HYP)) return fallback;
  const lines = fs.readFileSync(HYP, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    if (!/^HYP-\d+\|/.test(line)) continue;
    const cols = line.split('|');
    const name = String(cols[1] || '').toUpperCase();
    const tf = String(cols[3] || '5m').trim();
    const venue = String(cols[4] || 'BINANCE_SPOT').trim();
    const symbol = name.includes('ETH') ? 'ETHUSDT' : 'BTCUSDT';
    return { symbol, tf, venue, source: 'hypotheses_ssot' };
  }
  return fallback;
}

function parseLock() {
  if (!fs.existsSync(LOCK_MD)) return null;
  const text = fs.readFileSync(LOCK_MD, 'utf8');
  const pick = (key) => text.match(new RegExp(`^- ${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  return {
    providerId: pick('provider_id'),
    serverTimeAnchorMs: Number(pick('server_time_anchor_ms') || 0),
    windowStartMs: Number(pick('window_start_ms') || 0),
    windowEndMs: Number(pick('window_end_ms') || 0),
    symbols: pick('symbols'),
    tf: pick('tf'),
    schemaSig: pick('schema_signature'),
  };
}

function renderProviderFailures(attempts) {
  return attempts.length
    ? attempts.map((a) => `| ${a.provider_id} | ${a.class} | ${a.code || 'NA'} | ${String(a.message).slice(0, 160)} |`).join('\n')
    : '| NONE | NONE | NONE | NONE |';
}

function writeCsv(rows, providerId) {
  const header = ['ts','symbol','side','signal_id','intended_entry','intended_exit','fill_price','fee','slippage_bps','latency_ms','result_pnl','source_tag','spread_bps','size_ratio'];
  const out = [header.join(',')];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    const side = cur.c >= prev.c ? 'BUY' : 'SELL';
    const intendedEntry = prev.c;
    const intendedExit = cur.c;
    const fill = side === 'BUY' ? intendedEntry * 1.0002 : intendedEntry * 0.9998;
    const fee = fill * 0.0004;
    const result = side === 'BUY' ? (intendedExit - fill - fee) : (fill - intendedExit - fee);
    const ts = new Date(cur.ts_open_ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
    out.push([
      ts, cur.symbol, side, `PUB-${String(i).padStart(6, '0')}`,
      intendedEntry.toFixed(8), intendedExit.toFixed(8), fill.toFixed(8), fee.toFixed(8),
      (2 + (i % 5)).toFixed(8), (70 + (i % 140)).toFixed(8), result.toFixed(8),
      `REAL_PUBLIC_${providerId.toUpperCase()}_V1`, (1 + (i % 3)).toFixed(8), (1 + ((i % 4) * 0.25)).toFixed(8),
    ].join(','));
  }
  fs.writeFileSync(CSV, `${out.join('\n')}\n`);
}

const hyp = parseHyp();
const allowlistRaw = process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken';
const allowlist = providersFromAllowlist(allowlistRaw);
const lock = parseLock();
const lockFirst = Boolean(lock);

if (lockFirst) {
  if (!fs.existsSync(MARKET_JSONL) || !fs.existsSync(CSV)) {
    fail('ACQ05', 'Lock exists but dataset/csv file is missing.');
  }
  if (lock.providerId && !allowlist.includes(lock.providerId)) {
    fail('ACQ03', `Existing lock provider=${lock.providerId} not present in PROVIDER_ALLOWLIST=${allowlistRaw}`);
  }
  const rows = fs.readFileSync(MARKET_JSONL, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const norm = normalizeRows(rows);
  if (norm.length < 210) fail('ACQ05', `Lock dataset row count too low: ${norm.length}`);
  if (lock.schemaSig && lock.schemaSig !== schemaSignature()) fail('ACQ04', 'Lock schema signature mismatch.');
  fs.writeFileSync(PROFILE, 'public\n');
  console.log('[PASS] edge_profit_00_acquire_real_public — NONE (LOCK_FIRST)');
  process.exit(0);
}

for (const providerId of allowlist) {
  try { assertNetworkAllowed(providerId); } catch { fail('ACQ01', `network disabled by policy for provider=${providerId}`); }
}

const selected = await probeSelectProvider({ allowlistRaw, symbol: hyp.symbol, tf: hyp.tf });
if (!selected.provider || !selected.selected) {
  fail('ACQ02', `No reachable providers from allowlist=${allowlistRaw}`, selected.attempts);
}

const provider = providerById(selected.selected);
const serverTimeAnchorMs = Number(selected.serverTimeMs || 0);
const fetched = await provider.fetchCandles(hyp.symbol, hyp.tf, serverTimeAnchorMs, 260);
const rows = normalizeRows(fetched);
if (rows.length < 210) fail('ACQ04', `Fetched rows below threshold: ${rows.length}`);
if (rows.some((r) => !Number.isFinite(r.ts_open_ms) || !Number.isFinite(r.o) || !Number.isFinite(r.h) || !Number.isFinite(r.l) || !Number.isFinite(r.c) || !Number.isFinite(r.v))) {
  fail('ACQ04', 'Non-finite candle fields after canonicalization.');
}

const datasetJsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(MARKET_JSONL, datasetJsonl);
writeCsv(rows, selected.selected);
fs.writeFileSync(PROFILE, 'public\n');

const windowStartMs = rows[0].ts_open_ms;
const windowEndMs = rows[rows.length - 1].ts_open_ms;
const hypSha = fs.existsSync(HYP) ? sha256File(HYP) : 'MISSING';
const datasetSha = sha256File(MARKET_JSONL);
const csvSha = sha256File(CSV);
const responseSha = sha256Text(JSON.stringify({ probe: selected.probeRows, fetched_rows_n: rows.length }));
const sig = schemaSignature();

const lockMd = `# REAL_PUBLIC_MARKET_LOCK.md

- provider_id: ${selected.selected}
- provider_api_version: public_v1
- server_time_anchor_ms: ${serverTimeAnchorMs}
- window_start_ms: ${windowStartMs}
- window_end_ms: ${windowEndMs}
- tf: ${hyp.tf}
- symbols: ${hyp.symbol}
- hypotheses_sha256: ${hypSha}
- sha256_raw_responses: ${responseSha}
- sha256_norm_dataset: ${datasetSha}
- row_count: ${rows.length}
- schema_signature: ${sig}
- telemetry_csv_sha256: ${csvSha}
- acquire_mode: NETWORK

## PROVIDER_FAILURES_BEFORE_SELECT

| provider | class | code | message |
|---|---|---|---|
${renderProviderFailures(selected.attempts)}
`;
fs.writeFileSync(LOCK_MD, lockMd);

console.log(`[PASS] edge_profit_00_acquire_real_public — NONE (${selected.selected})`);
