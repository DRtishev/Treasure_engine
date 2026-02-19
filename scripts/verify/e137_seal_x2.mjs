#!/usr/bin/env node
import path from 'node:path';
import { rewriteSums } from './foundation_sums.mjs';
import { E137_ROOT, evidenceFingerprintE137, writeMd } from './e137_lib.mjs';

export function runSealX2() {
  const fp1 = evidenceFingerprintE137();
  const fp2 = evidenceFingerprintE137();
  const ok = fp1 === fp2;
  writeMd(path.join(E137_ROOT, 'SEAL_X2.md'), [
    '# E137 SEAL X2',
    `- fp1: ${fp1}`,
    `- fp2: ${fp2}`,
    `- status: ${ok ? 'PASS' : 'FAIL'}`,
    `- reason_code: ${ok ? 'OK' : 'FAIL_SHA_MISMATCH'}`,
    'Declare: fingerprint must be stable across two independent reads.',
    'Verify: computed fp1/fp2 from deterministic include set.',
    'If mismatch: inspect mutable files and rerun full verify:e137.',
  ].join('\n'));
  rewriteSums(E137_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  return { ec: ok ? 0 : 1 };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runSealX2();
  process.exit(r.ec);
}
