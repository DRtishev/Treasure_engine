import fs from 'node:fs';
import path from 'node:path';
import { assertNetworkAllowed } from '../../../core/net/network_guard.mjs';
import { probeSelectProvider, providerById, providersFromAllowlist } from './real_public/real_public_provider_select.mjs';
import { normalizeRows, schemaSignature, sha256Text } from './real_public/providers/_provider_interface.mjs';
import { readJson, writeDeterministicJson } from './real_public/real_public_io.mjs';

const ROOT = path.resolve(process.cwd());
const INCOMING = path.join(ROOT, 'artifacts', 'incoming');
const HYP = path.join(ROOT, 'EDGE_PROFIT_00', 'HYPOTHESES_SSOT.md');
const MARKET_JSONL = path.join(INCOMING, 'real_public_market.jsonl');
const LOCK_MD = path.join(INCOMING, 'real_public_market.lock.md');
const LOCK_JSON = path.join(INCOMING, 'real_public_market.lock.json');
const CSV_RAW = path.join(INCOMING, 'raw_paper_telemetry.csv');
const CSV_IMPORT = path.join(INCOMING, 'paper_telemetry.csv');
const PROFILE = path.join(INCOMING, 'paper_telemetry.profile');
const NET_DIAG_JSON = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry', 'gates', 'manual', 'net_diag.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

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

