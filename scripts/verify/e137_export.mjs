#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { E137_ROOT, REASON, writeMd } from './e137_lib.mjs';

export function runExport() {
  fs.mkdirSync('artifacts/outgoing', { recursive: true });
  const files = fs.readdirSync(E137_ROOT).filter((f) => f.endsWith('.md') && !['SHA256SUMS.md', 'EXPORT_MANIFEST.md', 'EXPORT_RECEIPT.md'].includes(f)).sort();
  const rows = files.map((f) => {
    const p = path.join(E137_ROOT, f);
    return { file: f, sha: sha256File(p), bytes: fs.statSync(p).size };
  });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = path.resolve(`artifacts/outgoing/E137_evidence_${ts}.tar.gz`);
  const tar = spawnSync('tar', ['czf', archive, 'reports/evidence/E137'], { encoding: 'utf8' });
  const ok = (tar.status ?? 1) === 0 && fs.existsSync(archive);
  const archiveSha = ok ? sha256File(archive) : 'N/A';

  writeMd(path.join(E137_ROOT, 'EXPORT_MANIFEST.md'), [
    '# E137 EXPORT MANIFEST',
    '- reason_code: OK',
    '| file | sha256 | bytes |',
    '|---|---|---:|',
    ...rows.map((r) => `| ${r.file} | ${r.sha} | ${r.bytes} |`),
  ].join('\n'));

  writeMd(path.join(E137_ROOT, 'EXPORT_RECEIPT.md'), [
    '# E137 EXPORT RECEIPT',
    `- reason_code: ${ok ? REASON.OK : REASON.FAIL_IMPORT_STRUCTURE}`,
    `- archive_path: ${ok ? archive : 'NOT_CREATED'}`,
    `- archive_sha256: ${archiveSha}`,
    `- timestamp_utc: ${new Date().toISOString()}`,
  ].join('\n'));

  return { ec: ok ? 0 : 1, archivePath: archive, archiveSha };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runExport();
  if (r.ec === 0) process.stdout.write(`${r.archivePath}\n`);
  process.exit(r.ec);
}
