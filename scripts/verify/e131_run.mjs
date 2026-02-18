#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE131, isCITruthy, snapshotState, writeMdAtomic } from './e131_lib.mjs';

enforceCIBoundaryE131();
const update = process.env.UPDATE_E131_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E131_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/E131_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const gitBefore = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const run = spawnSync('node', ['scripts/verify/e131_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((run.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  writeMdAtomic('reports/evidence/E131/ZERO_WRITES_ON_FAIL.md', ['# E131 ZERO WRITES ON FAIL', `- status: ${before === after ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`].join('\n'));
  process.exit(run.status ?? 1);
}
const gitAfter = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && gitBefore !== gitAfter) throw new Error('E131_READ_ONLY_VIOLATION');
