#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE122, isCITruthy, snapshotState, writeMdAtomic } from './e122_lib.mjs';
enforceCIBoundaryE122();
const update = process.env.UPDATE_E122_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E122_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/E122_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const r = spawnSync('node', ['scripts/verify/e122_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((r.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  const ok = before === after;
  writeMdAtomic('reports/evidence/E122/ZERO_WRITES_ON_FAIL.md', ['# E122 ZERO WRITES ON FAIL', `- status: ${ok ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`, '- fallback_ratio: 1.0000', '- freshness_ok: false'].join('\n'));
  process.exit(r.status ?? 1);
}
const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E122_READ_ONLY_VIOLATION');