function parseLockMd() {
  if (!fs.existsSync(LOCK_MD)) return null;
  const text = fs.readFileSync(LOCK_MD, 'utf8');
  const pick = (key) => text.match(new RegExp(`^- ${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  return {
    providerId: pick('provider_id'),
    schemaSig: pick('schema_signature'),
    datasetSha: pick('sha256_norm_dataset'),
    csvSha: pick('telemetry_csv_sha256'),
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
  const csv = `${out.join('\n')}\n`;
  fs.writeFileSync(CSV_RAW, csv);
  fs.writeFileSync(CSV_IMPORT, csv);
}

const hyp = parseHyp();
const allowlistRaw = process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken';
const allowlist = providersFromAllowlist(allowlistRaw);
const lockMd = parseLockMd();
const lockJson = readJson(LOCK_JSON);
const lockFirst = Boolean(lockMd || lockJson);
const diagJson = fs.existsSync(NET_DIAG_JSON) ? readJson(NET_DIAG_JSON) : null;
const selectedNetFamily = process.env.NET_FAMILY === '4' ? 4 : process.env.NET_FAMILY === '6' ? 6 : Number(diagJson?.selected_net_family || 0);
const hosts = Array.isArray(diagJson?.hosts) ? diagJson.hosts : [];
const netFamily = selectedNetFamily || 0;

if (String(process.env.REAL_PUBLIC_DRY_RUN || '0').match(/^(1|true)$/i)) {
  const dryMd = `# REAL_PUBLIC_MARKET_LOCK.md\n\n- gate_decision: NEEDS_DATA\n- reason_code: ACQ02\n- next_action: ${NEXT_ACTION}\n- mode: DRY_RUN\n- provider_allowlist: ${allowlistRaw}\n- lock_first_detected: ${lockFirst}\n`;
  fs.writeFileSync(LOCK_MD, dryMd);
  writeDeterministicJson(LOCK_JSON, {
    schema_version: '1.0.0',
    gate_decision: 'NEEDS_DATA',
    reason_code: 'ACQ02',
    next_action: NEXT_ACTION,
    mode: 'DRY_RUN',
    provider_allowlist: allowlist,
    lock_first_detected: lockFirst,
    net_family: netFamily,
    route: 'DRY_RUN',
    output_files: {
      jsonl_path: 'artifacts/incoming/real_public_market.jsonl',
      telemetry_csv_path: 'artifacts/incoming/paper_telemetry.csv',
    },
  });
  console.log('[NEEDS_DATA] edge_profit_00_acquire_real_public — ACQ02 (DRY_RUN)');
  process.exit(0);
}

if (lockFirst) {
  if (!fs.existsSync(MARKET_JSONL) || !fs.existsSync(CSV_IMPORT)) {
    fail('DATA02', 'Lock exists but required dataset/telemetry file is missing.');
  }
  const lockProvider = String(lockJson?.provider || lockMd?.providerId || '').toLowerCase();
  if (lockProvider && !allowlist.includes(lockProvider)) {
    fail('ACQ01', `Existing lock provider=${lockProvider} not present in PROVIDER_ALLOWLIST=${allowlistRaw}. NEXT_ACTION: ${NEXT_ACTION}`);
  }
  const rows = fs.readFileSync(MARKET_JSONL, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const norm = normalizeRows(rows);
  if (norm.length < 210) fail('DATA04', `Lock dataset row count too low: ${norm.length}`);
  const expectedSchema = String(lockJson?.schema_signature || lockMd?.schemaSig || '');
  if (expectedSchema && expectedSchema !== schemaSignature()) fail('DATA04', 'Lock schema signature mismatch.');

  const gotDatasetSha = sha256File(MARKET_JSONL);
  const gotCsvSha = sha256File(CSV_IMPORT);
  const expectedDatasetSha = String(lockJson?.output_files?.jsonl_sha256 || lockMd?.datasetSha || '');
  const expectedCsvSha = String(lockJson?.output_files?.telemetry_csv_sha256 || lockMd?.csvSha || '');
  if ((expectedDatasetSha && expectedDatasetSha !== gotDatasetSha) || (expectedCsvSha && expectedCsvSha !== gotCsvSha)) {
    fail('DATA02', 'LOCK_FIRST integrity mismatch (dataset/telemetry hash drift).');
  }
  fs.writeFileSync(PROFILE, 'public\n');
  console.log('[PASS] edge_profit_00_acquire_real_public — NONE (LOCK_FIRST)');
  process.exit(0);
}

for (const providerId of allowlist) {
  try { assertNetworkAllowed(providerId); } catch { fail('ACQ01', `network disabled by policy for provider=${providerId}`); }
}

if (lockFirst && lockJson?.selected_host && !process.env.PUBLIC_ROUTE_OVERRIDE) process.env.PUBLIC_LOCKED_HOST = String(lockJson.selected_host);
const selected = await probeSelectProvider({ allowlistRaw, symbol: hyp.symbol, tf: hyp.tf });
if (!selected.provider || !selected.selected) {
  fail('ACQ02', `No reachable providers from allowlist=${allowlistRaw}. NEXT_ACTION: ${NEXT_ACTION}`, selected.attempts);
}

const provider = providerById(selected.selected);
const serverTimeAnchorMs = Number(selected.serverTimeMs || 0);
let fetched;
try {
  fetched = await provider.fetchCandles(hyp.symbol, hyp.tf, serverTimeAnchorMs, 260);
} catch (err) {
  fail(String(err?.code || 'ACQ02'), String(err?.message || 'fetchCandles failed'), selected.attempts);
}
const fetchedRows = Array.isArray(fetched) ? fetched : fetched?.rows;
const rows = normalizeRows(fetchedRows || []);
if (rows.length < 210) fail('DATA04', `Fetched rows below threshold: ${rows.length}`);
if (rows.some((r) => !Number.isFinite(r.ts_open_ms) || !Number.isFinite(r.o) || !Number.isFinite(r.h) || !Number.isFinite(r.l) || !Number.isFinite(r.c) || !Number.isFinite(r.v))) {
  fail('DATA04', 'Non-finite candle fields after canonicalization.');
}

const providerChunks = Array.isArray(fetched?.chunks) ? fetched.chunks : [];
const providerCanary = Array.isArray(fetched?.canary) ? fetched.canary : [];
for (const c of providerCanary) {
  if (String(c.sha256_raw_a || '') !== String(c.sha256_raw_b || '')) {
    fail('DATA02', `Drift canary mismatch for overlap window ${c.overlap_start_ms}-${c.overlap_end_ms}`);
  }
}

const datasetJsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(MARKET_JSONL, datasetJsonl);
writeCsv(rows, selected.selected);
fs.writeFileSync(PROFILE, 'public\n');

const windowStartMs = Number(fetched?.start_ms || rows[0].ts_open_ms);
const windowEndMs = rows[rows.length - 1].ts_open_ms;
const endAnchorMs = Number(fetched?.end_anchor_ms || windowEndMs);
const hypSha = fs.existsSync(HYP) ? sha256File(HYP) : 'MISSING';
const datasetSha = sha256File(MARKET_JSONL);
const csvSha = sha256File(CSV_IMPORT);
const responseSha = sha256Text(JSON.stringify({ probe: selected.probeRows, fetched_rows_n: rows.length }));
const sig = schemaSignature();

const lockMdText = `# REAL_PUBLIC_MARKET_LOCK.md

- provider_id: ${selected.selected}
- provider_api_version: public_v1
- server_time_anchor_ms: ${serverTimeAnchorMs}
- start_ms: ${windowStartMs}
- end_anchor_ms: ${endAnchorMs}
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
- zip_sha256: ${String(fetched?.zip_sha256 || 'NA')}
- extracted_csv_sha256: ${String(fetched?.extracted_csv_sha256 || 'NA')}
- time_unit_detected: ${String(fetched?.time_unit_detected || 'ms')}
- time_unit_normalized_to: ${String(fetched?.time_unit_normalized_to || 'ms')}
- time_unit_mixed: ${Boolean(fetched?.time_unit_mixed)}
- selected_net_family: ${netFamily || 'NONE'}
- hosts: ${hosts.join(',') || 'NONE'}
- selected_host: ${String(fetched?.selected_host || '').trim() || 'NONE'}

## PROVIDER_FAILURES_BEFORE_SELECT

| provider | class | code | message |
|---|---|---|---|
${renderProviderFailures(selected.attempts)}
`;
fs.writeFileSync(LOCK_MD, lockMdText);

writeDeterministicJson(LOCK_JSON, {
  schema_version: '1.0.0',
  provider: selected.selected,
  provider_id: selected.selected,
  base_url_used: String(fetched?.base_url_used || provider?.baseUrl || ''),
  symbol: hyp.symbol,
  timeframe: hyp.tf,
  start_ms: windowStartMs,
  end_anchor_ms: endAnchorMs,
  server_time_ms: Number(fetched?.server_time_ms || serverTimeAnchorMs),
  chunks: providerChunks,
  canary: providerCanary,
  net_family: netFamily,
  selected_net_family: netFamily,
  hosts,
  selected_host: String(fetched?.selected_host || ''),
  host_pool_attempts: Array.isArray(fetched?.host_pool_attempts) ? fetched.host_pool_attempts.map((x)=>({ base: String(x.base||''), code: String(x.code||'' ) })) : [],
  route: String(fetched?.route || 'REST'),
  output_files: {
    jsonl_path: 'artifacts/incoming/real_public_market.jsonl',
    jsonl_sha256: datasetSha,
    telemetry_csv_path: 'artifacts/incoming/paper_telemetry.csv',
    telemetry_csv_sha256: csvSha,
  },
  schema_signature: sig,
  row_count: rows.length,
  zip_sha256: String(fetched?.zip_sha256 || ''),
  extracted_csv_sha256: String(fetched?.extracted_csv_sha256 || ''),
  time_unit_detected: String(fetched?.time_unit_detected || 'ms'),
  time_unit_normalized_to: String(fetched?.time_unit_normalized_to || 'ms'),
  time_unit_mixed: Boolean(fetched?.time_unit_mixed),
  attempts: selected.attempts.map((a) => ({ provider: a.provider_id, step: a.step || 'probe', outcome: a.outcome || 'error', error_class: a.class || 'UNKNOWN' })),
  hypotheses_sha256: hypSha,
  sha256_raw_responses: responseSha,
});

console.log(`[PASS] edge_profit_00_acquire_real_public — NONE (${selected.selected})`);
