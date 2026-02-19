#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { E137_ROOT, REASON, writeMd } from './e137_lib.mjs';

function getArchiveArg() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--archive');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  if (args[0] && !args[0].startsWith('--')) return args[0];
  return process.env.E137_IMPORT_ARCHIVE || '';
}

export function runImport() {
  const archive = getArchiveArg();
  if (!archive) {
    writeMd(path.join(E137_ROOT, 'IMPORT_REPORT.md'), [
      '# E137 IMPORT REPORT',
      '- status: SKIPPED',
      `- reason_code: ${REASON.SKIP_IMPORT_NOT_REQUESTED}`,
      'Declare: import verification needs an archive path.',
      'Verify: checked argv/env E137_IMPORT_ARCHIVE.',
      'If mismatch: pass --archive <path> and rerun verify:e137:import.',
    ].join('\n'));
    return { ec: 0, reasonCode: REASON.SKIP_IMPORT_NOT_REQUESTED };
  }

  if (!fs.existsSync(archive)) {
    writeMd(path.join(E137_ROOT, 'IMPORT_REPORT.md'), `# E137 IMPORT REPORT\n- status: FAIL\n- reason_code: ${REASON.FAIL_IMPORT_STRUCTURE}\n- detail: archive_missing`);
    return { ec: 1, reasonCode: REASON.FAIL_IMPORT_STRUCTURE };
  }

  const receipt = path.join(E137_ROOT, 'EXPORT_RECEIPT.md');
  const expected = fs.existsSync(receipt) ? (/archive_sha256:\s*([a-f0-9]{64})/.exec(fs.readFileSync(receipt, 'utf8')) || [])[1] : '';
  const actual = sha256File(archive);
  let reason = REASON.OK;
  if (expected && expected !== actual) reason = REASON.FAIL_SHA_MISMATCH;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e137-import-'));
  const untar = spawnSync('tar', ['xzf', path.resolve(archive), '-C', tempDir], { encoding: 'utf8' });
  if ((untar.status ?? 1) !== 0) reason = REASON.FAIL_IMPORT_STRUCTURE;

  const unpackedRoot = path.join(tempDir, 'reports/evidence/E137');
  if (!fs.existsSync(unpackedRoot)) reason = REASON.FAIL_IMPORT_STRUCTURE;

  let mdOnly = true;
  let sumsOk = true;
  if (fs.existsSync(unpackedRoot)) {
    for (const f of fs.readdirSync(unpackedRoot)) {
      if (!f.endsWith('.md')) mdOnly = false;
    }
    const sums = path.join(unpackedRoot, 'SHA256SUMS.md');
    if (!fs.existsSync(sums)) {
      sumsOk = false;
    } else {
      const lines = fs.readFileSync(sums, 'utf8').split(/\r?\n/).filter((l) => /^[a-f0-9]{64}\s{2}/.test(l));
      for (const line of lines) {
        const [expected, rel] = line.split(/\s{2}/);
        const target = path.join(tempDir, rel);
        if (!fs.existsSync(target) || sha256File(target) !== expected) {
          sumsOk = false;
          break;
        }
      }
    }
  }

  if (!mdOnly) reason = REASON.FAIL_MD_ONLY;
  if (!sumsOk) reason = REASON.FAIL_SHA_MISMATCH;

  writeMd(path.join(E137_ROOT, 'IMPORT_REPORT.md'), [
    '# E137 IMPORT REPORT',
    `- status: ${reason === REASON.OK ? 'PASS' : 'FAIL'}`,
    `- reason_code: ${reason}`,
    `- archive_path: ${path.resolve(archive)}`,
    `- archive_sha256_actual: ${actual}`,
    `- archive_sha256_expected: ${expected || 'NOT_PROVIDED'}`,
    `- unpacked_root_exists: ${fs.existsSync(unpackedRoot)}`,
    `- unpacked_md_only: ${mdOnly}`,
    `- sha256sum_check: ${sumsOk}`,
    'Declare: imported archive must preserve E137 contracts and integrity.',
    'Verify: tar extract + md-only scan + sha256sum -c of unpacked SHA256SUMS.md.',
    'If mismatch: rebuild archive with verify:e137:export then retry import.',
  ].join('\n'));

  return { ec: reason === REASON.OK ? 0 : 1, reasonCode: reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runImport();
  process.exit(r.ec);
}
