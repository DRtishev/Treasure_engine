#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const update = process.env.UPDATE_E74_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E74_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function run(name, cmd, env) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) throw new Error(`verify:e74 failed at ${name}`);
}

const env = { ...process.env, CHAIN_MODE: chainMode, TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000', SEED: String(process.env.SEED || '12345') };
const before = gitStatus();

if (chainMode === 'FULL') {
  run('verify:e73', ['npm', 'run', '-s', 'verify:e73'], { ...env, CI: 'true' });
}

run('verify:wow', ['npm', 'run', '-s', 'verify:wow'], env);
run('verify:wow:usage', ['npm', 'run', '-s', 'verify:wow:usage'], env);
run('verify:contract:snapshots', ['node', 'scripts/verify/e74_contract_snapshots.mjs'], env);
run('verify:contract:court:selftest', ['node', 'scripts/verify/e74_contract_court.mjs'], env);
run('verify:edge:contract:x2', ['node', 'scripts/verify/e74_edge_contract_x2.mjs'], env);
run('verify:e74:evidence', ['node', 'scripts/verify/e74_evidence.mjs'], env);

const after = gitStatus();
if (before !== after && process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
if (before !== after && !update) throw new Error('READ_ONLY_VIOLATION');

console.log(`verify:e74 PASSED chain_mode=${chainMode}`);
