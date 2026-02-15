#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const update = process.env.UPDATE_E75_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E75_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftOnlyAllowed(before, after) {
  const b = parseMap(before), a = parseMap(after), ch = [];
  for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r);
  for (const r of b.keys()) if (!a.has(r)) ch.push(r);
  return ch.every((r) => r.startsWith('reports/evidence/E75/'));
}
function scrub(env) { const c = { ...env }; for (const k of Object.keys(c)) if (k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) delete c[k]; return c; }
function runStep(name, cmd, env) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) throw new Error(`verify:e75 failed at ${name}`);
}

const env = { ...process.env, CHAIN_MODE: chainMode, TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000', SEED: String(process.env.SEED || '12345') };
const ciEnv = { ...scrub(env), CI: 'true' };
const before = gitStatus();

if (chainMode === 'FULL') {
  runStep('verify:e74', ['npm', 'run', '-s', 'verify:e74'], ciEnv);
} else if (chainMode === 'FAST_PLUS') {
  for (const s of ['E66', 'E67', 'E68', 'E69', 'E70', 'E71', 'E72', 'E73', 'E74']) {
    runStep(`verify:${s}:pack-static`, ['bash', '-lc', `grep -E 'canonical_fingerprint' reports/evidence/${s}/CLOSEOUT.md reports/evidence/${s}/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/${s}/SHA256SUMS.md | sha256sum -c - >/dev/null`], ciEnv);
  }
} else {
  for (const s of ['E72', 'E73', 'E74']) {
    runStep(`verify:${s}:pack-static`, ['bash', '-lc', `grep -E 'canonical_fingerprint' reports/evidence/${s}/CLOSEOUT.md reports/evidence/${s}/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/${s}/SHA256SUMS.md | sha256sum -c - >/dev/null`], ciEnv);
  }
}

runStep('verify:e75:profit:harness', ['node', 'scripts/verify/e75_profit_harness_check.mjs'], env);
runStep('verify:edge:profit:x2', ['node', 'scripts/verify/e75_edge_profit_x2.mjs'], env);
runStep('verify:e75:evidence', ['node', 'scripts/verify/e75_evidence.mjs'], env);

const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyAllowed(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log(`verify:e75 PASSED chain_mode=${chainMode}`);
