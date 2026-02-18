#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE117, isCITruthy, modeE117, snapshotState } from './e117_lib.mjs';

enforceCIBoundaryE117();
const update = process.env.UPDATE_E117_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E117_CI_UPDATE_REJECTED');
const mode = modeE117();
if (mode === 'ONLINE_REQUIRED' && process.env.ENABLE_NET !== '1') throw new Error('E117_ONLINE_REQUIRED_NEEDS_ENABLE_NET');
const protectedPaths = ['.foundation-seal/E117_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const run = spawnSync('node', ['scripts/verify/e117_evidence.mjs'], { stdio: 'inherit', env: { ...process.env, E117_FAILSTATE_BEFORE: before } });
if ((run.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  spawnSync('node', ['scripts/verify/e117_contracts_pack.mjs'], { stdio: 'inherit', env: { ...process.env, E117_FAILSTATE_AFTER: after } });
  process.exit(run.status ?? 1);
}
const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E117_READ_ONLY_VIOLATION');
console.log('verify:e117 PASSED');
