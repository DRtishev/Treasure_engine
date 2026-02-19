#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { ROOT, run, writeMd } from './e142m_lib.mjs';

export function runExport() {
  fs.mkdirSync('artifacts/outgoing', { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = path.resolve(`artifacts/outgoing/E142_MEGA_${ts}.tar.gz`);
  const tar = run('tar', ['czf', archive, 'reports/evidence/E142_MEGA']);
  const ok = tar.ec === 0 && fs.existsSync(archive);
  const sha = ok ? sha256File(archive) : 'NA';

  const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !['EXPORT_MANIFEST.md', 'EXPORT_RECEIPT.md', 'SHA256SUMS.md'].includes(f)).sort();
  writeMd(path.join(ROOT, 'EXPORT_MANIFEST.md'), [
    '# E142_MEGA EXPORT MANIFEST',
    '| file | sha256 |',
    '|---|---|',
    ...files.map((f) => `| ${f} | ${sha256File(path.join(ROOT, f))} |`),
    '## RAW',
    `- files_count: ${files.length}`,
  ].join('\n'));
  writeMd(path.join(ROOT, 'EXPORT_RECEIPT.md'), [
    '# E142_MEGA EXPORT RECEIPT',
    `- archive_path: ${ok ? archive : 'NOT_CREATED'}`,
    `- archive_sha256: ${sha}`,
    `- status: ${ok ? 'PASS' : 'FAIL'}`,
    '## RAW',
    `- tar_ec: ${tar.ec}`,
  ].join('\n'));
  return { ec: ok ? 0 : 1, archive, sha };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runExport().ec);
