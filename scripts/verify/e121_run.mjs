#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE121, isCITruthy, snapshotState, writeMdAtomic } from './e121_lib.mjs';

enforceCIBoundaryE121();
const update = process.env.UPDATE_E121_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E121_CI_UPDATE_REJECTED');
const protectedPaths = ['.foundation-seal/E121_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const r = spawnSync('node', ['scripts/verify/e121_evidence.mjs'], { stdio: 'inherit', env: { ...process.env } });
if ((r.status ?? 1) !== 0) {
  const after = snapshotState(protectedPaths);
  const ok = before === after;
  writeMdAtomic('reports/evidence/E121/ZERO_WRITES_ON_FAIL.md', ['# E121 ZERO WRITES ON FAIL', `- status: ${ok ? 'PASS' : 'FAIL'}`, '- reason: orchestrator_fail_path', `- state_before: ${before}`, `- state_after: ${after}`, '- fallback_ratio: 1.0000', '- freshness_ok: false'].join('\n'));
  process.exit(r.status ?? 1);
}
const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E121_READ_ONLY_VIOLATION');
