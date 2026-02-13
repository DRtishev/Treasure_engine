#!/usr/bin/env node
import fs from 'node:fs';

const ledgerPath = 'specs/epochs/LEDGER.json';
const indexPath = 'specs/epochs/INDEX.md';
const errors = [];

if (!fs.existsSync(ledgerPath)) {
  console.error('verify:ssot FAILED');
  console.error(`- missing ${ledgerPath}`);
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const keys = Object.keys(ledger.epochs ?? {}).map((k) => Number(k)).filter((k) => Number.isInteger(k) && k > 0).sort((a, b) => a - b);
if (keys.length === 0) errors.push('ledger has no numeric epoch keys');

const maxEpoch = keys[keys.length - 1] ?? 0;
const keySet = new Set(keys);
for (let i = 1; i <= maxEpoch; i += 1) {
  if (!keySet.has(i)) errors.push(`LEDGER gap: missing epoch ${i} (max=${maxEpoch})`);
}

const indexText = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
for (let i = 1; i <= maxEpoch; i += 1) {
  const spec = `specs/epochs/EPOCH-${String(i).padStart(2, '0')}.md`;
  if (!fs.existsSync(spec)) errors.push(`missing spec file for ledger epoch: ${spec}`);
  if (!indexText.includes(`\`${spec}\``)) errors.push(`INDEX missing spec mapping: ${spec}`);
}

if (!fs.existsSync(indexPath)) errors.push(`missing ${indexPath}`);

if (errors.length) {
  console.error('verify:ssot FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`verify:ssot PASSED (epochs=1..${maxEpoch})`);
