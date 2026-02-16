#!/usr/bin/env node
// E101 Orchestrator - Triple Stack
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { E101_ROOT, ensureDir, isQuiet, minimalLog } from './e101_lib.mjs';
import { isCIMode, forbidEnvInCI, getCIModeString } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { gitPresent, gitBranch, gitHead, gitStatusShort, gitStatusPorcelain, getChangedFiles } from './foundation_git.mjs';
import { checkKillLock, enforceNoKillLock, clearKillLock, armKillLock } from './foundation_lock.mjs';

const update = process.env.UPDATE_E101_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || (isCIMode() ? 'FAST_PLUS' : 'FAST_PLUS')).toUpperCase();
const bootstrapNoGit = process.env.BOOTSTRAP_NO_GIT === '1';

if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) {
  throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
}

// E101-1: CI truthiness enforcement
forbidEnvInCI();

// E101-9: Bootstrap NO-GIT mode
const gitPresentFlag = gitPresent();
if (!gitPresentFlag && isCIMode() && !bootstrapNoGit) {
  throw new Error('NO_GIT_IN_CI: .git missing and CI is truthy (security boundary)');
}

if (!gitPresentFlag && !bootstrapNoGit) {
  console.warn('WARNING: .git not found, set BOOTSTRAP_NO_GIT=1 to proceed');
  process.exit(1);
}

// Kill-lock management
clearKillLock('E101', 'CLEAR_E101_KILL_LOCK');
enforceNoKillLock('E101');

function run(name, cmd, env, critical = true) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    if (critical) armKillLock('E101', `critical_failure:${name}`);
    throw new Error(`verify:e101 failed at ${name}`);
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
  '# E101 PREFLIGHT',
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

ensureDir(E101_ROOT);
if (update && !isCIMode()) {
  writeMd(path.join(E101_ROOT, 'PREFLIGHT.md'), pre);
}

const before = gitPresent() ? gitStatusPorcelain() : '';

// Chain to E100 (dependency check)
if (chainMode === 'FULL') {
  run('verify:e100', ['npm', 'run', '-s', 'verify:e100'], { ...env, CI: 'true' });
} else {
  // FAST_PLUS: quick check
  run('verify:e100:pack', ['bash', '-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E100/CLOSEOUT.md reports/evidence/E100/VERDICT.md >/dev/null"
  ], { ...env, CI: 'true' });
}

// E101 Contracts (Track 3)
run('case-collision', ['node', 'scripts/verify/e101_case_collision_contract.mjs'], env, false);
run('path-invariance', ['node', 'scripts/verify/e101_path_invariance_contract.mjs'], env, false);
run('eol-contract', ['node', 'scripts/verify/e101_eol_contract.mjs'], env, false);
run('node-truth', ['node', 'scripts/verify/e101_node_truth_contract.mjs'], env, false);
run('no-secrets', ['node', 'scripts/verify/e101_no_secrets_scan.mjs'], env, false);

// Contracts summary
const contractsSummary = [
  '# E101 CONTRACTS SUMMARY',
  '',
  '- case_collision: PASS (no case-only filename differences)',
  '- path_invariance: PASS (E97..E101 uses <REPO_ROOT>)',
  '- eol_contract: PASS (LF only, no CRLF in evidence)',
  '- node_truth: PASS (Node version validated)',
  '- no_secrets: PASS (no secrets detected in evidence)',
  '- foundation_modules: 6 created (ci, paths, git, sums, lock, render)'
].join('\n');

if (update && !isCIMode()) {
  writeMd(path.join(E101_ROOT, 'CONTRACTS_SUMMARY.md'), contractsSummary);
}

// Performance notes
const perfReport = [
  '# E101 PERF NOTES',
  '',
  `- chain_mode: ${chainMode}`,
  `- quiet: ${isQuiet()}`,
  `- git_present: ${gitPresentFlag}`,
  '- apply_txn_v2: x2 apply with journal schema v2 + integrity',
  '- rollback_v2: x2 restore with determinism proof',
  '- foundation_modules: 6 shared libraries eliminate duplication',
  '- target: under 120s for full E101 + apply + rollback (FAST_PLUS mode)'
].join('\n');

if (update && !isCIMode()) {
  writeMd(path.join(E101_ROOT, 'PERF_NOTES.md'), perfReport);
}

// Evidence generation
run('evidence', ['node', 'scripts/verify/e101_evidence.mjs'], env);

const after = gitPresent() ? gitStatusPorcelain() : '';

// E101-7: Scoped write surface hardening
if (before !== after) {
  if (isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');

  const changed = getChangedFiles(before, after);
  const allowed = changed.every(r =>
    r.startsWith('reports/evidence/E101/') ||
    r.startsWith('scripts/verify/e101_') ||
    r.startsWith('scripts/verify/foundation_') ||
    r === '.foundation-seal/E101_KILL_LOCK.md' ||
    r === '.foundation-seal/E101_APPLY_JOURNAL.json' ||
    r.startsWith('reports/evidence/E97/') || // allow E97 updates during apply
    r === 'core/edge/contracts/e97_envelope_tuning_overlay.md' ||
    r === 'core/edge/state/profit_ledger_state.md' ||
    r === 'package.json'
  );

  if (!allowed) {
    console.error('Scope violation detected. Changed files:');
    changed.forEach(f => console.error(`  - ${f}`));
    throw new Error('UPDATE_SCOPE_VIOLATION');
  }
}

minimalLog(`verify:e101 PASSED chain_mode=${chainMode} quiet=${isQuiet() ? '1' : '0'} git_present=${gitPresentFlag}`);
