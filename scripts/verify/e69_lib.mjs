#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E69_ROOT = path.resolve('reports/evidence/E69');
export const E68_CLOSEOUT = path.resolve('reports/evidence/E68/CLOSEOUT.md');
export const E68_VERDICT = path.resolve('reports/evidence/E68/VERDICT.md');
export const E69_LOCK_PATH = path.resolve('.foundation-seal/E69_KILL_LOCK.md');

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function toPosixRel(absPath) {
  return path.relative(process.cwd(), absPath).split(path.sep).join('/');
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const raw = fs.readFileSync(filePath, 'utf8');
  const m = raw.match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE68CanonicalFingerprint() {
  const a = readCanonicalFingerprintFromMd(E68_CLOSEOUT);
  const b = readCanonicalFingerprintFromMd(E68_VERDICT);
  if (!a || !b || a !== b) throw new Error('E68 canonical_fingerprint mismatch or missing');
  return a;
}

export function defaultNormalizedEnv() {
  return {
    TZ: 'UTC',
    LANG: 'C',
    LC_ALL: 'C',
    SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
    SEED: String(process.env.SEED || '12345')
  };
}

export function materialsHashesE69() {
  const files = [
    'core/edge/fixtures/edge_magic_v2.csv',
    'core/edge/alpha/edge_magic_suite_v2.mjs',
    'scripts/verify/e69_lib.mjs',
    'scripts/verify/e69_edge_magic_suite_x2.mjs',
    'scripts/verify/e69_evidence.mjs',
    'scripts/verify/e69_run.mjs',
    'package-lock.json'
  ].filter((f) => fs.existsSync(f));
  return files.sort().map((file) => ({ file, sha256: sha256File(path.resolve(file)) }));
}

export function readSumsCoreTextE69() {
  const sumsPath = path.join(E69_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(sumsPath)) return '';
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E69/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E69/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E69/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE69() {
  const e68fp = readE68CanonicalFingerprint();
  const required = ['MATERIALS.md', 'EDGE_MAGIC_SUITE.md', 'RUNS_EDGE_MAGIC_SUITE_X2.md'];
  if (required.some((f) => !fs.existsSync(path.join(E69_ROOT, f)))) return '';

  const runsRaw = fs.readFileSync(path.join(E69_ROOT, 'RUNS_EDGE_MAGIC_SUITE_X2.md'), 'utf8');
  const run1 = (runsRaw.match(/run1_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run2 = (runsRaw.match(/run2_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const det = (runsRaw.match(/deterministic_match:\s*(true|false)/) || [])[1] || 'false';
  if (!run1 || !run2) return '';

  const chunks = [
    `## E68_CHAIN\n${e68fp}\n`,
    `## EDGE_SUITE_X2\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${fs.readFileSync(path.join(E69_ROOT, 'MATERIALS.md'), 'utf8')}`,
    `## EDGE_MAGIC_SUITE\n${fs.readFileSync(path.join(E69_ROOT, 'EDGE_MAGIC_SUITE.md'), 'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE69()}`
  ];
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE69() {
  const lines = fs.readdirSync(E69_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort()
    .map((f) => {
      const abs = path.join(E69_ROOT, f);
      return `${sha256File(abs)}  ${toPosixRel(abs)}`;
    });
  writeMd(path.join(E69_ROOT, 'SHA256SUMS.md'), `# E69 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsRowsE69() {
  const sumsPath = path.join(E69_ROOT, 'SHA256SUMS.md');
  const raw = fs.readFileSync(sumsPath, 'utf8');
  if (!/\sreports\/evidence\/E69\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E69\/VERDICT\.md$/m.test(raw)) {
    throw new Error('SHA256SUMS missing CLOSEOUT.md or VERDICT.md row');
  }
  if (/\sreports\/evidence\/E69\/SHA256SUMS\.md$/m.test(raw)) {
    throw new Error('SHA256SUMS self-row forbidden');
  }
  const lines = raw.split(/\r?\n/).filter((line) => /^[a-f0-9]{64}\s{2}/.test(line));
  for (const line of lines) {
    const [hash, rel] = line.split(/\s{2}/);
    const abs = path.resolve(rel);
    const actual = sha256File(abs);
    if (hash !== actual) throw new Error(`SHA mismatch for ${rel}`);
  }
}
