#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCIMode, forbidEnvInCI } from './foundation_ci.mjs';
import { E111_ROOT } from './e111_lib.mjs';

forbidEnvInCI();
if (isCIMode() && process.env.ENABLE_NET) throw new Error('ENABLE_NET forbidden in CI');

const update = process.env.UPDATE_E111_EVIDENCE === '1';
const before = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
fs.mkdirSync(E111_ROOT, { recursive: true });

if (update && !isCIMode()) {
  const pref = [
    '# E111 PREFLIGHT',
    `- node: ${spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- npm: ${spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim()}`,
    `- branch: ${spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim()}`,
    `- head: ${spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()}`,
    '- env: CI=false ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1'
  ].join('\n');
  fs.writeFileSync(path.join(E111_ROOT, 'PREFLIGHT.md'), pref);
}

const run = (cmd, critical = true) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, TZ: 'Europe/Amsterdam', LANG: 'C', LC_ALL: 'C' } });
  if ((r.status ?? 1) !== 0 && critical) throw new Error(`failed: ${cmd.join(' ')}`);
};

if (isCIMode()) run(['npm', 'run', '-s', 'verify:e110']);
run(['node', 'scripts/verify/e111_live_feed_isolation_contract.mjs']);
run(['node', 'scripts/verify/e111_evidence.mjs']);

const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout;
if (before !== after && (isCIMode() || !update)) throw new Error('READ_ONLY_VIOLATION');
console.log('verify:e111 PASSED');
