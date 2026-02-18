#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE119, isCITruthy, modeE119, snapshotState } from './e119_lib.mjs';

enforceCIBoundaryE119();
const update = process.env.UPDATE_E119_EVIDENCE === '1';
if (update && isCITruthy()) throw new Error('E119_CI_UPDATE_REJECTED');
const mode = modeE119();
if (mode === 'ONLINE_REQUIRED' && process.env.ENABLE_NET !== '1') throw new Error('E119_ONLINE_REQUIRED_NEEDS_ENABLE_NET');
const protectedPaths = ['.foundation-seal/E119_INPUT_BINDING.json', '.foundation-seal/runs', '.foundation-seal/capsules', '.foundation-seal/overlay', '.foundation-seal/ledger'];
const before = snapshotState(protectedPaths);
const beforeGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
const r = spawnSync('node', ['scripts/verify/e119_evidence.mjs'], { stdio: 'inherit', env: { ...process.env, E119_FAILSTATE_BEFORE: before } });
if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
const afterGit = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (!update && beforeGit !== afterGit) throw new Error('E119_READ_ONLY_VIOLATION');
