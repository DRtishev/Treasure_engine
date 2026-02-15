#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const update = process.env.UPDATE_E77_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || (process.env.CI === 'true' ? 'FAST_PLUS' : 'FAST_PLUS')).toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if (process.env.CI === 'true' && (update || process.env.UPDATE_E77_CALIBRATION === '1')) throw new Error('UPDATE_E77 flags forbidden in CI');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_') || k === 'ENABLE_DEMO_ADAPTER' || k === 'ALLOW_MANUAL_RECON') && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') throw new Error(`${k} forbidden when CI=true`);
}

function run(name, cmd, env) { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env }); if ((r.status ?? 1) !== 0) throw new Error(`verify:e77 failed at ${name}`); }
function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftAllowed(before, after) { const b = parseMap(before), a = parseMap(after), ch = []; for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r); for (const r of b.keys()) if (!a.has(r)) ch.push(r); return ch.every((r) => r.startsWith('reports/evidence/E77/') || r.startsWith('core/edge/calibration/') || r.startsWith('docs/wow/')); }
function scrub(env) { const c = { ...env }; for (const k of Object.keys(c)) if (k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) delete c[k]; return c; }

const env = { ...process.env, CHAIN_MODE: chainMode, TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000', SEED: String(process.env.SEED || '12345') };
const ciEnv = { ...scrub(env), CI: 'true' };
const before = gitStatus();

if (chainMode === 'FULL') {
  run('verify:e76', ['npm', 'run', '-s', 'verify:e76'], ciEnv);
} else if (chainMode === 'FAST_PLUS') {
  for (const s of ['E66', 'E67', 'E68', 'E69', 'E70', 'E71', 'E72', 'E73', 'E74', 'E75', 'E76']) run(`verify:${s}:pack-static`, ['bash', '-lc', `grep -E 'canonical_fingerprint' reports/evidence/${s}/CLOSEOUT.md reports/evidence/${s}/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/${s}/SHA256SUMS.md | sha256sum -c - >/dev/null`], ciEnv);
  run('recon-multi-core', ['node', 'core/edge/e77_recon_multi.mjs'], env);
  run('canary-core', ['node', 'scripts/edge/e77_canary_eval.mjs'], env);
} else {
  for (const s of ['E74', 'E75', 'E76']) run(`verify:${s}:pack-static`, ['bash', '-lc', `grep -E 'canonical_fingerprint' reports/evidence/${s}/CLOSEOUT.md reports/evidence/${s}/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/${s}/SHA256SUMS.md | sha256sum -c - >/dev/null`], ciEnv);
}

run('verify:wow', ['npm', 'run', '-s', 'verify:wow'], env);
run('verify:wow:usage', ['npm', 'run', '-s', 'verify:wow:usage'], { ...env, WOW_USED: 'W-0003,W-0015,W-0016' });
run('verify:e77:calibration:court', ['node', 'scripts/verify/e77_calibration_court.mjs'], env);
run('verify:edge:canary:x2', ['node', 'scripts/verify/e77_edge_canary_x2.mjs'], env);
run('verify:e77:evidence', ['node', 'scripts/verify/e77_evidence.mjs'], env);

const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftAllowed(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}
console.log(`verify:e77 PASSED chain_mode=${chainMode}`);
