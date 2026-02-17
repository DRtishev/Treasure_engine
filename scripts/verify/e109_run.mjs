#!/usr/bin/env node
// E109 Run — Orchestrator for Reality Capsules + Execution Adapter + Micro-Live Pilot
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';
import { writeMd } from './e66_lib.mjs';
import { E109_ROOT } from './e109_lib.mjs';

const update = process.env.UPDATE_E109_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');

forbidEnvInCI();
clearKillLock('E109', 'CLEAR_E109_KILL_LOCK');
enforceNoKillLock('E109');

const env = { ...process.env, CHAIN_MODE: chainMode, TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000' };

function run(name, cmd, critical = true) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    if (critical) armKillLock('E109', `critical_failure:${name}`);
    throw new Error(`verify:e109 failed at ${name}`);
  }
}

// PREFLIGHT
fs.mkdirSync(E109_ROOT, { recursive: true });
if (update && !isCIMode()) {
  writeMd(path.join(E109_ROOT, 'PREFLIGHT.md'), [
    '# E109 PREFLIGHT',
    `- pwd: ${repoRootPlaceholder()}`,
    `- branch: ${gitBranch()}`,
    `- head: ${gitHead()}`,
    `- node: ${spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- npm: ${spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- git_present: ${gitPresent()}`,
    '- git_status_sb:',
    '```',
    gitPresent() ? gitStatusShort() : 'NO_GIT',
    '```',
    `- env_CI: ${getCIModeString()}`
  ].join('\n'));
}

const before = gitPresent() ? gitStatusPorcelain() : '';

// Chain to E108
if (chainMode === 'FULL') {
  run('verify:e108', ['npm', 'run', '-s', 'verify:e108']);
} else {
  run('verify:e108:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E108/CLOSEOUT.md reports/evidence/E108/VERDICT.md >/dev/null"
  ]);
}

// Contracts (non-critical)
run('data_quorum', ['node', 'scripts/verify/e109_data_quorum_contract.mjs'], false);
run('live_safety', ['node', 'scripts/verify/e109_live_safety_contract.mjs'], false);

// Evidence (critical)
run('evidence', ['node', 'scripts/verify/e109_evidence.mjs']);

const after = gitPresent() ? gitStatusPorcelain() : '';
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E109/') ||
    r.startsWith('scripts/verify/e109_') ||
    r.startsWith('core/live/') ||
    r.startsWith('scripts/data/e109_') ||
    r.startsWith('scripts/edge/e109_') ||
    r.startsWith('scripts/live/e109_') ||
    r.startsWith('data/capsules/') ||
    r === '.foundation-seal/E109_KILL_LOCK.md' ||
    r === 'package.json'
  );
  if (!allowed) {
    changed.forEach(f => console.error(`  scope violation: ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

console.log('verify:e109 PASSED');
