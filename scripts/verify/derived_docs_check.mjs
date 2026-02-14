#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { readJson, renderKbPortal, renderWowCatalog, renderWowMatrix } from '../truth/derived_views.mjs';

const files = [
  ['docs/WOW_CATALOG.md', () => renderWowCatalog(readJson('specs/wow/WOW_LEDGER.json'))],
  ['docs/STAGE2_IMPLEMENTATION_MATRIX.md', () => renderWowMatrix(readJson('specs/wow/WOW_LEDGER.json'))],
  ['kb/INDEX.md', () => renderKbPortal()]
];

const errors = [];
const manifest = [];
for (const [file, build] of files) {
  const expected = build();
  const actual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (actual !== expected) errors.push(`${file} drift detected; run derivation scripts`);
  manifest.push({
    file,
    sha256: crypto.createHash('sha256').update(expected).digest('hex')
  });
}

if (errors.length) {
  console.error('verify:derived FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('verify:derived PASSED');
console.log(JSON.stringify({ files: manifest }, null, 2));
