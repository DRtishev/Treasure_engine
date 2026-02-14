#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E66_ROOT, CAS_DIR, getTruthFiles, normalizeFile, sha256Text, sha256File, writeMd, ensureDir, ensureNoForbiddenUpdateInCI, ensureNonCIForUpdate, parseCasMd } from './e66_lib.mjs';

ensureNoForbiddenUpdateInCI('UPDATE_CAS');
ensureNonCIForUpdate('UPDATE_CAS');
const update = process.env.UPDATE_CAS === '1';
ensureDir(CAS_DIR);

if (update) {
  const rows = [];
  for (const file of getTruthFiles()) {
    const content = normalizeFile(file);
    const hash = sha256Text(content);
    const dest = path.join(CAS_DIR, `sha256-${hash}`);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, content);
    rows.push(`- ${file} -> cas://sha256:${hash}`);
  }
  writeMd(path.join(E66_ROOT, 'CAS.md'), `# E66 CAS\n\n${rows.join('\n')}`);
  console.log('verify:cas PASSED (UPDATED)');
  process.exit(0);
}

const expected = parseCasMd();
const errors = [];
for (const row of expected) {
  const file = row.path;
  if (!fs.existsSync(file)) {
    errors.push(`missing source ${file}`);
    continue;
  }
  const actualHash = sha256Text(normalizeFile(file));
  if (actualHash !== row.hash) errors.push(`cas drift ${file}: expected ${row.hash} got ${actualHash}`);
  const blob = path.join(CAS_DIR, `sha256-${row.hash}`);
  if (!fs.existsSync(blob)) errors.push(`missing blob ${blob}`);
  else if (sha256File(blob) !== row.hash) errors.push(`blob sha mismatch ${blob}`);
}

if (errors.length) {
  console.error('verify:cas FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:cas PASSED');
