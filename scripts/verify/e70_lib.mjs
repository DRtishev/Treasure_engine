#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';
import { buildChainBundle } from './e70_chain_bundle.mjs';

export const E70_ROOT = path.resolve('reports/evidence/E70');
export const E70_LOCK_PATH = path.resolve('.foundation-seal/E70_KILL_LOCK.md');

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE69CanonicalFingerprint() {
  const closeout = path.resolve('reports/evidence/E69/CLOSEOUT.md');
  const verdict = path.resolve('reports/evidence/E69/VERDICT.md');
  const a = readCanonicalFingerprintFromMd(closeout);
  const b = readCanonicalFingerprintFromMd(verdict);
  if (!a || !b || a !== b) throw new Error('E69 canonical fingerprint mismatch or missing');
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

export function materialsHashesE70() {
  const files = [
    'core/edge/alpha/edge_magic_stress_suite_v1.mjs',
    'core/edge/fixtures/edge_magic_stress_flashcrash.csv',
    'core/edge/fixtures/edge_magic_stress_chop.csv',
    'core/edge/fixtures/edge_magic_stress_spread.csv',
    'scripts/verify/e70_chain_bundle.mjs',
    'scripts/verify/e70_lib.mjs',
    'scripts/verify/e70_edge_stress_x2.mjs',
    'scripts/verify/e70_evidence.mjs',
    'scripts/verify/e70_run.mjs',
    'package-lock.json'
  ].filter((f) => fs.existsSync(f));
  return files.sort().map((f) => ({ file: f, sha256: sha256File(path.resolve(f)) }));
}

export function readSumsCoreTextE70() {
  const sumsPath = path.join(E70_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(sumsPath)) return '';
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E70/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E70/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E70/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE70() {
  const e69fp = readE69CanonicalFingerprint();
  const required = ['MATERIALS.md', 'EDGE_STRESS.md', 'RUNS_EDGE_STRESS_X2.md'];
  if (required.some((f) => !fs.existsSync(path.join(E70_ROOT, f)))) return '';

  const runsRaw = fs.readFileSync(path.join(E70_ROOT, 'RUNS_EDGE_STRESS_X2.md'), 'utf8');
  const run1 = (runsRaw.match(/run1_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run2 = (runsRaw.match(/run2_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const det = (runsRaw.match(/deterministic_match:\s*(true|false)/) || [])[1] || 'false';
  const materials = fs.readFileSync(path.join(E70_ROOT, 'MATERIALS.md'), 'utf8');
  const chainBundle = (materials.match(/chain_bundle_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  if (!run1 || !run2 || !chainBundle) return '';

  return sha256Text([
    `## E69_CHAIN\n${e69fp}\n`,
    `## CHAIN_BUNDLE\n${chainBundle}\n`,
    `## EDGE_STRESS_X2\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${materials}`,
    `## EDGE_STRESS\n${fs.readFileSync(path.join(E70_ROOT, 'EDGE_STRESS.md'), 'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE70()}`
  ].join('\n'));
}

export function rewriteSumsE70() {
  const lines = fs.readdirSync(E70_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort()
    .map((f) => {
      const abs = path.join(E70_ROOT, f);
      const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
      return `${sha256File(abs)}  ${rel}`;
    });
  writeMd(path.join(E70_ROOT, 'SHA256SUMS.md'), `# E70 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsRowsE70() {
  const raw = fs.readFileSync(path.join(E70_ROOT, 'SHA256SUMS.md'), 'utf8');
  if (!/\sreports\/evidence\/E70\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E70\/VERDICT\.md$/m.test(raw)) {
    throw new Error('SHA256SUMS missing CLOSEOUT or VERDICT row');
  }
  if (/\sreports\/evidence\/E70\/SHA256SUMS\.md$/m.test(raw)) throw new Error('SHA256SUMS self-row forbidden');
  for (const line of raw.split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
    const [hash, rel] = line.split(/\s{2}/);
    if (sha256File(path.resolve(rel)) !== hash) throw new Error(`SHA mismatch for ${rel}`);
  }
}

export function computeChainBundle(chainMode) {
  return buildChainBundle(chainMode);
}
