#!/usr/bin/env node
import fs from 'node:fs';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

const errors = [];
const wow = readJson('specs/wow/WOW_LEDGER.json');
const shipped = (wow.items || []).filter((x) => x.status === 'SHIPPED');

for (const item of shipped) {
  const file = `reports/truth/passports/${item.id}.json`;
  if (!fs.existsSync(file)) { errors.push(`${item.id}: missing passport ${file}`); continue; }
  const passport = readJson(file);
  for (const e of passport.evidence || []) {
    if (!e.sha256_pack_index || !e.sha256_sums || !e.sha256_file) {
      errors.push(`${item.id}: incomplete evidence hash tuple for ${e.epoch}/${e.path}`);
      continue;
    }
    if (e.sha256_pack_index !== e.sha256_file) errors.push(`${item.id}: pack_index hash mismatch for ${e.path}`);
    if (e.sha256_sums !== e.sha256_file) errors.push(`${item.id}: SHA256SUMS mismatch for ${e.path}`);
  }
}

if (errors.length) {
  console.error('verify:passports FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`verify:passports PASSED (${shipped.length} shipped WOW passports)`);
