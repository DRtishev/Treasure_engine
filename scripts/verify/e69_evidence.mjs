#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  E69_ROOT,
  ensureDir,
  readE68CanonicalFingerprint,
  readCanonicalFingerprintFromMd,
  materialsHashesE69,
  evidenceFingerprintE69,
  rewriteSumsE69,
  verifySumsRowsE69,
  defaultNormalizedEnv
} from './e69_lib.mjs';
import { readCanonicalFingerprintFromMd as readFp } from './e67_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E69_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FULL').toUpperCase();
if (!['FULL', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL or FAST');
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E69_EVIDENCE=1 forbidden when CI=true');

function gitStatusPorcelain() {
  const r = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

function parseStatusMap(text) {
  const map = new Map();
  for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) map.set(row.slice(3).trim(), row.slice(0, 2));
  return map;
}

function driftOnlyUnderE69(before, after) {
  const beforeMap = parseStatusMap(before);
  const afterMap = parseStatusMap(after);
  const changed = [];
  for (const [rel, status] of afterMap.entries()) if (!beforeMap.has(rel) || beforeMap.get(rel) !== status) changed.push(rel);
  for (const rel of beforeMap.keys()) if (!afterMap.has(rel)) changed.push(rel);
  return changed.every((rel) => rel.startsWith('reports/evidence/E69/'));
}

function nodeVersion() {
  return process.version;
}

function npmVersion() {
  const r = spawnSync('npm', ['-v'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

function buildMaterials() {
  const e68 = readE68CanonicalFingerprint();
  const e67 = readFp(path.resolve('reports/evidence/E67/CLOSEOUT.md'));
  const e66 = readFp(path.resolve('reports/evidence/E66/CLOSEOUT.md'));
  const rows = materialsHashesE69().map((x) => `- ${x.file}: ${x.sha256}`);
  const env = defaultNormalizedEnv();
  return [
    '# E69 MATERIALS',
    `- chain_mode: ${chainMode}`,
    `- e66_canonical_fingerprint: ${e66}`,
    `- e67_canonical_fingerprint: ${e67}`,
    `- e68_canonical_fingerprint: ${e68}`,
    `- node_version: ${nodeVersion()}`,
    `- npm_version: ${npmVersion()}`,
    '- env_normalization:',
    `  - TZ=${env.TZ}`,
    `  - LANG=${env.LANG}`,
    `  - LC_ALL=${env.LC_ALL}`,
    `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    ...rows
  ].join('\n');
}

function buildSuiteMd() {
  const raw = fs.readFileSync(path.join(E69_ROOT, 'RUNS_EDGE_MAGIC_SUITE_X2.md'), 'utf8');
  const suiteFp = (raw.match(/run1_suite_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || 'N/A';
  const runner = spawnSync('node', ['-e', "import('./core/edge/alpha/edge_magic_suite_v2.mjs').then(m=>console.log(JSON.stringify(m.runEdgeMagicSuiteV2())))"], { encoding: 'utf8' });
  if ((runner.status ?? 1) !== 0) throw new Error('Failed to generate suite report');
  const report = JSON.parse((runner.stdout || '').trim());
  const lines = [
    '# E69 EDGE MAGIC SUITE',
    `- suite_fingerprint: ${suiteFp}`,
    '| window | trades | winrate | profit_factor | max_drawdown | sharpe_like | expectancy | worst_run | net_pnl |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const w of report.windows.sort((a, b) => a.window_id.localeCompare(b.window_id))) {
    const m = w.metrics;
    lines.push(`| ${w.window_id} | ${m.trades} | ${m.winrate.toFixed(8)} | ${m.profit_factor.toFixed(8)} | ${m.max_drawdown.toFixed(8)} | ${m.sharpe_like.toFixed(8)} | ${m.expectancy.toFixed(8)} | ${m.worst_run} | ${m.net_pnl.toFixed(8)} |`);
  }
  const a = report.aggregate;
  lines.push(`| aggregate | ${a.trades} | ${a.winrate.toFixed(8)} | ${a.profit_factor.toFixed(8)} | ${a.max_drawdown.toFixed(8)} | ${a.sharpe_like.toFixed(8)} | ${a.expectancy.toFixed(8)} | ${a.worst_run} | ${a.net_pnl.toFixed(8)} |`);
  return lines.join('\n');
}

function buildCloseout(fp) {
  return [
    '# E69 CLOSEOUT',
    '',
    `- chain_mode: ${chainMode}`,
    '- commands:',
    `  - CI=false UPDATE_E69_EVIDENCE=1 CHAIN_MODE=${chainMode} npm run -s verify:e69`,
    `- canonical_fingerprint: ${fp}`,
    '- links:',
    '  - MATERIALS.md',
    '  - EDGE_MAGIC_SUITE.md',
    '  - RUNS_EDGE_MAGIC_SUITE_X2.md',
    '  - SHA256SUMS.md'
  ].join('\n');
}

function buildVerdict(fp) {
  return [
    '# E69 VERDICT',
    '',
    'Status: PASS',
    `- chain_mode: ${chainMode}`,
    `- canonical_fingerprint: ${fp}`
  ].join('\n');
}

function verifyAll() {
  const required = ['MATERIALS.md', 'EDGE_MAGIC_SUITE.md', 'RUNS_EDGE_MAGIC_SUITE_X2.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const file of required) if (!fs.existsSync(path.join(E69_ROOT, file))) throw new Error(`Missing ${file}`);
  const computed = evidenceFingerprintE69();
  if (!computed) throw new Error('Failed to compute E69 fingerprint');
  const closeoutFp = readCanonicalFingerprintFromMd(path.join(E69_ROOT, 'CLOSEOUT.md'));
  const verdictFp = readCanonicalFingerprintFromMd(path.join(E69_ROOT, 'VERDICT.md'));
  if (closeoutFp !== computed || verdictFp !== computed) throw new Error(`canonical mismatch closeout=${closeoutFp} verdict=${verdictFp} computed=${computed}`);
  verifySumsRowsE69();
  const sumsCheck = spawnSync('bash', ['-lc', "grep -E '^[0-9a-f]{64} ' reports/evidence/E69/SHA256SUMS.md | sha256sum -c -"], { encoding: 'utf8' });
  if ((sumsCheck.status ?? 1) !== 0) throw new Error(`sha256sum -c failed\n${sumsCheck.stdout}\n${sumsCheck.stderr}`);
  return computed;
}

const before = gitStatusPorcelain();

if (update) {
  ensureDir(E69_ROOT);
  writeMd(path.join(E69_ROOT, 'MATERIALS.md'), buildMaterials());
  writeMd(path.join(E69_ROOT, 'EDGE_MAGIC_SUITE.md'), buildSuiteMd());
  writeMd(path.join(E69_ROOT, 'CLOSEOUT.md'), buildCloseout('0'.repeat(64)));
  writeMd(path.join(E69_ROOT, 'VERDICT.md'), buildVerdict('0'.repeat(64)));
  rewriteSumsE69();

  let fp = evidenceFingerprintE69();
  writeMd(path.join(E69_ROOT, 'CLOSEOUT.md'), buildCloseout(fp));
  writeMd(path.join(E69_ROOT, 'VERDICT.md'), buildVerdict(fp));
  rewriteSumsE69();

  const fp2 = evidenceFingerprintE69();
  if (fp2 !== fp) {
    writeMd(path.join(E69_ROOT, 'CLOSEOUT.md'), buildCloseout(fp2));
    writeMd(path.join(E69_ROOT, 'VERDICT.md'), buildVerdict(fp2));
    rewriteSumsE69();
  }
}

const verifiedFp = verifyAll();
const after = gitStatusPorcelain();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyUnderE69(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log(`verify:e69:evidence PASSED canonical_fingerprint=${verifiedFp}`);
