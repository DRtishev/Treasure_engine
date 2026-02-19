#!/usr/bin/env node
import path from 'node:path';
import { rewriteSums } from './foundation_sums.mjs';
import { FINAL_ROOT, fpDir, writeMd } from './e142m_lib.mjs';

export function runSeal() {
  const fp1 = fpDir(FINAL_ROOT);
  const fp2 = fpDir(FINAL_ROOT);
  const ok = fp1 === fp2;
  writeMd(path.join(FINAL_ROOT, 'SEAL_X2.md'), ['# FINAL_MEGA SEAL X2', `- fp1: ${fp1}`, `- fp2: ${fp2}`, `- status: ${ok ? 'PASS' : 'FAIL'}`, '- inputs: SNAPSHOT.md|DOCTOR_FAST_OUTPUT.md|TRUTH_CACHE_SPEC.md|TRUTH_CACHE_README.md|CAPSULE_INTEGRITY.md|PINNED_NODE_HEALTH.md|NET_CLASSIFICATION.md|BRIDGE_RUN.md|GATE_RUN.md|TRANSFER_EXPORT.md|TRANSFER_IMPORT.md|ACCEPTED.md|CONTRACTS.md|RUNBOOK.md|VERDICT.md', '## RAW', `- parity: ${ok}`].join('\n'));
  rewriteSums(FINAL_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  return { ec: ok ? 0 : 1 };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runSeal().ec);
