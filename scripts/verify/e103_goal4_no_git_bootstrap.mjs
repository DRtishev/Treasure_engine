#!/usr/bin/env node
// E103-4: NO-GIT Bootstrap Full Test - Real Simulation
// Goal: Prove verification works without .git (portable zip scenario)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E103_ROOT, ensureDir } from './e103_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const update = process.env.UPDATE_E103_EVIDENCE === '1';

if (isCIMode() && update) {
  throw new Error('UPDATE_E103_EVIDENCE forbidden in CI');
}

if (!update) {
  console.log('e103:goal4_no_git_bootstrap SKIP (UPDATE_E103_EVIDENCE not set)');
  process.exit(0);
}

ensureDir(E103_ROOT);

const gitPath = path.resolve('.git');
const gitHiddenPath = path.resolve('.git__HIDDEN');

// Phase 1: Verify .git exists
if (!fs.existsSync(gitPath)) {
  throw new Error('Phase 1 FAILED: .git does not exist');
}

if (fs.existsSync(gitHiddenPath)) {
  throw new Error('Phase 1 FAILED: .git__HIDDEN already exists (cleanup needed)');
}

console.log('=== PHASE 1: Baseline with .git ===');
const phase1Env = {
  ...process.env,
  CI: 'false',
  CHAIN_MODE: 'FAST',
  QUIET: '1'
};
delete phase1Env.UPDATE_E103_EVIDENCE;

const phase1R = spawnSync('npm', ['run', '-s', 'verify:e101'], {
  stdio: 'pipe',
  env: phase1Env,
  encoding: 'utf8'
});

const phase1Pass = (phase1R.status ?? 1) === 0;
const phase1Stdout = phase1R.stdout || '';
const phase1Stderr = phase1R.stderr || '';

// Phase 2: Hide .git (simulate NO-GIT)
console.log('=== PHASE 2: Hide .git → .git__HIDDEN ===');
try {
  fs.renameSync(gitPath, gitHiddenPath);
} catch (err) {
  throw new Error(`Phase 2 FAILED: could not rename .git → .git__HIDDEN: ${err.message}`);
}

// Verify .git is gone
if (fs.existsSync(gitPath)) {
  // Restore before failing
  fs.renameSync(gitHiddenPath, gitPath);
  throw new Error('Phase 2 FAILED: .git still exists after rename');
}

// Phase 3: Run verification in NO-GIT mode
console.log('=== PHASE 3: Run verification with BOOTSTRAP_NO_GIT=1 ===');
const phase3Env = {
  ...process.env,
  CI: 'false',
  BOOTSTRAP_NO_GIT: '1',
  CHAIN_MODE: 'FAST',
  QUIET: '1'
};
delete phase3Env.UPDATE_E103_EVIDENCE;

const phase3R = spawnSync('npm', ['run', '-s', 'verify:e101'], {
  stdio: 'pipe',
  env: phase3Env,
  encoding: 'utf8'
});

const phase3Pass = (phase3R.status ?? 1) === 0;
const phase3Stdout = phase3R.stdout || '';
const phase3Stderr = phase3R.stderr || '';

// Phase 4: Restore .git
console.log('=== PHASE 4: Restore .git__HIDDEN → .git ===');
try {
  fs.renameSync(gitHiddenPath, gitPath);
} catch (err) {
  throw new Error(`Phase 4 FAILED: could not restore .git: ${err.message}`);
}

// Verify restoration
if (!fs.existsSync(gitPath)) {
  throw new Error('Phase 4 FAILED: .git not restored');
}

if (fs.existsSync(gitHiddenPath)) {
  throw new Error('Phase 4 FAILED: .git__HIDDEN still exists after restoration');
}

// Phase 5: Verify git still works
console.log('=== PHASE 5: Verify git works after restoration ===');
const phase5R = spawnSync('git', ['status', '--short'], {
  stdio: 'pipe',
  encoding: 'utf8'
});

const phase5Pass = (phase5R.status ?? 1) === 0;
const phase5Stdout = phase5R.stdout || '';

// Overall verification
const allPass = phase1Pass && phase3Pass && phase5Pass;

// Generate report
const report = [
  '# E103 GOAL 4: NO-GIT BOOTSTRAP',
  '',
  '## Phase 1: Baseline (with .git)',
  `- exit_code: ${phase1R.status ?? 1}`,
  `- pass: ${phase1Pass}`,
  `- stdout_sample: ${phase1Stdout.slice(0, 200)}`,
  '',
  '## Phase 2: Hide .git',
  `- renamed: .git → .git__HIDDEN`,
  `- git_exists_after: ${fs.existsSync('.git') ? 'YES (FAIL)' : 'NO (PASS)'}`,
  '',
  '## Phase 3: Verification in NO-GIT mode',
  `- env_BOOTSTRAP_NO_GIT: 1`,
  `- exit_code: ${phase3R.status ?? 1}`,
  `- pass: ${phase3Pass}`,
  `- stdout_sample: ${phase3Stdout.slice(0, 200)}`,
  '',
  '## Phase 4: Restore .git',
  `- renamed: .git__HIDDEN → .git`,
  `- git_exists_after: ${fs.existsSync('.git') ? 'YES (PASS)' : 'NO (FAIL)'}`,
  `- git_hidden_exists: ${fs.existsSync('.git__HIDDEN') ? 'YES (FAIL)' : 'NO (PASS)'}`,
  '',
  '## Phase 5: Git still works',
  `- git_status_exit: ${phase5R.status ?? 1}`,
  `- git_works: ${phase5Pass}`,
  '',
  '## Verification',
  `- phase1_pass: ${phase1Pass}`,
  `- phase3_pass: ${phase3Pass}`,
  `- phase5_pass: ${phase5Pass}`,
  `- all_phases_pass: ${allPass}`,
  '',
  '## Proof',
  '- Baseline works: ' + (phase1Pass ? 'YES' : 'NO'),
  '- NO-GIT mode works: ' + (phase3Pass ? 'YES' : 'NO'),
  '- Git restored: ' + (phase5Pass ? 'YES' : 'NO'),
  '- Portable zip simulation: ' + (allPass ? 'SUCCESS' : 'FAIL'),
  '',
  '## Verdict',
  `- overall: ${allPass ? 'PASS' : 'FAIL'}`
].join('\n');

writeMd(path.join(E103_ROOT, 'GOAL_4_NO_GIT_BOOTSTRAP.md'), report);

if (!allPass) {
  const failures = [];
  if (!phase1Pass) failures.push('phase1_baseline');
  if (!phase3Pass) failures.push('phase3_no_git');
  if (!phase5Pass) failures.push('phase5_restore');
  throw new Error(`NO-GIT Bootstrap FAILED: ${failures.join(', ')}`);
}

console.log('e103:goal4_no_git_bootstrap PASSED (all phases: baseline, NO-GIT, restore)');
