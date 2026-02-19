#!/usr/bin/env node
/**
 * E135 Export — generates EXPORT_MANIFEST.md and EXPORT_RECEIPT.md.
 * Does NOT commit archives. Optional local zip if artifacts/outgoing/ is writable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { E135_ROOT, writeMdAtomic } from './e135_lib.mjs';

export function runExport() {
  const files = fs.readdirSync(E135_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md' && f !== 'EXPORT_MANIFEST.md' && f !== 'EXPORT_RECEIPT.md')
    .sort();

  const manifestLines = [
    '# E135 EXPORT MANIFEST',
    `- generated: ${new Date().toISOString()}`,
    `- evidence_root: reports/evidence/E135`,
    '',
    '| file | sha256 | bytes |',
    '|---|---|---:|',
  ];

  for (const f of files) {
    const fp = path.join(E135_ROOT, f);
    const hash = sha256File(fp);
    const { size } = fs.statSync(fp);
    manifestLines.push(`| ${f} | ${hash} | ${size} |`);
  }

  // Optional archive
  let archivePath = 'NOT_CREATED';
  let archiveSha = 'N/A';
  const outDir = path.resolve('artifacts/outgoing');
  if (fs.existsSync(outDir)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `E135_evidence_${ts}.tar.gz`;
    const ap = path.join(outDir, archiveName);
    const res = spawnSync(
      'tar',
      ['czf', ap, '-C', 'reports/evidence', 'E135'],
      { encoding: 'utf8' },
    );
    if ((res.status ?? 1) === 0 && fs.existsSync(ap)) {
      archiveSha = sha256File(ap);
      archivePath = ap;
    }
  }

  manifestLines.push('');
  manifestLines.push(`- optional_archive: ${archivePath}`);
  manifestLines.push(`- archive_sha256: ${archiveSha}`);

  writeMdAtomic(path.join(E135_ROOT, 'EXPORT_MANIFEST.md'), manifestLines.join('\n'));

  const receiptLines = [
    '# E135 EXPORT RECEIPT',
    `- manifest_generated: YES`,
    `- archive_created: ${archivePath !== 'NOT_CREATED' ? 'YES' : 'NO'}`,
    `- archive_path: ${archivePath}`,
    `- archive_sha256: ${archiveSha}`,
    `- sha256_recorded: YES`,
  ];
  writeMdAtomic(path.join(E135_ROOT, 'EXPORT_RECEIPT.md'), receiptLines.join('\n'));

  return { archivePath, archiveSha };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runExport();
  process.stdout.write(`EXPORT_MANIFEST.md: written\narchive: ${r.archivePath}\n`);
}
