#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE132, isCITruthy, snapshotState, writeMdAtomic } from './e132_lib.mjs';

enforceCIBoundaryE132();
const update = process.env.UPDATE_E132_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E132_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/E132_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const gitBefore = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const run = spawnSync('node', ['scripts/verify/e132_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((run.status ?? 1) !== 0) {
  if (update) {
    const after = snapshotState(protectedPaths);
    writeMdAtomic('reports/evidence/E132/ZERO_WRITES_ON_FAIL.md', ['# E132 ZERO WRITES ON FAIL', `- status: ${before === after ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`].join('\n'));
  }
  process.exit(run.status ?? 1);
}
const gitAfter = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && gitBefore !== gitAfter) throw new Error('E132_READ_ONLY_VIOLATION');
