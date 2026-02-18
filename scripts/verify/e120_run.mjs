#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE120, isCITruthy, modeE120, snapshotState, writeMdAtomic } from './e120_lib.mjs';

enforceCIBoundaryE120();
const update = process.env.UPDATE_E120_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E120_CI_UPDATE_REJECTED');
const mode = modeE120();
if (mode === 'ONLINE_REQUIRED' && process.env.ENABLE_NET !== '1') throw new Error('E120_ONLINE_REQUIRED_NEEDS_ENABLE_NET');
const protectedPaths = ['.foundation-seal/E120_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const r = spawnSync('node', ['scripts/verify/e120_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((r.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  const ok = before === after;
  writeMdAtomic('reports/evidence/E120/ZERO_WRITES_ON_FAIL.md', ['# E120 ZERO WRITES ON FAIL', `- status: ${ok ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`, '- fallback_ratio: 1.0000', '- freshness_ok: false'].join('\n'));
  process.exit(r.status ?? 1);
}
const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E120_READ_ONLY_VIOLATION');
