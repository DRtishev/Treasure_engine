#!/usr/bin/env node
import fs from 'node:fs';

const ledgerPath = 'specs/epochs/LEDGER.json';
const errors = [];
if (!fs.existsSync(ledgerPath)) {
  console.error('verify:ledger:schema FAILED');
  console.error(`- missing ${ledgerPath}`);
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const epochs = ledger.epochs ?? {};
for (let i = 1; i <= 58; i += 1) {
  const row = epochs[String(i)];
  if (!row) {
    errors.push(`missing epoch ${i}`);
    continue;
  }
  for (const key of ['id', 'stage', 'commit_sha', 'gate_owner', 'notes']) {
    if (!(key in row)) errors.push(`epoch ${i} missing ${key}`);
  }
  if (!['LEGACY_DONE', 'DONE', 'BLOCKED'].includes(row.stage)) errors.push(`epoch ${i} invalid stage ${row.stage}`);
  if (row.stage === 'DONE') {
    if (!['PASS', 'FAIL'].includes(row.status)) errors.push(`epoch ${i} DONE must have PASS/FAIL status`);
    if (!row.evidence_root || typeof row.evidence_root !== 'string') errors.push(`epoch ${i} DONE requires evidence_root`);
  } else {
    if (row.status != null && !['PASS', 'FAIL'].includes(row.status)) errors.push(`epoch ${i} non-DONE status must be null/omitted`);
  }
}

if (errors.length) {
  console.error('verify:ledger:schema FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:ledger:schema PASSED');
