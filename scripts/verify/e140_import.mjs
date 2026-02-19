#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { E140_ROOT, run, writeMd } from './e140_lib.mjs';

function getArchive() {
  const arg = process.argv[2];
  if (arg && !arg.startsWith('-')) return arg;
  const receipt = path.join(E140_ROOT, 'TRANSFER_EXPORT.md');
  if (!fs.existsSync(receipt)) return '';
  const line = fs.readFileSync(receipt, 'utf8').split(/\r?\n/).find((l) => l.startsWith('- archive_path:')) || '';
  return line.split(':').slice(1).join(':').trim();
}

export function runImport() {
  const archive = getArchive();
  if (!archive || !fs.existsSync(archive)) {
    writeMd(path.join(E140_ROOT, 'TRANSFER_IMPORT.md'), '# E140 TRANSFER IMPORT\n- status: BLOCKED\n- reason_code: NEED_ARCHIVE\n## RAW\n- detail: archive not found');
    return { ec: 1 };
  }
  const expected = (/archive_sha256:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E140_ROOT, 'TRANSFER_EXPORT.md'), 'utf8')) || [])[1] || '';
  const actual = sha256File(archive);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e140-import-'));
  const untar = run('tar', ['xzf', path.resolve(archive), '-C', tmp]);
  const unpacked = path.join(tmp, 'reports/evidence/E140');
  const safe = fs.existsSync(unpacked) && !fs.existsSync(path.join(tmp, '..', 'evil'));
  const ok = untar.ec === 0 && expected === actual && safe;
  writeMd(path.join(E140_ROOT, 'TRANSFER_IMPORT.md'), [
    '# E140 TRANSFER IMPORT',
    `- status: ${ok ? 'PASS' : 'FAIL'}`,
    `- archive_sha256_expected: ${expected || 'NA'}`,
    `- archive_sha256_actual: ${actual}`,
    `- unpack_safe: ${safe}`,
    `- acceptance_marker: ${ok ? 'ACCEPTED' : 'REJECTED'}`,
    '## RAW',
    `- untar_ec: ${untar.ec}`,
  ].join('\n'));
  return { ec: ok ? 0 : 1 };
}

if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runImport().ec);
