#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ledgerPath = 'specs/epochs/LEDGER.json';
const requiredPackFiles = [
  'PREFLIGHT.log',
  'COMMANDS.log',
  'SNAPSHOT.md',
  'SUMMARY.md',
  'VERDICT.md',
  'SHA256SUMS.EVIDENCE',
  'pack_index.json'
];

function parseShaMap(filePath) {
  const map = new Map();
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([a-f0-9]{64})\s+\*?\.?\/?(.+)$/);
    if (m) map.set(m[2], m[1]);
  }
  return map;
}

const errors = [];
if (!fs.existsSync(ledgerPath)) {
  console.error('verify:ledger FAILED');
  console.error(`- missing ${ledgerPath}`);
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
for (const [epoch, row] of Object.entries(ledger.epochs ?? {})) {
  const epochNum = Number(epoch);
  if (row.stage !== 'DONE' || Number.isNaN(epochNum) || epochNum < 17) continue;

  const evidenceRoot = row.evidence_root;
  if (!evidenceRoot || typeof evidenceRoot !== 'string') {
    errors.push(`LEDGER epoch ${epoch} DONE requires evidence_root`);
    continue;
  }

  const absRoot = path.resolve(evidenceRoot);
  if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
    errors.push(`LEDGER epoch ${epoch} evidence_root missing dir: ${evidenceRoot}`);
    continue;
  }

  for (const file of requiredPackFiles) {
    if (!fs.existsSync(path.join(absRoot, file))) {
      errors.push(`LEDGER epoch ${epoch} missing evidence file: ${path.join(evidenceRoot, file)}`);
    }
  }

  const shaPath = path.join(absRoot, 'SHA256SUMS.EVIDENCE');
  const idxPath = path.join(absRoot, 'pack_index.json');
  if (fs.existsSync(shaPath) && fs.existsSync(idxPath)) {
    const shaMap = parseShaMap(shaPath);
    if (!shaMap.has('pack_index.json')) {
      errors.push(`LEDGER epoch ${epoch} SHA256SUMS.EVIDENCE missing pack_index.json`);
    }

    const index = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    const expected = `EPOCH-${String(epochNum).padStart(2, '0')}`;
    if (index.epoch_id !== expected) errors.push(`LEDGER epoch ${epoch} pack_index epoch_id mismatch`);

    for (const run of index.gate_runs ?? []) {
      const rel = run.path;
      const full = path.join(absRoot, rel);
      if (!fs.existsSync(full)) errors.push(`LEDGER epoch ${epoch} gate run missing: ${rel}`);
      if (!shaMap.has(rel)) errors.push(`LEDGER epoch ${epoch} SHA256SUMS.EVIDENCE missing gate log: ${rel}`);
    }
  }
}

if (errors.length) {
  console.error('verify:ledger FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('verify:ledger PASSED');
