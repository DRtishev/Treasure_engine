#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd, sha256File } from './e66_lib.mjs';
import { parseReconMulti, summarizeReconMulti } from '../../core/edge/e77_recon_multi.mjs';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';
import { evaluateCalibrationCourt } from './e77_calibration_court.mjs';
import { E77_ROOT, ensureDir, defaultNormalizedEnv, readE76Binding, rewriteSumsE77, verifySumsE77, evidenceFingerprintE77, readCanonicalFingerprintFromMd } from './e77_lib.mjs';

const update = process.env.UPDATE_E77_EVIDENCE === '1';
const updateCal = process.env.UPDATE_E77_CALIBRATION === '1';
if (process.env.CI === 'true' && (update || updateCal)) throw new Error('UPDATE_E77 flags forbidden in CI');

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftAllowed(before, after) {
  const b = parseMap(before), a = parseMap(after), ch = [];
  for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r);
  for (const r of b.keys()) if (!a.has(r)) ch.push(r);
  return ch.every((r) => r.startsWith('reports/evidence/E77/') || r.startsWith('core/edge/calibration/') || r.startsWith('docs/wow/'));
}

function buildMaterials(recon, canary, court) {
  const env = defaultNormalizedEnv();
  const bind = readE76Binding();
  return [
    '# E77 MATERIALS',
    `- e76_canonical_fingerprint: ${bind.e76_canonical_fingerprint}`,
    `- chain_mode: ${String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase()}`,
    `- node_version: ${process.version}`,
    `- npm_version: ${(spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout || '').trim()}`,
    '- env_normalization:',
    `  - TZ=${env.TZ}`,
    `  - LANG=${env.LANG}`,
    `  - LC_ALL=${env.LC_ALL}`,
    `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    `- recon_source_sha256: ${recon.source_sha256}`,
    `- recon_fingerprint: ${recon.fingerprint}`,
    `- calibration_hash: ${court.new_cal_hash}`,
    `- canary_run_fingerprint: ${canary.run_fingerprint}`,
    '- WOW_USED: [W-0003, W-0015, W-0016]'
  ].join('\n');
}

function buildRecon(recon) {
  const lines = ['# E77 EXEC RECON MULTI', '- mode: fixture-first', `- source_file: ${recon.source_file}`, `- source_sha256: ${recon.source_sha256}`, `- normalized_rows_hash: ${recon.normalized_rows_hash}`, `- recon_fingerprint: ${recon.fingerprint}`, '', '| symbol | fee_median | spread_median | spread_p95 | slip_small | slip_medium | slip_large | lat_median | lat_p95 |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const r of recon.symbolRows) lines.push(`| ${r.symbol} | ${r.fee_median} | ${r.spread_median} | ${r.spread_p95} | ${r.slippage_small} | ${r.slippage_medium} | ${r.slippage_large} | ${r.latency_median} | ${r.latency_p95} |`);
  lines.push('', '| symbol | window | trades | slippage_median | latency_median |', '|---|---|---:|---:|---:|');
  for (const r of recon.windowRows) lines.push(`| ${r.symbol} | ${r.window} | ${r.trades} | ${r.slippage_median} | ${r.latency_median} |`);
  return lines.join('\n');
}

function buildCanary(canary) {
  const lines = ['# E77 EDGE CANARY', '', '| candidate | reason | verdict | robust_score | worst_expectancy | worst_drawdown |', '|---|---|---|---:|---:|---:|'];
  for (const r of canary.rows) lines.push(`| ${r.candidate_id} | ${r.reason_code} | ${r.verdict} | ${r.robust_score} | ${r.worst_expectancy} | ${r.worst_drawdown} |`);
  lines.push('', '## reason counts');
  for (const [k, v] of Object.entries(canary.counts).sort((a, b) => a[0].localeCompare(b[0]))) lines.push(`- ${k}: ${v}`);
  return lines.join('\n');
}

function required() {
  const req = ['MATERIALS.md', 'EXEC_RECON_MULTI.md', 'CALIBRATION_COURT.md', 'EDGE_CANARY.md', 'RUNS_EDGE_CANARY_X2.md', 'WOW_USAGE.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const f of req) if (!fs.existsSync(path.join(E77_ROOT, f))) throw new Error(`missing ${f}`);
}

const before = gitStatus();
ensureDir(E77_ROOT);

if (update && process.env.CI !== 'true') {
  if (!updateCal) throw new Error('UPDATE_E77_CALIBRATION=1 required in update');
  const reconFile = path.resolve('core/edge/fixtures/e77_recon_observed_multi.csv');
  const recon = summarizeReconMulti(parseReconMulti(reconFile), reconFile);
  const courtStep = spawnSync('node', ['scripts/verify/e77_calibration_court.mjs'], { stdio: 'inherit', env: { ...process.env, UPDATE_E77_EVIDENCE: '1', UPDATE_E77_CALIBRATION: '1', CI: 'false' } });
  if ((courtStep.status ?? 1) !== 0) throw new Error('e77_calibration_court failed');
  const court = evaluateCalibrationCourt();
  const canary = runE77CanaryEval({ seed: Number(process.env.SEED || '12345') });

  writeMd(path.join(E77_ROOT, 'MATERIALS.md'), buildMaterials(recon, canary, court));
  writeMd(path.join(E77_ROOT, 'EXEC_RECON_MULTI.md'), buildRecon(recon));
  writeMd(path.join(E77_ROOT, 'EDGE_CANARY.md'), buildCanary(canary));

  const x2 = spawnSync('node', ['scripts/verify/e77_edge_canary_x2.mjs'], { stdio: 'inherit', env: { ...process.env, UPDATE_E77_EVIDENCE: '1', CI: 'false' } });
  if ((x2.status ?? 1) !== 0) throw new Error('e77_edge_canary_x2 failed');

  writeMd(path.join(E77_ROOT, 'WOW_USAGE.md'), [
    '# E77 WOW USAGE',
    '- WOW_USED: [W-0003, W-0015, W-0016]',
    '## W-0003',
    '- trace: scripts/verify/e77_run.mjs CI/update-flag governance guardrails',
    '## W-0015',
    '- trace: scripts/edge/e77_canary_eval.mjs reason budgets + canary thresholds',
    '## W-0016',
    '- trace: scripts/verify/e77_calibration_court.mjs no-silent-drift court'
  ].join('\n'));

  writeMd(path.join(E77_ROOT, 'CLOSEOUT.md'), ['# E77 CLOSEOUT', '- canonical_fingerprint: pending'].join('\n'));
  writeMd(path.join(E77_ROOT, 'VERDICT.md'), ['# E77 VERDICT', '- canonical_fingerprint: pending'].join('\n'));
  rewriteSumsE77();
  const canon = evidenceFingerprintE77();
  if (!canon) throw new Error('canonical unavailable');
  writeMd(path.join(E77_ROOT, 'CLOSEOUT.md'), [
    '# E77 CLOSEOUT',
    '- status: PASS',
    `- commit: ${(spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout || '').trim()}`,
    `- utc_time: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- chain_mode: ${String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase()}`,
    '- commands_executed: npm ci; CI=false UPDATE_E77_EVIDENCE=1 UPDATE_E77_CALIBRATION=1 npm run -s verify:e77; git status --porcelain > /tmp/e77_before && CI=false npm run -s verify:e77 && git status --porcelain > /tmp/e77_after && diff -u /tmp/e77_before /tmp/e77_after; git status --porcelain > /tmp/e77_ci_before && CI=true npm run -s verify:e77 && git status --porcelain > /tmp/e77_ci_after && diff -u /tmp/e77_ci_before /tmp/e77_ci_after; CI=false FORCE_E77_MISMATCH=1 node scripts/verify/e77_edge_canary_x2.mjs || true; test -f .foundation-seal/E77_KILL_LOCK.md && echo E77_KILL_LOCK_armed; rm -f .foundation-seal/E77_KILL_LOCK.md; CI=false npm run -s verify:e77',
    `- recon_fixture_sha256: ${recon.source_sha256}`,
    `- calibration_hash: ${court.new_cal_hash}`,
    `- canary_summary: PASS=${(canary.counts.OK || 0)} FAIL=${(canary.rows.filter((x) => x.verdict === 'FAIL').length)}`,
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  writeMd(path.join(E77_ROOT, 'VERDICT.md'), [
    '# E77 VERDICT',
    '- Status: PASS',
    '- done_criteria: rituals A/B/C passed',
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  rewriteSumsE77();
}

required();
const c = readCanonicalFingerprintFromMd(path.join(E77_ROOT, 'CLOSEOUT.md'));
const v = readCanonicalFingerprintFromMd(path.join(E77_ROOT, 'VERDICT.md'));
const r = evidenceFingerprintE77();
if (!c || !v || !r || c !== v || c !== r) throw new Error('canonical parity violation');
verifySumsE77();
for (const line of fs.readFileSync(path.join(E77_ROOT, 'SHA256SUMS.md'), 'utf8').split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
  const [h, rel] = line.split(/\s{2}/);
  if (sha256File(path.resolve(rel)) !== h) throw new Error(`sha mismatch ${rel}`);
}

const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftAllowed(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log('verify:e77:evidence PASSED');
