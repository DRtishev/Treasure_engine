#!/usr/bin/env node
/**
 * E136 Export — deterministic EXPORT_MANIFEST.md + optional gitignored archive.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { E136_ROOT, writeMdAtomic } from './e136_lib.mjs';

export function runExport() {
  const excludeFromManifest = new Set(['SHA256SUMS.md', 'EXPORT_MANIFEST.md', 'EXPORT_RECEIPT.md']);
  const files = fs.readdirSync(E136_ROOT)
    .filter((f) => f.endsWith('.md') && !excludeFromManifest.has(f))
    .sort();

  const rows = files.map((f) => {
    const fp = path.join(E136_ROOT, f);
    return { file: f, sha256: sha256File(fp), bytes: fs.statSync(fp).size };
  });

  const manifestLines = [
    '# E136 EXPORT MANIFEST',
    `- evidence_root: reports/evidence/E136`,
    `- files_count: ${rows.length}`,
    '',
    '| file | sha256 | bytes |',
    '|---|---|---:|',
    ...rows.map((r) => `| ${r.file} | ${r.sha256} | ${r.bytes} |`),
  ];

  // Optional archive
  let archivePath = 'NOT_CREATED';
  let archiveSha = 'N/A';
  const outDir = path.resolve('artifacts/outgoing');
  if (fs.existsSync(outDir)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `E136_evidence_${ts}.tar.gz`;
    const ap = path.join(outDir, archiveName);
    const res = spawnSync('tar', ['czf', ap, '-C', 'reports/evidence', 'E136'], { encoding: 'utf8' });
    if ((res.status ?? 1) === 0 && fs.existsSync(ap)) {
      archiveSha = sha256File(ap);
      archivePath = ap;
    }
  }

  manifestLines.push('', `- optional_archive: ${archivePath}`, `- archive_sha256: ${archiveSha}`);
  writeMdAtomic(path.join(E136_ROOT, 'EXPORT_MANIFEST.md'), manifestLines.join('\n'));

  const receiptLines = [
    '# E136 EXPORT RECEIPT',
    `- manifest_generated: YES`,
    `- archive_created: ${archivePath !== 'NOT_CREATED' ? 'YES' : 'NO'}`,
    `- archive_path: ${archivePath}`,
    `- archive_sha256: ${archiveSha}`,
    `- sha256_recorded: YES`,
    `- node: ${process.version}`,
  ];
  writeMdAtomic(path.join(E136_ROOT, 'EXPORT_RECEIPT.md'), receiptLines.join('\n'));
  return { archivePath, archiveSha };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runExport();
  process.stdout.write(`EXPORT_MANIFEST.md: written\narchive: ${r.archivePath}\n`);
}
