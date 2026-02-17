#!/usr/bin/env node
// E106 Run - Orchestrator for all E106 contracts and evidence generation
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCIMode, forbidEnvInCI } from './foundation_ci.mjs';
import { enforceNoKillLock } from './foundation_lock.mjs';
import { writeMd } from './e66_lib.mjs';
import { E106_ROOT } from './e106_lib.mjs';

const update = process.env.UPDATE_E106_EVIDENCE === '1';
const KILL_LOCK_PATH = '.foundation-seal/E106_KILL_LOCK.md';

// CI hardening
forbidEnvInCI();

// Kill-lock enforcement
if (process.env.CLEAR_E106_KILL_LOCK === '1' && !isCIMode()) {
  fs.rmSync(KILL_LOCK_PATH, { force: true });
}
enforceNoKillLock(KILL_LOCK_PATH);

function run(name, cmd, critical = true) {
  const result = spawnSync(cmd[0], cmd.slice(1), {
    stdio: 'inherit',
    env: process.env
  });

  if ((result.status ?? 1) !== 0) {
    if (critical) {
      fs.mkdirSync(path.dirname(KILL_LOCK_PATH), { recursive: true });
      fs.writeFileSync(
        KILL_LOCK_PATH,
        `# E106 KILL LOCK\n- reason: critical_failure:${name}\n- clear: CLEAR_E106_KILL_LOCK=1\n`
      );
    }
    throw new Error(`verify:e106 failed at ${name}`);
  }
}

// PREFLIGHT
if (update && !isCIMode()) {
  const preflight = [
    '# E106 PREFLIGHT',
    '- pwd: <REPO_ROOT>',
    `- branch: ${spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim()}`,
    `- head: ${spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()}`,
    `- node: ${spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- npm: ${spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    '- git_status_sb:',
    '```',
    spawnSync('git', ['status', '-sb'], { encoding: 'utf8' }).stdout.trim(),
    '```',
    `- env_CI: ${String(process.env.CI || '')}`
  ].join('\n');

  fs.mkdirSync(E106_ROOT, { recursive: true });
  writeMd(path.join(E106_ROOT, 'PREFLIGHT.md'), preflight);
}

// Chain to E105 verification
run('e105', ['npm', 'run', '-s', 'verify:e105']);

// Run E106 contracts
run('porcelain', ['node', 'scripts/verify/e106_porcelain_contract.mjs'], false);
run('foundation_selftest', ['node', 'scripts/verify/e106_foundation_selftest.mjs'], false);
run('baseline_lock', ['node', 'scripts/verify/e106_baseline_lock.mjs'], false);

// Run evidence generator
run('evidence', ['node', 'scripts/verify/e106_evidence.mjs']);

console.log('verify:e106 PASSED');
