#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  E70_ROOT,
  ensureDir,
  defaultNormalizedEnv,
  materialsHashesE70,
  rewriteSumsE70,
  verifySumsRowsE70,
  evidenceFingerprintE70,
  readCanonicalFingerprintFromMd,
  computeChainBundle
} from './e70_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E70_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E70_EVIDENCE=1 forbidden when CI=true');

function gitStatusPorcelain() {
  return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim();
}

function parseStatusMap(text) {
  const map = new Map();
  for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) map.set(row.slice(3).trim(), row.slice(0, 2));
  return map;
}

function driftOnlyUnderE70(before, after) {
  const b = parseStatusMap(before);
  const a = parseStatusMap(after);
  const changed = [];
  for (const [rel, status] of a.entries()) if (!b.has(rel) || b.get(rel) !== status) changed.push(rel);
  for (const rel of b.keys()) if (!a.has(rel)) changed.push(rel);
  return changed.every((rel) => rel.startsWith('reports/evidence/E70/'));
}

function npmVersion() {
  return (spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout || '').trim();
}

function buildMaterials(bundle) {
  const env = defaultNormalizedEnv();
  const hashes = materialsHashesE70().map((x) => `- ${x.file}: ${x.sha256}`);
  return [
    '# E70 MATERIALS',
    `- chain_mode: ${bundle.chain_mode}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    ...bundle.entries.map((e) => `- ${e.epoch.toLowerCase()}_canonical_fingerprint: ${e.canonical_fingerprint}`),
    '- chain_bundle_entries:',
    ...bundle.entries.map((e) => `  - ${e.epoch}: canonical=${e.canonical_fingerprint} sums_core=${e.sums_core_hash}`),
    `- node_version: ${process.version}`,
    `- npm_version: ${npmVersion()}`,
    '- env_normalization:',
    `  - TZ=${env.TZ}`,
    `  - LANG=${env.LANG}`,
    `  - LC_ALL=${env.LC_ALL}`,
    `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    ...hashes
  ].join('\n');
}

function buildStressMd() {
  const runner = spawnSync('node', ['-e', "import('./core/edge/alpha/edge_magic_stress_suite_v1.mjs').then(m=>console.log(JSON.stringify(m.runEdgeStressSuiteV1())))"], { encoding: 'utf8' });
  if ((runner.status ?? 1) !== 0) throw new Error('Failed to render stress report');
  const report = JSON.parse((runner.stdout || '').trim());
  const lines = [
    '# E70 EDGE STRESS',
    `- suite_fingerprint: ${report.deterministic_fingerprint}`,
    '| dataset | config | trades | winrate | pf | maxdd | sharpe | expectancy | worst_run | avg_hold | fee_slippage_impact | net_pnl |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const row of report.scenarios) {
    const m = row.metrics;
    lines.push(`| ${row.dataset} | ${row.config} | ${m.trades} | ${m.winrate.toFixed(8)} | ${m.profit_factor.toFixed(8)} | ${m.max_drawdown.toFixed(8)} | ${m.sharpe_simple.toFixed(8)} | ${m.expectancy.toFixed(8)} | ${m.worst_run} | ${m.avg_hold.toFixed(8)} | ${m.fee_slippage_impact.toFixed(8)} | ${m.net_pnl.toFixed(8)} |`);
  }
  const a = report.aggregate;
  lines.push(`| aggregate | all | ${a.trades} | ${a.winrate.toFixed(8)} | ${a.profit_factor.toFixed(8)} | ${a.max_drawdown.toFixed(8)} | ${a.sharpe_simple.toFixed(8)} | ${a.expectancy.toFixed(8)} | ${a.worst_run} | ${a.avg_hold.toFixed(8)} | ${a.fee_slippage_impact.toFixed(8)} | ${a.net_pnl.toFixed(8)} |`);
  return lines.join('\n');
}

function buildCloseout(fp, bundle) {
  return [
    '# E70 CLOSEOUT',
    '',
    `- chain_mode: ${bundle.chain_mode}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    '- commands:',
    `  - CI=false UPDATE_E70_EVIDENCE=1 CHAIN_MODE=${bundle.chain_mode} npm run -s verify:e70`,
    `- canonical_fingerprint: ${fp}`,
    '- links:',
    '  - MATERIALS.md',
    '  - EDGE_STRESS.md',
    '  - RUNS_EDGE_STRESS_X2.md',
    '  - SHA256SUMS.md'
  ].join('\n');
}

function buildVerdict(fp, bundle) {
  return [
    '# E70 VERDICT',
    '',
    'Status: PASS',
    `- chain_mode: ${bundle.chain_mode}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    `- canonical_fingerprint: ${fp}`
  ].join('\n');
}

function verifyAll() {
  const required = ['MATERIALS.md', 'EDGE_STRESS.md', 'RUNS_EDGE_STRESS_X2.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const file of required) if (!fs.existsSync(path.join(E70_ROOT, file))) throw new Error(`Missing ${file}`);
  const fp = evidenceFingerprintE70();
  const c = readCanonicalFingerprintFromMd(path.join(E70_ROOT, 'CLOSEOUT.md'));
  const v = readCanonicalFingerprintFromMd(path.join(E70_ROOT, 'VERDICT.md'));
  if (!fp || c !== fp || v !== fp) throw new Error(`canonical mismatch closeout=${c} verdict=${v} computed=${fp}`);
  verifySumsRowsE70();
  const sumsCheck = spawnSync('bash', ['-lc', "grep -E '^[0-9a-f]{64} ' reports/evidence/E70/SHA256SUMS.md | sha256sum -c -"], { encoding: 'utf8' });
  if ((sumsCheck.status ?? 1) !== 0) throw new Error(`sha check failed\n${sumsCheck.stdout}\n${sumsCheck.stderr}`);
  return fp;
}

const before = gitStatusPorcelain();
const bundle = computeChainBundle(chainMode);

if (update) {
  ensureDir(E70_ROOT);
  if (!fs.existsSync(path.join(E70_ROOT, 'RUNS_EDGE_STRESS_X2.md'))) throw new Error('RUNS_EDGE_STRESS_X2.md missing (run stress x2 first)');
  writeMd(path.join(E70_ROOT, 'MATERIALS.md'), buildMaterials(bundle));
  writeMd(path.join(E70_ROOT, 'EDGE_STRESS.md'), buildStressMd());
  writeMd(path.join(E70_ROOT, 'CLOSEOUT.md'), buildCloseout('0'.repeat(64), bundle));
  writeMd(path.join(E70_ROOT, 'VERDICT.md'), buildVerdict('0'.repeat(64), bundle));
  rewriteSumsE70();

  let fp = evidenceFingerprintE70();
  writeMd(path.join(E70_ROOT, 'CLOSEOUT.md'), buildCloseout(fp, bundle));
  writeMd(path.join(E70_ROOT, 'VERDICT.md'), buildVerdict(fp, bundle));
  rewriteSumsE70();

  const fp2 = evidenceFingerprintE70();
  if (fp2 !== fp) {
    writeMd(path.join(E70_ROOT, 'CLOSEOUT.md'), buildCloseout(fp2, bundle));
    writeMd(path.join(E70_ROOT, 'VERDICT.md'), buildVerdict(fp2, bundle));
    rewriteSumsE70();
  }
}

const verified = verifyAll();
const after = gitStatusPorcelain();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyUnderE70(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log(`verify:e70:evidence PASSED canonical_fingerprint=${verified}`);
