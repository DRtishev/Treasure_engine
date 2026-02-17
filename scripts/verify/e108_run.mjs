#!/usr/bin/env node
// E108 Run - Orchestrator for Edge Factory
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';
import { writeMd } from './e66_lib.mjs';
import { E108_ROOT } from './e108_lib.mjs';

const update = process.env.UPDATE_E108_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');

forbidEnvInCI();
clearKillLock('E108', 'CLEAR_E108_KILL_LOCK');
enforceNoKillLock('E108');

const env = { ...process.env, CHAIN_MODE: chainMode, TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000' };

function run(name, cmd, critical = true) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    if (critical) armKillLock('E108', `critical_failure:${name}`);
    throw new Error(`verify:e108 failed at ${name}`);
  }
}

// PREFLIGHT
fs.mkdirSync(E108_ROOT, { recursive: true });
if (update && !isCIMode()) {
  writeMd(path.join(E108_ROOT, 'PREFLIGHT.md'), [
    '# E108 PREFLIGHT',
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

// Chain to E107
if (chainMode === 'FULL') {
  run('verify:e107', ['npm', 'run', '-s', 'verify:e107']);
} else {
  run('verify:e107:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E107/CLOSEOUT.md reports/evidence/E107/VERDICT.md >/dev/null"
  ]);
}

// Contracts (non-critical)
run('no_lookahead', ['node', 'scripts/verify/e108_no_lookahead_contract.mjs'], false);
run('determinism_x2', ['node', 'scripts/verify/e108_backtest_determinism_x2_contract.mjs'], false);

// Evidence (critical)
run('evidence', ['node', 'scripts/verify/e108_evidence.mjs']);

const after = gitPresent() ? gitStatusPorcelain() : '';
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E108/') ||
    r.startsWith('scripts/verify/e108_') ||
    r.startsWith('core/edge/strategy_interface') ||
    r.startsWith('core/edge/strategies/') ||
    r.startsWith('core/backtest/') ||
    r.startsWith('core/wfo/') ||
    r.startsWith('core/gates/') ||
    r.startsWith('scripts/edge/e108_') ||
    r.startsWith('scripts/backtest/e108_') ||
    r.startsWith('scripts/wfo/e108_') ||
    r.startsWith('scripts/paper/e108_') ||
    r.startsWith('scripts/gates/e108_') ||
    r.startsWith('scripts/data/e108_') ||
    r.startsWith('data/fixtures/e108/') ||
    r === '.foundation-seal/E108_KILL_LOCK.md' ||
    r === 'package.json'
  );
  if (!allowed) {
    changed.forEach(f => console.error(`  scope violation: ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

console.log('verify:e108 PASSED');
