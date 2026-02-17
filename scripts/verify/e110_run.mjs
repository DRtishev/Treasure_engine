#!/usr/bin/env node
// E110 Run — Orchestrator for Reality Quorum + Execution Gap + First Cashflow Experiment
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';
import { writeMd } from './e66_lib.mjs';
import { E110_ROOT } from './e110_lib.mjs';

const update = process.env.UPDATE_E110_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');

forbidEnvInCI();
clearKillLock('E110', 'CLEAR_E110_KILL_LOCK');
enforceNoKillLock('E110');

const env = { ...process.env, CHAIN_MODE: chainMode, TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000' };

function run(name, cmd, critical = true) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    if (critical) armKillLock('E110', `critical_failure:${name}`);
    throw new Error(`verify:e110 failed at ${name}`);
  }
}

// PREFLIGHT
fs.mkdirSync(E110_ROOT, { recursive: true });
if (update && !isCIMode()) {
  writeMd(path.join(E110_ROOT, 'PREFLIGHT.md'), [
    '# E110 PREFLIGHT',
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

// Chain to E109
if (chainMode === 'FULL') {
  run('verify:e109', ['npm', 'run', '-s', 'verify:e109']);
} else {
  run('verify:e109:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E109/CLOSEOUT.md reports/evidence/E109/VERDICT.md >/dev/null"
  ]);
}

// Contracts (non-critical)
run('data_quorum_v2', ['node', 'scripts/verify/e110_data_quorum_v2_contract.mjs'], false);
run('gap_contract', ['node', 'scripts/verify/e110_gap_contract.mjs'], false);

// Evidence (critical)
run('evidence', ['node', 'scripts/verify/e110_evidence.mjs']);

const after = gitPresent() ? gitStatusPorcelain() : '';
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E110/') ||
    r.startsWith('scripts/verify/e110_') ||
    r.startsWith('scripts/data/e110_') ||
    r.startsWith('scripts/edge/e110_') ||
    r.startsWith('data/capsules/E110/') ||
    r === '.foundation-seal/E110_KILL_LOCK.md' ||
    r === 'package.json'
  );
  if (!allowed) {
    changed.forEach(f => console.error(`  scope violation: ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

console.log('verify:e110 PASSED');
