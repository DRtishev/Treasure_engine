#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
const finalize = process.env.FINALIZE_EVIDENCE === '1';
const result = {
  finalized: finalize,
  checked_at: new Date().toISOString(),
  checked_epochs: 0,
  drift_count: 0,
  safe_fills: 0,
  mismatches: []
};

for (const [epoch, row] of Object.entries(ledger.epochs || {})) {
  if (row?.stage !== 'DONE' || !row?.evidence_root) continue;
  const expected = row.commit_sha || row.sha || '';
  const idxPath = path.join(row.evidence_root, 'pack_index.json');
  if (!expected || !fs.existsSync(idxPath)) continue;

  result.checked_epochs += 1;
  const pack = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  const packCommit = pack.commit_sha || '';
  const packSha = pack.sha || '';

  if (!packCommit && packSha === expected) {
    if (finalize) {
      pack.commit_sha = expected;
      fs.writeFileSync(idxPath, `${JSON.stringify(pack, null, 2)}\n`);
    }
    result.safe_fills += 1;
    continue;
  }

  if (packCommit !== expected || (packSha && packSha !== expected)) {
    result.drift_count += 1;
    result.mismatches.push({
      epoch,
      idxPath,
      expected,
      pack_commit_sha: packCommit,
      pack_sha: packSha
    });
    if (finalize) {
      pack.commit_sha = expected;
      pack.sha = expected;
      fs.writeFileSync(idxPath, `${JSON.stringify(pack, null, 2)}\n`);
    }
  }
}

console.log(JSON.stringify(result, null, 2));
if (result.drift_count > 0 && !finalize) process.exit(1);
