#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { enforceCIBoundaryE116, isCITruthy, modeE116, snapshotState, writeMdAtomic, E116_ROOT, cmdOut } from './e116_lib.mjs';

enforceCIBoundaryE116();
const update = process.env.UPDATE_E116_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E116_CI_UPDATE_REJECTED');
const mode = modeE116();
if (mode === 'ONLINE_REQUIRED' && process.env.ENABLE_NET !== '1') throw new Error('E116_ONLINE_REQUIRED_NEEDS_ENABLE_NET');

const protectedPaths = ['.foundation-seal/E116_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (isCITruthy()) {
  const r = spawnSync('npm', ['run', '-s', 'verify:e115'], { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error('E116_BASELINE_FAIL');
}
if (update && !isCITruthy()) {
  writeMdAtomic(path.join(E116_ROOT, 'PREFLIGHT.md'), ['# E116 PREFLIGHT', '- pwd: <REPO_ROOT>', `- branch: ${cmdOut('git', ['branch', '--show-current'])}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD'])}`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- mode: ${mode}`].join('\n'));
}
try {
  const r = spawnSync('node', ['scripts/verify/e116_evidence.mjs'], { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error('E116_EVIDENCE_FAIL');
} catch (e) {
  const after = snapshotState(protectedPaths);
  spawnSync('node', ['scripts/contracts/e116_zero_writes_on_fail.mjs'], { stdio: 'inherit', env: { ...process.env, E116_FAILSTATE_BEFORE: before, E116_FAILSTATE_AFTER: after } });
  throw e;
}
const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E116_READ_ONLY_VIOLATION');
console.log('verify:e116 PASSED');
