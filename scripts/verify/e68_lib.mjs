#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E68_ROOT = path.resolve('reports/evidence/E68');
export const E67_CLOSEOUT = path.resolve('reports/evidence/E67/CLOSEOUT.md');
export const E68_LOCK_PATH = path.resolve('.foundation-seal/E68_KILL_LOCK.md');

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const raw = fs.readFileSync(filePath, 'utf8');
  const m = raw.match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE67CanonicalFingerprint() {
  const fp = readCanonicalFingerprintFromMd(E67_CLOSEOUT);
  if (!fp) throw new Error('E67 canonical_fingerprint not found in reports/evidence/E67/CLOSEOUT.md');
  return fp;
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

export function materialsHashesE68() {
  const files = [
    'core/edge/fixtures/edge_magic_v1.csv',
    'core/edge/alpha/edge_magic_v1.mjs',
    'scripts/verify/e68_lib.mjs',
    'scripts/verify/e68_edge_magic_x2.mjs',
    'scripts/verify/e68_evidence.mjs',
    'scripts/verify/e68_run.mjs',
    'package-lock.json'
  ].filter((f) => fs.existsSync(f));
  return files.sort().map((f) => ({ file: f, sha256: sha256File(path.resolve(f)) }));
}

export function readSumsCoreTextE68() {
  const sumsPath = path.join(E68_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(sumsPath)) return '';
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (/\sreports\/evidence\/E68\/CLOSEOUT\.md$/.test(line)) return false;
    if (/\sreports\/evidence\/E68\/VERDICT\.md$/.test(line)) return false;
    if (/\sreports\/evidence\/E68\/SHA256SUMS\.md$/.test(line)) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE68() {
  const e67fp = readE67CanonicalFingerprint();
  const required = ['RUNS_EDGE_MAGIC_X2.md', 'MATERIALS.md', 'EDGE_MAGIC.md'];
  const missing = required.find((f) => !fs.existsSync(path.join(E68_ROOT, f)));
  if (missing) return '';

  const runsRaw = fs.readFileSync(path.join(E68_ROOT, 'RUNS_EDGE_MAGIC_X2.md'), 'utf8');
  const run1 = (runsRaw.match(/run1_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run2 = (runsRaw.match(/run2_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const det = (runsRaw.match(/deterministic_match:\s*(true|false)/) || [])[1] || 'false';
  if (!run1 || !run2) return '';

  const chunks = [
    `## E67_CHAIN\n${e67fp}\n`,
    `## EDGE_X2\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${fs.readFileSync(path.join(E68_ROOT, 'MATERIALS.md'), 'utf8')}`,
    `## EDGE_MAGIC\n${fs.readFileSync(path.join(E68_ROOT, 'EDGE_MAGIC.md'), 'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE68()}`
  ];
  return sha256Text(chunks.join('\n'));
}

export function listE68MdFilesForSums() {
  return fs.readdirSync(E68_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort();
}

export function rewriteSumsE68() {
  const lines = listE68MdFilesForSums().map((f) => {
    const abs = path.join(E68_ROOT, f);
    const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
    return `${sha256File(abs)}  ${rel}`;
  });
  writeMd(path.join(E68_ROOT, 'SHA256SUMS.md'), `# E68 SHA256SUMS\n\n${lines.join('\n')}`);
}
