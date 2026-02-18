#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E112_ROOT, enforceCIBoundaryE112, isCITruthy, modeState, snapshotState, writeMdAtomic } from './e112_lib.mjs';

enforceCIBoundaryE112();
const update = process.env.UPDATE_E112_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E112_CI_UPDATE_REJECTED');

const protectedPaths = ['.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const beforeProtected = snapshotState(protectedPaths);

const run = (cmd) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, TZ: 'Europe/Amsterdam', LANG: 'C', LC_ALL: 'C' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E112_RUN_STEP_FAIL:${cmd.join(' ')}`);
};

if (isCITruthy()) run(['npm', 'run', '-s', 'verify:e111']);
fs.mkdirSync(E112_ROOT, { recursive: true });
if (update && !isCITruthy()) {
  writeMdAtomic(path.join(E112_ROOT, 'PREFLIGHT.md'), [
    '# E112 PREFLIGHT',
    `- pwd: <REPO_ROOT>`,
    `- branch: ${spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim()}`,
    `- head: ${spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()}`,
    `- node: ${spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- npm: ${spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- mode: ${modeState()}`
  ].join('\n'));
}

try {
  run(['node', 'scripts/verify/e112_evidence.mjs']);
} catch (e) {
  const afterProtected = snapshotState(protectedPaths);
  const zr = spawnSync('node', ['scripts/contracts/e112_zero_writes_on_fail.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, E112_FAILSTATE_BEFORE: beforeProtected, E112_FAILSTATE_AFTER: afterProtected }
  });
  if ((zr.status ?? 1) !== 0) {
    console.error('E112_ZERO_WRITES_CONTRACT_FAILED');
  }
  throw e;
}

const afterProtected = snapshotState(protectedPaths);
if (update === false && !isCITruthy()) {
  const before = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
  const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
  if (before !== after) throw new Error('E112_READ_ONLY_VIOLATION');
}
if (!afterProtected) throw new Error('E112_PROTECTED_STATE_EMPTY');
console.log('verify:e112 PASSED');
