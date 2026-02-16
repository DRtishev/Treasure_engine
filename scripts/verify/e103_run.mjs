#!/usr/bin/env node
// E103 Orchestrator - Close The Skips
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { E103_ROOT, ensureDir, isQuiet, minimalLog } from './e103_lib.mjs';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { checkKillLock, enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';

const update = process.env.UPDATE_E103_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || (isCIMode() ? 'FAST_PLUS' : 'FAST_PLUS')).toUpperCase();
const bootstrapNoGit = process.env.BOOTSTRAP_NO_GIT === '1';

if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) {
  throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
}

// E103: CI truthiness enforcement
forbidEnvInCI();

// Bootstrap NO-GIT mode
const gitPresentFlag = gitPresent();
if (!gitPresentFlag && isCIMode() && !bootstrapNoGit) {
  throw new Error('NO_GIT_IN_CI: .git missing and CI is truthy (security boundary)');
}

if (!gitPresentFlag && !bootstrapNoGit) {
  console.warn('WARNING: .git not found, set BOOTSTRAP_NO_GIT=1 to proceed');
  process.exit(1);
}

// Kill-lock management
clearKillLock('E103', 'CLEAR_E103_KILL_LOCK');
enforceNoKillLock('E103');

function run(name, cmd, env, critical = true) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    if (critical) armKillLock('E103', `critical_failure:${name}`);
    throw new Error(`verify:e103 failed at ${name}`);
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

const pre = [
  '# E103 PREFLIGHT',
  `- pwd: ${repoRootPlaceholder()}`,
  `- branch: ${gitBranch()}`,
  `- head: ${gitHead()}`,
  `- node: ${nodeVersion}`,
  `- npm: ${npmVersion}`,
  `- git_present: ${gitPresentFlag}`,
  `- bootstrap_no_git: ${bootstrapNoGit}`,
  '- git_status_sb:',
  '```',
  gitPresentFlag ? gitStatusShort() : 'NO_GIT',
  '```',
  `- env_CI: ${getCIModeString()}`
].join('\n');

ensureDir(E103_ROOT);
if (update && !isCIMode()) {
  writeMd(path.join(E103_ROOT, 'PREFLIGHT.md'), pre);
}

const before = gitPresent() ? gitStatusPorcelain() : '';

// Chain to E102 (dependency check)
if (chainMode === 'FULL') {
  run('verify:e102', ['npm', 'run', '-s', 'verify:e102'], { ...env, CI: 'true' });
} else {
  // FAST_PLUS: quick check
  run('verify:e102:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E102/CLOSEOUT.md reports/evidence/E102/VERDICT.md >/dev/null"
  ], { ...env, CI: 'true' });
}

// Core contracts (reused from E101)
run('case-collision', ['node', 'scripts/verify/e101_case_collision_contract.mjs'], env, false);
run('path-invariance', ['node', 'scripts/verify/e101_path_invariance_contract.mjs'], env, false);
run('eol-contract', ['node', 'scripts/verify/e101_eol_contract.mjs'], env, false);
run('node-truth', ['node', 'scripts/verify/e101_node_truth_contract.mjs'], env, false);
run('no-secrets', ['node', 'scripts/verify/e101_no_secrets_scan.mjs'], env, false);

// E103 Goals (execute only if update mode)
if (update && !isCIMode()) {
  run('goal1-fast-apply', ['node', 'scripts/verify/e103_goal1_fast_apply.mjs'], env, true);
  run('goal2-corruption-drill', ['node', 'scripts/verify/e103_goal2_corruption_drill.mjs'], env, true);
  run('goal3-seal-x2', ['node', 'scripts/verify/e103_goal3_seal_x2.mjs'], env, true);
  run('goal4-no-git-bootstrap', ['node', 'scripts/verify/e103_goal4_no_git_bootstrap.mjs'], env, true);
}

// Evidence generation
run('evidence', ['node', 'scripts/verify/e103_evidence.mjs'], env);

const after = gitPresent() ? gitStatusPorcelain() : '';

// Scope enforcement
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');

  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E103/') ||
    r.startsWith('reports/evidence/E101/') ||
    r.startsWith('scripts/verify/e103_') ||
    r.startsWith('scripts/verify/foundation_') ||
    r === '.foundation-seal/E103_KILL_LOCK.md' ||
    r === '.foundation-seal/E101_APPLY_JOURNAL.json' ||
    r === '.git__HIDDEN' ||
    r === 'package.json'
  );

  if (!allowed) {
    console.error('Scope violation detected. Changed files:');
    changed.forEach(f => console.error(`  - ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

minimalLog(`verify:e103 PASSED chain_mode=${chainMode} quiet=${isQuiet() ? '1' : '0'} git_present=${gitPresentFlag}`);
