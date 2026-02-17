#!/usr/bin/env node
// E107 Run - Orchestrator for First Profit Loop
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { checkKillLock, enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';
import { writeMd } from './e66_lib.mjs';
import { E107_ROOT } from './e107_lib.mjs';

const update = process.env.UPDATE_E107_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || (isCIMode() ? 'FAST_PLUS' : 'FAST_PLUS')).toUpperCase();

if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) {
  throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
}

// CI hardening
forbidEnvInCI();

// Kill-lock management
clearKillLock('E107', 'CLEAR_E107_KILL_LOCK');
enforceNoKillLock('E107');

const env = {
  ...process.env,
  CHAIN_MODE: chainMode,
  TZ: 'UTC',
  LANG: 'C',
  LC_ALL: 'C',
  SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
  SEED: String(process.env.SEED || '12345')
};

function run(name, cmd, critical = true) {
  const result = spawnSync(cmd[0], cmd.slice(1), {
    stdio: 'inherit',
    env
  });

  if ((result.status ?? 1) !== 0) {
    if (critical) armKillLock('E107', `critical_failure:${name}`);
    throw new Error(`verify:e107 failed at ${name}`);
  }
}

// PREFLIGHT
const nodeVersion = spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim();
const npmVersion = spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim();

const pre = [
  '# E107 PREFLIGHT',
  `- pwd: ${repoRootPlaceholder()}`,
  `- branch: ${gitBranch()}`,
  `- head: ${gitHead()}`,
  `- node: ${nodeVersion}`,
  `- npm: ${npmVersion}`,
  `- git_present: ${gitPresent()}`,
  '- git_status_sb:',
  '```',
  gitPresent() ? gitStatusShort() : 'NO_GIT',
  '```',
  `- env_CI: ${getCIModeString()}`
].join('\n');

fs.mkdirSync(E107_ROOT, { recursive: true });
if (update && !isCIMode()) {
  writeMd(path.join(E107_ROOT, 'PREFLIGHT.md'), pre);
}

const before = gitPresent() ? gitStatusPorcelain() : '';

// Chain to E106 verification
if (chainMode === 'FULL') {
  run('verify:e106', ['npm', 'run', '-s', 'verify:e106']);
} else {
  // FAST_PLUS: quick check that E106 evidence exists
  run('verify:e106:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E106/CLOSEOUT.md reports/evidence/E106/VERDICT.md >/dev/null"
  ]);
}

// Run E107 contracts (non-critical)
run('no_net', ['node', 'scripts/verify/e107_no_net_in_tests_contract.mjs'], false);
run('profit_ledger', ['node', 'scripts/verify/e107_profit_ledger_contract.mjs'], false);
run('paper_live', ['node', 'scripts/verify/e107_paper_live_contract.mjs'], false);

// Run evidence generator (critical)
run('evidence', ['node', 'scripts/verify/e107_evidence.mjs']);

const after = gitPresent() ? gitStatusPorcelain() : '';

// Scope enforcement
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');

  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E107/') ||
    r.startsWith('scripts/verify/e107_') ||
    r.startsWith('core/profit/') ||
    r.startsWith('core/live/') ||
    r.startsWith('core/paper/paper_live_runner') ||
    r.startsWith('scripts/data/e107_') ||
    r.startsWith('scripts/report/e107_') ||
    r.startsWith('data/fixtures/e107/') ||
    r === '.foundation-seal/E107_KILL_LOCK.md' ||
    r === 'package.json'
  );

  if (!allowed) {
    console.error('Scope violation detected. Changed files:');
    changed.forEach(f => console.error(`  - ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

const quiet = process.env.QUIET === '1';
if (!quiet) {
  console.log(`verify:e107 PASSED chain_mode=${chainMode} git_present=${gitPresent()}`);
} else {
  console.log('verify:e107 PASSED');
}
