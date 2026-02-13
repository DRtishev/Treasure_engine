#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceWriteContext } from '../../core/evidence/evidence_write_mode.mjs';
import crypto from 'node:crypto';
import { runOverfitDefense } from '../../core/edge/overfit_defense.mjs';

const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-43';
const runLabel = process.env.RUN_LABEL || 'manual';
const { evidenceRoot: evidenceDir } = resolveEvidenceWriteContext(evidenceEpoch);
const runDir = path.join(evidenceDir, 'gates', runLabel);
fs.mkdirSync(runDir, { recursive: true });

let passed = 0;
let failed = 0;
const assert = (cond, msg) => {
  if (cond) { passed += 1; console.log(`✓ ${msg}`); }
  else { failed += 1; console.error(`✗ ${msg}`); }
};

const datasetPath = path.join(process.cwd(), 'tests/vectors/overfit/epoch43_small_dataset.json');
const input = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const datasetHash = crypto.createHash('sha256').update(fs.readFileSync(datasetPath)).digest('hex');

const run1 = runOverfitDefense(input);
const run2 = runOverfitDefense(input);
assert(run1.input_fingerprint === run2.input_fingerprint, 'input fingerprint stable x2');
assert(run1.output_fingerprint === run2.output_fingerprint, 'output fingerprint stable x2');

const m = run1.output.splits_manifest;
assert(m.split_count === input.cpcv.k, 'split count equals k');
assert(m.splits.every((s) => s.train_count > 0 && s.test_count > 0), 'all splits have non-empty train/test');
assert(m.splits.every((s) => s.train_idx.every((i) => !s.test_idx.includes(i))), 'train/test leakage absent by index');
assert(run1.output.pbo_summary.pbo_estimate >= 0 && run1.output.pbo_summary.pbo_estimate <= 1, 'PBO in [0,1]');
assert(Number.isFinite(run1.output.dsr_summary.best_dsr), 'DSR finite');

fs.writeFileSync(path.join(runDir, 'splits_manifest.json'), `${JSON.stringify(run1.output.splits_manifest, null, 2)}\n`);
fs.writeFileSync(path.join(runDir, 'overfit_metrics.json'), `${JSON.stringify({
  dataset_path: path.relative(process.cwd(), datasetPath),
  dataset_hash: datasetHash,
  pbo_summary: run1.output.pbo_summary,
  dsr_summary: run1.output.dsr_summary,
  thresholds: run1.output.thresholds,
  verdict: run1.output.verdict,
  output_fingerprint: run1.output_fingerprint
}, null, 2)}\n`);

const result = { passed, failed, fingerprint: run1.output_fingerprint, verdict: run1.output.verdict };
fs.writeFileSync(path.join(runDir, 'verify_epoch43_result.json'), `${JSON.stringify(result, null, 2)}\n`);

if (process.env.OVERFIT_STRICT === '1' && run1.output.verdict === 'FAIL') {
  console.error('FAIL strict overfit gate');
  process.exit(1);
}
if (failed > 0) {
  console.error(`FAILED checks=${failed}`);
  process.exit(1);
}
console.log(`PASS verify:epoch43 checks=${passed} fingerprint=${run1.output_fingerprint}`);
