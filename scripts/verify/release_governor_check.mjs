#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { EVIDENCE_ROOT, resolveEvidenceDir } from '../ops/evidence_helpers.mjs';

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
const errors = [];
for (let i = 1; i <= 58; i += 1) {
  const row = ledger.epochs?.[String(i)];
  if (!row) {
    errors.push(`missing epoch ${i}`);
    continue;
  }
  if (!['LEGACY_DONE', 'DONE', 'BLOCKED'].includes(row.stage)) errors.push(`epoch ${i} invalid stage`);
  if (row.stage === 'DONE' && !row.evidence_root) errors.push(`epoch ${i} missing evidence_root`);
}

const latest = process.env.EVIDENCE_DIR || resolveEvidenceDir();
if (!latest || !fs.existsSync(latest)) errors.push(`latest evidence missing under ${EVIDENCE_ROOT}`);
const required = ['PREFLIGHT.log', 'COMMANDS.log', 'SNAPSHOT.md', 'SUMMARY.md', 'VERDICT.md', 'SHA256SUMS.EVIDENCE', 'pack_index.json'];
if (latest && fs.existsSync(latest)) {
  for (const f of required) if (!fs.existsSync(path.join(latest, f))) errors.push(`latest evidence missing ${f}`);
}

if (errors.length) {
  console.error('verify:release-governor FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:release-governor PASSED');
