#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E113_ROOT, enforceCIBoundaryE113, isCITruthy, modeE113, snapshotState, writeMdAtomic, cmdOut } from './e113_lib.mjs';

enforceCIBoundaryE113();
const update = process.env.UPDATE_E113_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E113_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const beforeProtected = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;

if (isCITruthy()) {
  const b = spawnSync('npm', ['run', '-s', 'verify:e112'], { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((b.status ?? 1) !== 0) throw new Error('E113_BASELINE_FAIL');
}

if (update && !isCITruthy()) {
  writeMdAtomic(path.join(E113_ROOT, 'PREFLIGHT.md'), [
    '# E113 PREFLIGHT',
    '- pwd: <REPO_ROOT>',
    `- branch: ${cmdOut('git', ['branch', '--show-current'])}`,
    `- head: ${cmdOut('git', ['rev-parse', 'HEAD'])}`,
    `- node: ${cmdOut('node', ['-v'])}`,
    `- npm: ${cmdOut('npm', ['-v'])}`,
    `- mode: ${modeE113()}`
  ].join('\n'));
}

try {
  const r = spawnSync('node', ['scripts/verify/e113_evidence.mjs'], { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error('E113_EVIDENCE_FAIL');
} catch (e) {
  const afterProtectedFail = snapshotState(protectedPaths);
  spawnSync('node', ['scripts/verify/e113_zero_writes_on_fail.mjs'], { stdio: 'inherit', env: { ...process.env, E113_FAILSTATE_BEFORE: beforeProtected, E113_FAILSTATE_AFTER: afterProtectedFail } });
  throw e;
}

const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E113_READ_ONLY_VIOLATION');
console.log('verify:e113 PASSED');
