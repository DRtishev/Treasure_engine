#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { FINAL_ROOT, run, writeMd } from './e142m_lib.mjs';

function archiveFromArg() {
  const i = process.argv.indexOf('--archive');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const receipt = path.join(FINAL_ROOT, 'TRANSFER_EXPORT.md');
  if (!fs.existsSync(receipt)) return '';
  const line = fs.readFileSync(receipt, 'utf8').split(/\r?\n/).find((l) => l.startsWith('- archive_path:')) || '';
  return line.split(':').slice(1).join(':').trim();
}

export function runImport() {
  const archive = archiveFromArg();
  if (!archive || !fs.existsSync(archive)) {
    writeMd(path.join(FINAL_ROOT, 'TRANSFER_IMPORT.md'), '# FINAL_MEGA TRANSFER IMPORT\n- status: FAIL\n- reason_code: ARCHIVE_MISSING\n## RAW\n- detail: missing archive');
    writeMd(path.join(FINAL_ROOT, 'ACCEPTED.md'), '# FINAL_MEGA ACCEPTED\n- status: REJECTED\n## RAW\n- reason: missing archive');
    return { ec: 1 };
  }
  const expectedLine = fs.readFileSync(path.join(FINAL_ROOT, 'TRANSFER_EXPORT.md'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('- archive_sha256:')) || '';
  const expected = expectedLine.split(':').slice(1).join(':').trim();
  const actual = sha256File(archive);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'final-mega-'));
  const untar = run('tar', ['xzf', path.resolve(archive), '-C', tmp]);
  const unpackFinal = path.join(tmp, 'reports/evidence/FINAL_MEGA');
  const mdOnly = fs.existsSync(unpackFinal) && fs.readdirSync(unpackFinal).every((f) => f.endsWith('.md'));
  const ok = untar.ec === 0 && expected === actual && mdOnly;
  writeMd(path.join(FINAL_ROOT, 'TRANSFER_IMPORT.md'), [
    '# FINAL_MEGA TRANSFER IMPORT',
    `- status: ${ok ? 'PASS' : 'FAIL'}`,
    `- archive_sha256_expected: ${expected}`,
    `- archive_sha256_actual: ${actual}`,
    `- md_only_unpack: ${mdOnly}`,
    `- extract_dir: ${tmp}`,
    '## RAW',
    `- untar_ec: ${untar.ec}`,
  ].join('\n'));
  writeMd(path.join(FINAL_ROOT, 'ACCEPTED.md'), [
    '# FINAL_MEGA ACCEPTED',
    `- status: ${ok ? 'ACCEPTED' : 'REJECTED'}`,
    `- archive_sha256: ${actual}`,
    `- import_status: ${ok ? 'true' : 'false'}`,
    '## RAW',
    `- sha_match: ${expected === actual}`,
    `- md_only_unpack: ${mdOnly}`,
  ].join('\n'));
  return { ec: ok ? 0 : 1 };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runImport().ec);
