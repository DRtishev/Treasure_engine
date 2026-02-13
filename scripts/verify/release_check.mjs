#!/usr/bin/env node
import fs from 'node:fs';

const enforceBuild = process.env.RELEASE_BUILD === '1';
const strict = process.env.RELEASE_STRICT === '1';

if (!enforceBuild && !strict) {
  console.log('verify:release SKIPPED (set RELEASE_BUILD=1 and/or RELEASE_STRICT=1)');
  process.exit(0);
}

const errors = [];
if (enforceBuild) {
  const required = [
    'artifacts/out/FINAL_VALIDATED.zip',
    'artifacts/out/FINAL_VALIDATED.zip.sha256',
    'artifacts/out/evidence_chain.tar.gz',
    'artifacts/out/evidence_chain.tar.gz.sha256',
    'artifacts/out/evidence_allowlist.txt'
  ];
  for (const file of required) if (!fs.existsSync(file)) errors.push(`missing ${file}`);
}

if (strict) {
  const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
  for (const [epoch, row] of Object.entries(ledger.epochs ?? {})) {
    const n = Number(epoch);
    if (row.status !== 'DONE' || Number.isNaN(n) || n < 42) continue;
    if (!row.evidence_root) {
      errors.push(`DONE epoch ${epoch} missing evidence_root`);
      continue;
    }
    const must = ['pack_index.json', 'SHA256SUMS.EVIDENCE', 'VERDICT.md', 'SUMMARY.md'];
    for (const f of must) {
      const p = `${row.evidence_root}${f}`;
      if (!fs.existsSync(p)) errors.push(`DONE epoch ${epoch} missing ${p}`);
    }
  }
}

if (errors.length) {
  console.error('verify:release FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:release PASSED');
