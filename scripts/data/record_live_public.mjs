#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocket } from 'ws';
import { normalizeTradeEvent, parseJsonl, toJsonl, fingerprintObject } from '../../core/edge/data_contracts.mjs';
import { evaluateDataQuality } from '../../core/edge/data_quality.mjs';
import { dedupPublicTrades } from '../../core/edge/public_trade_dedup.mjs';

const PROVIDER = (process.env.PROVIDER || 'binance').toLowerCase();
const DATASET_ID = process.env.DATASET_ID || '';
const MODE = process.argv[2] || 'replay';

function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function ensureDatasetId() { if (!DATASET_ID) throw new Error('DATASET_ID is required'); return DATASET_ID; }
function providerAllowed() { return (process.env.PROVIDER_ALLOWLIST || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(PROVIDER); }
function ensureNetworkPolicy() { if (process.env.ENABLE_NETWORK !== '1') throw new Error('Network disabled: set ENABLE_NETWORK=1 for record mode'); if (!providerAllowed()) throw new Error(`Provider ${PROVIDER} not in PROVIDER_ALLOWLIST`); }

function datasetPaths(provider, datasetId) {
  return {
    rawDir: path.resolve(`data/raw/${provider}/${datasetId}/chunks`),
    normDir: path.resolve(`data/normalized/${provider}/${datasetId}/chunks`),
    manifestPath: path.resolve(`data/manifests/${datasetId}.manifest.json`)
  };
}

function writeChunks(rows, dir, prefix, chunkSize) {
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const c = rows.slice(i, i + chunkSize);
    const name = `${prefix}_${String((i / chunkSize) + 1).padStart(4, '0')}.jsonl`;
    const full = path.join(dir, name);
    fs.writeFileSync(full, toJsonl(c));
    files.push({ path: path.relative(process.cwd(), full).replaceAll('\\', '/'), records: c.length, sha256: sha256File(full) });
  }
  return files;
}

function writeManifest({ provider, datasetId, symbol, topic, rawChunks, normChunks, report, startedAt, endedAt, reconnect_count }) {
  const { manifestPath } = datasetPaths(provider, datasetId);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = {
    schema_version: '1.1.0', provider, dataset_id: datasetId, topics: [topic], params: { symbol },
    time_range: { start_ts_ms: startedAt, end_ts_ms: endedAt },
    chunks: [...rawChunks.map((x) => ({ type: 'raw', ...x })), ...normChunks.map((x) => ({ type: 'normalized', ...x }))],
    normalization_version: '1.0.0', recorder_version: 'e54-v1',
    quality_fingerprint: report.fingerprint,
    reconnect_count,
    gap_count: report.gap_count,
    dedup_count: report.dedup_count,
    out_of_order_count: report.out_of_order_count,
    heuristic_dedup_used: Boolean(report.heuristic_dedup_used)
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function record() {
  ensureNetworkPolicy();
  const datasetId = ensureDatasetId();
  const symbol = (process.env.SYMBOL || 'btcusdt').toLowerCase();
  const durationMs = Number(process.env.DURATION_MS || 30000);
  const maxEvents = Number(process.env.MAX_EVENTS || 200);
  const chunkSize = Number(process.env.CHUNK_SIZE_EVENTS || 100);

  if (PROVIDER !== 'binance') throw new Error(`Unsupported provider: ${PROVIDER}`);
  const { rawDir, normDir } = datasetPaths(PROVIDER, datasetId);
  const topic = `${symbol}@trade`;
  const wsUrl = `wss://stream.binance.com:9443/ws/${topic}`;
  const events = [];
  const startedAt = Date.now();
  let reconnect_count = 0;

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let done = false;
    const finish = () => { if (done) return; done = true; ws.close(); resolve(); };
    const timeout = setTimeout(finish, durationMs);
    ws.on('open', () => { reconnect_count += 1; });
    ws.on('message', (buf) => { try { events.push(JSON.parse(buf.toString('utf8'))); if (events.length >= maxEvents) finish(); } catch (e) { reject(e); } });
    ws.on('error', reject);
    ws.on('close', () => clearTimeout(timeout));
  });

  const endedAt = Date.now();
  const normalizedRaw = events.map((r) => normalizeTradeEvent(r, PROVIDER));
  const deduped = dedupPublicTrades(normalizedRaw, { strict: process.env.STRICT_PUBLIC_DEDUP === '1' });
  const quality = evaluateDataQuality(deduped.rows);
  quality.report.heuristic_dedup_used = deduped.report.heuristic_dedup_used;
  quality.report.dedup_count += deduped.report.dedup_count;

  const rawChunks = writeChunks(events, rawDir, `chunk_${String(startedAt).padStart(13, '0')}`, chunkSize);
  const normChunks = writeChunks(quality.normalizedEvents, normDir, `chunk_${String(startedAt).padStart(13, '0')}`, chunkSize);
  writeManifest({ provider: PROVIDER, datasetId, symbol: symbol.toUpperCase(), topic, rawChunks, normChunks, report: quality.report, startedAt, endedAt, reconnect_count });
  console.log(`record complete provider=${PROVIDER} dataset=${datasetId} events=${events.length}`);
}

function replay() {
  const datasetId = ensureDatasetId();
  const { normDir, manifestPath } = datasetPaths(PROVIDER, datasetId);
  const chunks = fs.readdirSync(normDir).filter((f) => f.endsWith('.jsonl')).sort();
  let rows = [];
  for (const chunk of chunks) rows = rows.concat(parseJsonl(fs.readFileSync(path.join(normDir, chunk), 'utf8')));
  rows.sort((a, b) => a.ts_ms - b.ts_ms || a.output_fingerprint.localeCompare(b.output_fingerprint));
  const replay = { provider: PROVIDER, dataset_id: datasetId, rows: rows.length, fingerprint: fingerprintObject(rows.map((r) => r.output_fingerprint)), chunks, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
  const out = process.env.REPLAY_OUT || '';
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(path.resolve(out), `${JSON.stringify(replay, null, 2)}\n`); }
  console.log(JSON.stringify(replay));
}

if (MODE === 'record') record().catch((err) => { console.error(err.message); process.exit(1); });
else if (MODE === 'replay') { try { replay(); } catch (err) { console.error(err.message); process.exit(1); } }
else { console.error('usage: node scripts/data/record_live_public.mjs <record|replay>'); process.exit(1); }
