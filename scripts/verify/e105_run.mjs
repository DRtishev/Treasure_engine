#!/usr/bin/env node
// E105 Orchestrator - Foundation Adoption + Speed Budget Endgame
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { E105_ROOT, ensureDir, isQuiet, minimalLog } from './e105_lib.mjs';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { checkKillLock, enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';

const update = process.env.UPDATE_E105_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || (isCIMode() ? 'FAST_PLUS' : 'FAST_PLUS')).toUpperCase();

if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) {
  throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
}

// E105: CI truthiness enforcement
forbidEnvInCI();

// Kill-lock management
clearKillLock('E105', 'CLEAR_E105_KILL_LOCK');
enforceNoKillLock('E105');

function run(name, cmd, env, critical = true) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    if (critical) armKillLock('E105', `critical_failure:${name}`);
    throw new Error(`verify:e105 failed at ${name}`);
  }
}

const env = {
  ...process.env,
  CHAIN_MODE: chainMode,
  TZ: 'UTC',
  LANG: 'C',
  LC_ALL: 'C',
  SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
  SEED: String(process.env.SEED || '12345')
};

// PREFLIGHT
const nodeVersion = spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim();
const npmVersion = spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim();
const osInfo = spawnSync('uname', ['-a'], { encoding: 'utf8' }).stdout.trim();

const pre = [
  '# E105 PREFLIGHT',
  `- pwd: ${repoRootPlaceholder()}`,
  `- branch: ${gitBranch()}`,
  `- head: ${gitHead()}`,
  `- node: ${nodeVersion}`,
  `- npm: ${npmVersion}`,
  `- os: ${osInfo}`,
  `- git_present: ${gitPresent()}`,
  '- git_status_sb:',
  '```',
  gitPresent() ? gitStatusShort() : 'NO_GIT',
  '```',
  `- env_CI: ${getCIModeString()}`
].join('\n');

ensureDir(E105_ROOT);
if (update && !isCIMode()) {
  writeMd(path.join(E105_ROOT, 'PREFLIGHT.md'), pre);
}

const before = gitPresent() ? gitStatusPorcelain() : '';

// Chain to E104 (dependency check)
if (chainMode === 'FULL') {
  run('verify:e104', ['npm', 'run', '-s', 'verify:e104'], { ...env, CI: 'true' });
} else {
  // FAST_PLUS: quick check
  run('verify:e104:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E104/CLOSEOUT.md reports/evidence/E104/VERDICT.md >/dev/null"
  ], { ...env, CI: 'true' });
}

// E105 Contracts (reuse E104 contracts)
// Porcelain contract
run('porcelain-contract', ['node', 'scripts/verify/e104_porcelain_contract.mjs'], env, false);

// Dep cycle contract
run('dep-cycle-contract', ['node', 'scripts/verify/e104_dep_cycle_contract.mjs'], env, false);

// Evidence generation
run('evidence', ['node', 'scripts/verify/e105_evidence.mjs'], env);

const after = gitPresent() ? gitStatusPorcelain() : '';

// Scope enforcement
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');

  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E105/') ||
    r.startsWith('scripts/verify/e105_') ||
    r.startsWith('scripts/verify/e97_') ||
    r.startsWith('scripts/verify/e100_') ||
    r === '.foundation-seal/E105_KILL_LOCK.md' ||
    r === 'package.json'
  );

  if (!allowed) {
    console.error('Scope violation detected. Changed files:');
    changed.forEach(f => console.error(`  - ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

minimalLog(`verify:e105 PASSED chain_mode=${chainMode} quiet=${isQuiet() ? '1' : '0'} git_present=${gitPresent()}`);
