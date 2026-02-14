#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CAS_DIR, E66_ROOT, getTruthFiles, normalizeFile, casPutFromText, casVerify, writeMd, ensureDir } from './e66_lib.mjs';

ensureDir(CAS_DIR);
const rows = [];
let failed = 0;
for (const file of getTruthFiles()) {
  const content = normalizeFile(file);
  const item = casPutFromText(content);
  const ok = casVerify(item.hash);
  if (!ok.ok) failed += 1;
  rows.push(`- ${file} -> ${item.uri} (${ok.ok ? 'OK' : `FAIL ${ok.reason}`})`);
}
writeMd(path.join(E66_ROOT, 'CAS.md'), `# E66 CAS\n\n${rows.join('\n')}`);
if (failed > 0) {
  console.error('verify:cas FAILED');
  process.exit(1);
}
console.log('verify:cas PASSED');
