#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { E140_ROOT, run, writeMd } from './e140_lib.mjs';

export function runExport() {
  fs.mkdirSync('artifacts/outgoing', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = path.resolve(`artifacts/outgoing/E140_evidence_${stamp}.tar.gz`);
  const tar = run('tar', ['czf', archive, 'reports/evidence/E140']);
  const ok = tar.ec === 0 && fs.existsSync(archive);
  const sha = ok ? sha256File(archive) : 'NA';
  writeMd(path.join(E140_ROOT, 'TRANSFER_EXPORT.md'), [
    '# E140 TRANSFER EXPORT',
    `- archive_path: ${ok ? archive : 'NOT_CREATED'}`,
    `- archive_sha256: ${sha}`,
    `- status: ${ok ? 'PASS' : 'FAIL'}`,
    '## RAW',
    `- tar_ec: ${tar.ec}`,
  ].join('\n'));
  return { ec: ok ? 0 : 1, archive, sha };
}

if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runExport().ec);
