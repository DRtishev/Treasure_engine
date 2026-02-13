#!/usr/bin/env node
import fs from 'node:fs';

const n = Number(process.argv[2]);
if (!Number.isInteger(n)) {
  console.error('usage: node scripts/verify/epoch_fallback_gate.mjs <epoch-number>');
  process.exit(1);
}
const id = `EPOCH-${String(n).padStart(2, '0')}`;
const checks = [
  `specs/epochs/${id}.md`,
  'specs/epochs/LEDGER.json',
  'scripts/evidence/packager.mjs'
];
const missing = checks.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error(`verify:epoch${n} FAILED`);
  for (const m of missing) console.error(`- missing ${m}`);
  process.exit(1);
}
console.log(`verify:epoch${n} PASSED (fallback deterministic gate)`);
