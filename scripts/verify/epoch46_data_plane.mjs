#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceWriteContext } from '../../core/evidence/evidence_write_mode.mjs';
import crypto from 'node:crypto';
import { replayNormalizedDataset } from '../../core/data/replay_engine.mjs';
import { validateContract } from '../../core/data/contracts_v1.mjs';

const evidence = process.env.EVIDENCE_EPOCH || 'EPOCH-46';
const runLabel = process.env.RUN_LABEL || 'manual';
const { evidenceRoot: eDir } = resolveEvidenceWriteContext(evidence);
const rDir = path.join(eDir, 'gates', runLabel);
fs.mkdirSync(rDir, { recursive: true });

const provider = 'fixture';
const datasetId = 'epoch46-mini';
const chunkPath = path.join(process.cwd(), 'data/normalized', provider, datasetId, 'chunks', 'chunk_0001.jsonl');
const chunkRaw = fs.readFileSync(chunkPath);
const chunkHash = crypto.createHash('sha256').update(chunkRaw).digest('hex');

const replay1 = replayNormalizedDataset({ provider, datasetId });
const replay2 = replayNormalizedDataset({ provider, datasetId });

let passed = 0; let failed = 0;
const assert = (c, m) => c ? (passed++, console.log(`✓ ${m}`)) : (failed++, console.error(`✗ ${m}`));
assert(replay1.fingerprint === replay2.fingerprint, 'deterministic replay x2');
assert(replay1.count === 4, 'expected fixture row count');

for (const row of replay1.stream) validateContract('Candle', row);
assert(true, 'contract validation passes for all candles');

const sorted = [...replay1.stream].sort((a, b) => a.ts_open.localeCompare(b.ts_open) || a.symbol.localeCompare(b.symbol));
assert(JSON.stringify(sorted) === JSON.stringify(replay1.stream), 'no look-ahead ordering drift');

const uniq = new Set(replay1.stream.map((r) => `${r.symbol}|${r.ts_open}`));
assert(uniq.size === replay1.stream.length, 'dedup check passes');

const manifest = {
  dataset_id: datasetId,
  provider,
  chunks: [{ path: 'data/normalized/fixture/epoch46-mini/chunks/chunk_0001.jsonl', sha256: chunkHash, records: replay1.count }],
  replay_fingerprint: replay1.fingerprint
};
const manifestPath = path.join(process.cwd(), 'data/manifests', `${datasetId}.manifest.json`);
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const sumsPath = path.join(process.cwd(), 'SHA256SUMS.DATA');
fs.writeFileSync(sumsPath, `${chunkHash}  data/normalized/fixture/epoch46-mini/chunks/chunk_0001.jsonl\n`);

fs.writeFileSync(path.join(eDir, 'sample_chunk.jsonl'), fs.readFileSync(chunkPath));
fs.writeFileSync(path.join(eDir, 'epoch46-mini.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const result = { passed, failed, manifest_path: path.relative(process.cwd(), manifestPath), replay_fingerprint: replay1.fingerprint };
fs.writeFileSync(path.join(rDir, 'verify_epoch46_result.json'), JSON.stringify(result, null, 2) + '\n');
if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch46 checks=${passed} fp=${replay1.fingerprint}`);
