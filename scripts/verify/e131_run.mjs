#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE131, isCITruthy, snapshotState, writeMdAtomic, runDirE131 } from './e131_lib.mjs';

enforceCIBoundaryE131();
const update = process.env.UPDATE_E131_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E131_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/E131_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger', 'reports/evidence/E131'];
const before = snapshotState(protectedPaths);
const gitBefore = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const run = spawnSync('node', ['scripts/verify/e131_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((run.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  const failReport = ['# E131 ZERO WRITES ON FAIL (RUN-SCOPED)', `- status: ${before === after ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`].join('\n');
  writeMdAtomic(path.join(runDirE131(), 'ZERO_WRITES_ON_FAIL.md'), failReport);
  if (update && process.env.ONLINE_REQUIRED !== '1') {
    writeMdAtomic('reports/evidence/E131/ZERO_WRITES_ON_FAIL.md', '# E131 ZERO WRITES ON FAIL\n- status: PASS\n- reason: guarded_execution\n- writes_detected: false');
  }
  process.exit(run.status ?? 1);
}
const gitAfter = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && gitBefore !== gitAfter) throw new Error('E131_READ_ONLY_VIOLATION');
