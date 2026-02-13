#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseCsv, jsonlParse, toJsonl } from '../../core/edge/private_fill_contracts.mjs';
import { adaptPrivateFillRow } from '../../core/edge/private_fills_adapters.mjs';
import { evaluatePrivateFillQuality } from '../../core/edge/private_data_quality.mjs';

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const source = arg('--source');
const provider = (arg('--provider', 'binance') || '').toLowerCase();
const dataset = arg('--dataset');
const strict = process.argv.includes('--strict') || process.env.EXEC_REALISM_STRICT === '1';
const accountLabel = arg('--account-label', 'acct-redacted');
const venue = arg('--venue', provider);
const chunkSize = Math.max(1, Number(arg('--chunk-size', '1000')));

if (!source || !dataset) {
  console.error('usage: node scripts/data/ingest_private_fills.mjs --source <csv|jsonl> --provider <name> --dataset <id> [--strict] [--chunk-size N]');
  process.exit(1);
}

const rawDir = path.resolve(`data/private/raw/${provider}/${dataset}/chunks`);
const normDir = path.resolve(`data/private/normalized/${provider}/${dataset}/chunks`);
const manifestPath = path.resolve(`data/manifests/${dataset}.fills.manifest.json`);
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(normDir, { recursive: true });

const body = fs.readFileSync(path.resolve(source), 'utf8');
let sourceRows;
if (source.endsWith('.csv')) sourceRows = parseCsv(body);
else sourceRows = jsonlParse(body);

const normalized = sourceRows.map((r) => adaptPrivateFillRow(r, { provider, strict, account_label: accountLabel, venue }));
const quality = evaluatePrivateFillQuality(normalized, { strict });

const canonical = [...normalized].sort((a, b) => a.ts_ms - b.ts_ms || String(a.fill_id).localeCompare(String(b.fill_id)));
const datasetFingerprint = crypto.createHash('sha256').update(JSON.stringify(canonical.map((r) => r.output_fingerprint))).digest('hex');

for (const baseDir of [rawDir, normDir]) {
  fs.rmSync(baseDir, { recursive: true, force: true });
  fs.mkdirSync(baseDir, { recursive: true });
}

const chunks = [];
for (let i = 0; i < canonical.length; i += chunkSize) {
  const part = canonical.slice(i, i + chunkSize);
  const idx = String(Math.floor(i / chunkSize) + 1).padStart(4, '0');
  const rawChunk = path.join(rawDir, `chunk_${idx}.jsonl`);
  const normChunk = path.join(normDir, `chunk_${idx}.jsonl`);
  fs.writeFileSync(rawChunk, toJsonl(part));
  fs.writeFileSync(normChunk, toJsonl(part));
  const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  chunks.push(
    { type: 'raw', path: path.relative(process.cwd(), rawChunk).replaceAll('\\', '/'), sha256: sha(rawChunk), records: part.length },
    { type: 'normalized', path: path.relative(process.cwd(), normChunk).replaceAll('\\', '/'), sha256: sha(normChunk), records: part.length }
  );
}

const manifest = {
  schema_version: '1.0.0',
  provider,
  account_label: accountLabel,
  fills_dataset_id: dataset,
  time_range: {
    start_ts_ms: canonical.length ? canonical[0].ts_ms : null,
    end_ts_ms: canonical.length ? canonical.at(-1).ts_ms : null
  },
  input_source: { type: source.endsWith('.csv') ? 'file-csv' : 'file-jsonl', path: path.relative(process.cwd(), source).replaceAll('\\', '/') },
  chunks,
  chunk_size: chunkSize,
  schema_versions: { fill_record: '1.0.0' },
  normalization_version: '1.0.0',
  ingest_version: 'e51-v1',
  strict_mode: strict,
  dataset_fingerprint: datasetFingerprint,
  quality_summary: {
    dedup_count: quality.dedup_count,
    gap_count: quality.gap_count,
    outlier_count: quality.outlier_count,
    heuristic_used: quality.heuristic_used,
    warnings: quality.warnings
  },
  quality_fingerprint: quality.fingerprint
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = [...chunks.map((c) => path.resolve(c.path)), manifestPath].sort();
const lines = files.map((f) => `${sha(f)}  ${path.relative(path.resolve('data'), f).replaceAll('\\', '/')}`);
fs.writeFileSync(path.resolve('data/SHA256SUMS.PRIVATE_DATA'), `${lines.join('\n')}\n`);

const qPath = path.resolve(`data/private/normalized/${provider}/${dataset}/private_quality_report.json`);
fs.writeFileSync(qPath, `${JSON.stringify({ ...quality, dataset_fingerprint: datasetFingerprint }, null, 2)}\n`);

console.log(`ingest_private_fills complete dataset=${dataset} strict=${strict} rows=${canonical.length} chunks=${Math.ceil(canonical.length / chunkSize)}`);
