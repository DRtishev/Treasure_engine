#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  E68_ROOT,
  ensureDir,
  readE67CanonicalFingerprint,
  materialsHashesE68,
  evidenceFingerprintE68,
  rewriteSumsE68,
  readCanonicalFingerprintFromMd
} from './e68_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E68_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E68_EVIDENCE=1 forbidden when CI=true');

function gitStatusPorcelain() {
  const r = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

function parseStatusMap(text) {
  const map = new Map();
  for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) {
    map.set(row.slice(3).trim(), row.slice(0, 2));
  }
  return map;
}

function driftOnlyUnderE68(before, after) {
  const beforeMap = parseStatusMap(before);
  const afterMap = parseStatusMap(after);
  const changed = [];
  for (const [rel, status] of afterMap.entries()) {
    if (!beforeMap.has(rel) || beforeMap.get(rel) !== status) changed.push(rel);
  }
  for (const rel of beforeMap.keys()) {
    if (!afterMap.has(rel)) changed.push(rel);
  }
  return changed.every((rel) => rel.startsWith('reports/evidence/E68/'));
}

function normalizedUtcFromSourceDateEpoch() {
  return new Date(Number(process.env.SOURCE_DATE_EPOCH || '1700000000') * 1000).toISOString();
}

function buildMaterials() {
  const e67 = readE67CanonicalFingerprint();
  const rows = materialsHashesE68().map((x) => `- ${x.file}: ${x.sha256}`);
  return ['# E68 MATERIALS', `- e67_canonical_fingerprint: ${e67}`, ...rows].join('\n');
}

function buildEdgeMagic() {
  return [
    '# E68 EDGE MAGIC',
    '- mode: deterministic offline alpha simulation',
    '- fixture: core/edge/fixtures/edge_magic_v1.csv',
    '- env_normalization:',
    '  - TZ=UTC',
    '  - LANG=C',
    '  - LC_ALL=C',
    '  - SOURCE_DATE_EPOCH=1700000000 (default)',
    '  - SEED=12345 (default)',
    '- source: RUNS_EDGE_MAGIC_X2.md'
  ].join('\n');
}

function buildCloseout(fp) {
  return [
    '# E68 CLOSEOUT',
    '',
    '- mode: edge magic certification',
    '- normalized_utc: ' + normalizedUtcFromSourceDateEpoch(),
    '- commands:',
    '  - CI=false UPDATE_E68_EVIDENCE=1 npm run -s verify:e68',
    `- canonical_fingerprint: ${fp}`,
    '- links:',
    '  - RUNS_EDGE_MAGIC_X2.md',
    '  - MATERIALS.md',
    '  - EDGE_MAGIC.md',
    '  - SHA256SUMS.md'
  ].join('\n');
}

function buildVerdict(fp) {
  return [
    '# E68 VERDICT',
    '',
    'Status: PASS',
    `- canonical_fingerprint: ${fp}`,
    '- rule: deterministic_match must be true in RUNS_EDGE_MAGIC_X2.md'
  ].join('\n');
}

function verifyShaRows() {
  const sumsPath = path.join(E68_ROOT, 'SHA256SUMS.md');
  const raw = fs.readFileSync(sumsPath, 'utf8');
  if (!/\sreports\/evidence\/E68\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E68\/VERDICT\.md$/m.test(raw)) {
    throw new Error('SHA256SUMS missing CLOSEOUT.md or VERDICT.md row');
  }
  if (/\sreports\/evidence\/E68\/SHA256SUMS\.md$/m.test(raw)) {
    throw new Error('SHA256SUMS must exclude itself from hash rows');
  }

  const lines = raw.split(/\r?\n/).filter((line) => /^[a-f0-9]{64}\s{2}/.test(line));
  for (const line of lines) {
    const [hash, relPath] = line.split(/\s{2}/);
    const abs = path.resolve(relPath);
    if (!fs.existsSync(abs)) throw new Error(`SHA row target missing: ${relPath}`);
    const actual = spawnSync('sha256sum', [abs], { encoding: 'utf8' });
    const actualHash = (actual.stdout || '').trim().split(/\s+/)[0];
    if (actualHash !== hash) throw new Error(`SHA mismatch for ${relPath}`);
  }

  const sumsCheck = spawnSync('bash', ['-lc', "grep -E '^[0-9a-f]{64} ' reports/evidence/E68/SHA256SUMS.md | sha256sum -c -"], { encoding: 'utf8' });
  if ((sumsCheck.status ?? 1) !== 0) throw new Error(`SHA check failed\n${sumsCheck.stdout}\n${sumsCheck.stderr}`);
}

const before = gitStatusPorcelain();

const required = ['RUNS_EDGE_MAGIC_X2.md'];
if (!update) required.push('MATERIALS.md', 'EDGE_MAGIC.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md');
for (const f of required) {
  if (!fs.existsSync(path.join(E68_ROOT, f))) throw new Error(`Missing ${f}`);
}

if (update) {
  ensureDir(E68_ROOT);
  writeMd(path.join(E68_ROOT, 'MATERIALS.md'), buildMaterials());
  writeMd(path.join(E68_ROOT, 'EDGE_MAGIC.md'), buildEdgeMagic());
  writeMd(path.join(E68_ROOT, 'CLOSEOUT.md'), buildCloseout('0'.repeat(64)));
  writeMd(path.join(E68_ROOT, 'VERDICT.md'), buildVerdict('0'.repeat(64)));
  rewriteSumsE68();
  let fp = evidenceFingerprintE68();
  writeMd(path.join(E68_ROOT, 'CLOSEOUT.md'), buildCloseout(fp));
  writeMd(path.join(E68_ROOT, 'VERDICT.md'), buildVerdict(fp));
  rewriteSumsE68();
  const fp2 = evidenceFingerprintE68();
  if (fp2 !== fp) {
    writeMd(path.join(E68_ROOT, 'CLOSEOUT.md'), buildCloseout(fp2));
    writeMd(path.join(E68_ROOT, 'VERDICT.md'), buildVerdict(fp2));
    rewriteSumsE68();
  }
}

const computed = evidenceFingerprintE68();
if (!computed) throw new Error('Failed to compute E68 evidence fingerprint');
const closeoutFp = readCanonicalFingerprintFromMd(path.join(E68_ROOT, 'CLOSEOUT.md'));
const verdictFp = readCanonicalFingerprintFromMd(path.join(E68_ROOT, 'VERDICT.md'));
if (closeoutFp !== computed || verdictFp !== computed) {
  throw new Error(`canonical fingerprint mismatch closeout=${closeoutFp} verdict=${verdictFp} computed=${computed}`);
}
verifyShaRows();

const after = gitStatusPorcelain();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyUnderE68(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log(`verify:e68:evidence PASSED canonical_fingerprint=${computed}`);
