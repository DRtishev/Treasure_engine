#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseJsonl, fingerprintObject, normalizeTradeEvent } from '../../core/edge/data_contracts.mjs';
import { evaluateDataQuality } from '../../core/edge/data_quality.mjs';

const root = process.cwd();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-49';
const runLabel = process.env.RUN_LABEL || 'manual';
const manualDir = path.join(root, 'reports/evidence', evidenceEpoch, 'gates', 'manual');
fs.mkdirSync(manualDir, { recursive: true });

const datasetId = process.env.DATASET_ID || 'e49_fixture';
const provider = process.env.PROVIDER || 'binance';
const manifestPath = path.join(root, 'data/manifests', `${datasetId}.manifest.json`);
const rawChunk = path.join(root, `data/raw/${provider}/${datasetId}/chunks/chunk_1700000000000_0001.jsonl`);
const normalizedChunk = path.join(root, `data/normalized/${provider}/${datasetId}/chunks/chunk_1700000000000_0001.jsonl`);
const shaDataPath = path.join(root, 'data/SHA256SUMS.DATA');

let passed = 0;
let failed = 0;
const checks = [];
const check = (cond, msg) => {
  checks.push({ msg, ok: cond });
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
};

check(fs.existsSync(manifestPath), 'manifest exists');
check(fs.existsSync(rawChunk), 'raw chunk exists');
check(fs.existsSync(normalizedChunk), 'normalized chunk exists');
check(fs.existsSync(shaDataPath), 'SHA256SUMS.DATA exists');

if (fs.existsSync(manifestPath) && fs.existsSync(rawChunk) && fs.existsSync(normalizedChunk) && fs.existsSync(shaDataPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const shaText = fs.readFileSync(shaDataPath, 'utf8');
  const normRel = `normalized/${provider}/${datasetId}/chunks/chunk_1700000000000_0001.jsonl`;
  const normHash = crypto.createHash('sha256').update(fs.readFileSync(normalizedChunk)).digest('hex');

  check(Array.isArray(manifest.chunks) && manifest.chunks.length >= 2, 'manifest chunk list complete');
  check(shaText.includes(`${normHash}  ${normRel}`), 'SHA256SUMS.DATA contains normalized chunk hash');

  const rows = parseJsonl(fs.readFileSync(normalizedChunk, 'utf8'));
  const fp1 = fingerprintObject(rows.map((r) => r.output_fingerprint));
  const fp2 = fingerprintObject(parseJsonl(fs.readFileSync(normalizedChunk, 'utf8')).map((r) => r.output_fingerprint));
  check(fp1 === fp2, 'deterministic replay fingerprint stable');

  const rawRows = parseJsonl(fs.readFileSync(rawChunk, 'utf8'));
  const normalizedFromRaw = rawRows.map((r) => normalizeTradeEvent(r, provider));
  const { report } = evaluateDataQuality(normalizedFromRaw, { maxTimeGapMs: 1500, dedupWindowMs: 500, allowOutOfOrder: 5 });

  check(report.dedup_count >= 1, 'dedup detected in fixture');
  check(report.gap_count >= 1, 'gap detected in fixture');
  check(report.out_of_order_count >= 1, 'out-of-order detected in fixture');

  const replayFingerprint = {
    dataset_id: datasetId,
    provider,
    fingerprint: fp1,
    rows: rows.length
  };

  fs.writeFileSync(path.join(manualDir, 'dataset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(manualDir, 'quality_report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(manualDir, 'replay_fingerprint.json'), `${JSON.stringify(replayFingerprint, null, 2)}\n`);
}

const result = {
  epoch: 'EPOCH-49',
  run_label: runLabel,
  passed,
  failed,
  status: failed === 0 ? 'PASS' : 'FAIL',
  checks
};
fs.writeFileSync(path.join(manualDir, 'verify_epoch49_result.json'), `${JSON.stringify(result, null, 2)}\n`);

if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch49 checks=${passed}`);
