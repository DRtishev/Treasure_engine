#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { FINAL_ROOT, run, writeMd } from './e142m_lib.mjs';

export function runExport() {
  fs.mkdirSync('artifacts/outgoing', { recursive: true });
  const archive = path.resolve('artifacts/outgoing/EVIDENCE.tar.gz');
  const tar = run('tar', ['czf', archive, 'reports/evidence/FINAL_MEGA', 'reports/evidence/E142_MEGA']);
  const ok = tar.ec === 0 && fs.existsSync(archive);
  const sha = ok ? sha256File(archive) : 'NA';

  const files = fs.existsSync(FINAL_ROOT) ? fs.readdirSync(FINAL_ROOT).filter((f) => f.endsWith('.md') && !['TRANSFER_EXPORT.md','SHA256SUMS.md'].includes(f)).sort() : [];
  writeMd(path.join(FINAL_ROOT, 'TRANSFER_EXPORT.md'), [
    '# FINAL_MEGA TRANSFER EXPORT',
    `- archive_path: ${ok ? archive : 'NOT_CREATED'}`,
    `- archive_sha256: ${sha}`,
    `- status: ${ok ? 'PASS' : 'FAIL'}`,
    '## RAW',
    `- tar_ec: ${tar.ec}`,
    `- files_count: ${files.length}`,
  ].join('\n'));
  return { ec: ok ? 0 : 1, archive, sha };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runExport().ec);
