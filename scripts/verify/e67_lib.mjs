#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E67_ROOT = path.resolve('reports/evidence/E67');
export const E66_CLOSEOUT = path.resolve('reports/evidence/E66/CLOSEOUT.md');
export const E67_LOCK_PATH = path.resolve('.foundation-seal/E67_KILL_LOCK.md');

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const raw = fs.readFileSync(filePath, 'utf8');
  const m = raw.match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE66CanonicalFingerprint() {
  const fp = readCanonicalFingerprintFromMd(E66_CLOSEOUT);
  if (!fp) throw new Error('E66 canonical_fingerprint not found in reports/evidence/E66/CLOSEOUT.md');
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

export function materialsHashes() {
  const files = [
    'package-lock.json',
    'scripts/verify/edge_epoch_gate.mjs',
    'scripts/verify/e67_lib.mjs',
    'scripts/verify/e67_recon_x2.mjs',
    'scripts/verify/e67_evidence.mjs',
    'scripts/verify/e67_run.mjs'
  ].filter((f) => fs.existsSync(f));
  return files.map((f) => ({ file: f, sha256: sha256File(path.resolve(f)) }));
}

export function readSumsCoreTextE67() {
  const sumsPath = path.join(E67_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(sumsPath)) return '';
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (/\sreports\/evidence\/E67\/CLOSEOUT\.md$/.test(line)) return false;
    if (/\sreports\/evidence\/E67\/VERDICT\.md$/.test(line)) return false;
    if (/\sreports\/evidence\/E67\/SHA256SUMS\.md$/.test(line)) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE67() {
  const e66fp = readE66CanonicalFingerprint();
  const runsPath = path.join(E67_ROOT, 'RUNS_RECON_X2.md');
  const materialsPath = path.join(E67_ROOT, 'MATERIALS.md');
  const edgeReconPath = path.join(E67_ROOT, 'EDGE_RECON.md');
  if (!fs.existsSync(runsPath) || !fs.existsSync(materialsPath) || !fs.existsSync(edgeReconPath)) return '';

  const runsRaw = fs.readFileSync(runsPath, 'utf8');
  const reconA = (runsRaw.match(/run1_recon_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const reconB = (runsRaw.match(/run2_recon_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const det = (runsRaw.match(/deterministic_match:\s*(true|false)/) || [])[1] || 'false';
  if (!reconA || !reconB) return '';

  const chunks = [
    `## E66_CHAIN\n${e66fp}\n`,
    `## RECON\nrun1=${reconA}\nrun2=${reconB}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${fs.readFileSync(materialsPath, 'utf8')}`,
    `## EDGE_RECON\n${fs.readFileSync(edgeReconPath, 'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE67()}`
  ];
  return sha256Text(chunks.join('\n'));
}

export function listE67MdFilesForSums() {
  return fs.readdirSync(E67_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort();
}

export function rewriteSumsE67() {
  const lines = listE67MdFilesForSums().map((f) => {
    const abs = path.join(E67_ROOT, f);
    const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
    return `${sha256File(abs)}  ${rel}`;
  });
  writeMd(path.join(E67_ROOT, 'SHA256SUMS.md'), `# E67 SHA256SUMS\n\n${lines.join('\n')}`);
}
