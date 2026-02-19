#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE134, isCITruthy, snapshotState, writeMdAtomic, runDirE134 } from './e134_lib.mjs';

enforceCIBoundaryE134();
const update = process.env.UPDATE_E134_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E134_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger', 'reports/evidence/E134'];
const before = snapshotState(protectedPaths);
const gitBefore = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const run = spawnSync('node', ['scripts/verify/e134_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((run.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  writeMdAtomic(path.join(runDirE134(), 'ZERO_WRITES_ON_FAIL.md'), ['# E134 ZERO WRITES ON FAIL (RUN-SCOPED)', `- status: ${before === after ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`].join('\n'));
  process.exit(run.status ?? 1);
}
const gitAfter = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && gitBefore !== gitAfter) throw new Error('E134_READ_ONLY_VIOLATION');
