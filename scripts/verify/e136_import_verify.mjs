#!/usr/bin/env node
/**
 * E136 Import Verify — validates evidence on receiving machine.
 * Usage: node scripts/verify/e136_import_verify.mjs [--archive <path>]
 *
 * On the RECEIVING machine:
 *   1. Clone or copy reports/evidence/E136/ to the target workspace.
 *   2. Run: node scripts/verify/e136_import_verify.mjs
 *   3. Optionally verify archive: node scripts/verify/e136_import_verify.mjs --archive /path/to/E136_evidence_*.tar.gz
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { E136_ROOT, writeMdAtomic } from './e136_lib.mjs';

const args = process.argv.slice(2);
const archiveIdx = args.indexOf('--archive');
const archivePath = archiveIdx !== -1 ? args[archiveIdx + 1] : null;

const results = [];
let allOk = true;

function check(label, ok, detail) {
  results.push({ label, ok, detail });
  if (!ok) allOk = false;
}

// 1. SHA256SUMS check
const sumsPath = path.join(E136_ROOT, 'SHA256SUMS.md');
if (!fs.existsSync(sumsPath)) {
  check('sha256sums_exists', false, 'SHA256SUMS.md not found');
} else {
  const raw = fs.readFileSync(sumsPath, 'utf8');
  const rows = raw.split(/\r?\n/).filter((l) => /^[a-f0-9]{64}\s{2}/.test(l));
  let sumsFail = false;
  for (const line of rows) {
    const [expected, relPath] = line.split(/\s{2}/);
    const absPath = path.resolve(relPath);
    if (!fs.existsSync(absPath)) {
      check(`file_exists:${relPath}`, false, 'file missing');
      sumsFail = true;
    } else {
      const actual = sha256File(absPath);
      const ok = actual === expected;
      if (!ok) sumsFail = true;
      check(`sha256:${path.basename(relPath)}`, ok, ok ? 'MATCH' : `MISMATCH expected=${expected} got=${actual}`);
    }
  }
  if (!sumsFail) check('sha256sums_overall', true, `${rows.length} files verified`);
}

// 2. Archive verify (if provided)
if (archivePath) {
  if (!fs.existsSync(archivePath)) {
    check('archive_exists', false, `archive not found: ${archivePath}`);
  } else {
    // Read expected sha from EXPORT_RECEIPT.md
    const receiptPath = path.join(E136_ROOT, 'EXPORT_RECEIPT.md');
    if (fs.existsSync(receiptPath)) {
      const receipt = fs.readFileSync(receiptPath, 'utf8');
      const m = /archive_sha256:\s*([a-f0-9]{64})/.exec(receipt);
      if (m) {
        const actual = sha256File(archivePath);
        check('archive_sha256', actual === m[1], actual === m[1] ? 'MATCH' : `MISMATCH expected=${m[1]} got=${actual}`);
      } else {
        check('archive_sha_from_receipt', false, 'archive_sha256 not found in EXPORT_RECEIPT.md');
      }
    } else {
      check('export_receipt_exists', false, 'EXPORT_RECEIPT.md not found');
    }
  }
}

// 3. Manifest cross-check
const manifestPath = path.join(E136_ROOT, 'EXPORT_MANIFEST.md');
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const rows = manifest.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('| file') && !l.startsWith('|---'));
  for (const row of rows) {
    const parts = row.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const [file, sha] = parts;
    if (!/^[a-f0-9]{64}$/.test(sha)) continue;
    const fp = path.join(E136_ROOT, file);
    if (!fs.existsSync(fp)) {
      check(`manifest_file:${file}`, false, 'file listed in manifest but missing');
    } else {
      const actual = sha256File(fp);
      check(`manifest_sha:${file}`, actual === sha, actual === sha ? 'MATCH' : 'MISMATCH');
    }
  }
}

// Output
const passCnt = results.filter((r) => r.ok).length;
const failCnt = results.filter((r) => !r.ok).length;
const lines = [
  '# E136 IMPORT VERIFY',
  `- total_checks: ${results.length}`,
  `- passed: ${passCnt}`,
  `- failed: ${failCnt}`,
  `- status: ${allOk ? 'PASS' : 'FAIL'}`,
  '',
  '## Checks',
  ...results.map((r) => `- [${r.ok ? 'OK' : 'FAIL'}] ${r.label}: ${r.detail}`),
  '',
  '## Operator Runbook',
  '- To verify on another machine:',
  '  1. Copy reports/evidence/E136/ to target workspace',
  '  2. Run: node scripts/verify/e136_import_verify.mjs',
  '  3. If archive: node scripts/verify/e136_import_verify.mjs --archive /path/to/E136_evidence_*.tar.gz',
  '  4. Also: sha256sum -c reports/evidence/E136/SHA256SUMS.md',
];

process.stdout.write(`${lines.join('\n')}\n`);
if (process.env.E136_IMPORT_WRITE === '1') {
  writeMdAtomic(path.join(E136_ROOT, 'IMPORT_VERIFY.md'), lines.join('\n'));
}
process.exit(allOk ? 0 : 1);
