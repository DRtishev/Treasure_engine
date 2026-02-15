#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E72_ROOT = path.resolve('reports/evidence/E72');
export const E72_LOCK_PATH = path.resolve('.foundation-seal/E72_KILL_LOCK.md');

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

export function defaultNormalizedEnv() {
  return {
    TZ: 'UTC',
    LANG: 'C',
    LC_ALL: 'C',
    SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
    SEED: String(process.env.SEED || '12345')
  };
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE71Binding() {
  const closeout = path.resolve('reports/evidence/E71/CLOSEOUT.md');
  const verdict = path.resolve('reports/evidence/E71/VERDICT.md');
  const materials = path.resolve('reports/evidence/E71/MATERIALS.md');
  const a = readCanonicalFingerprintFromMd(closeout);
  const b = readCanonicalFingerprintFromMd(verdict);
  if (!a || !b || a !== b) throw new Error('E71 canonical mismatch');
  const matRaw = fs.readFileSync(materials, 'utf8');
  const chainBundle = (matRaw.match(/chain_bundle_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  if (!chainBundle) throw new Error('E71 chain_bundle_fingerprint missing');
  return { e71_canonical_fingerprint: a, chain_bundle_fingerprint: chainBundle };
}

export function contractTextHash() {
  const p = path.resolve('docs/edge/EDGE_META_CONTRACT.md');
  const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function materialsHashesE72() {
  const files = [
    'docs/edge/EDGE_META_CONTRACT.md',
    'docs/wow/WOW_LEDGER.md',
    'core/edge/alpha/edge_magic_meta_suite_v1.mjs',
    'scripts/verify/e72_lib.mjs',
    'scripts/verify/e72_wow_usage_verify.mjs',
    'scripts/verify/e72_edge_contract_x2.mjs',
    'scripts/verify/e72_evidence.mjs',
    'scripts/verify/e72_run.mjs',
    'package-lock.json'
  ].filter((f) => fs.existsSync(f));
  return files.sort().map((f) => ({ file: f, sha256: sha256File(path.resolve(f)) }));
}

export function readSumsCoreTextE72() {
  const sumsPath = path.join(E72_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(sumsPath)) return '';
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E72/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E72/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E72/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE72() {
  const binding = readE71Binding();
  const req = ['MATERIALS.md', 'WOW_USAGE.md', 'EDGE_CONTRACT.md', 'RUNS_EDGE_CONTRACT_X2.md'];
  if (req.some((f) => !fs.existsSync(path.join(E72_ROOT, f)))) return '';

  const materials = fs.readFileSync(path.join(E72_ROOT, 'MATERIALS.md'), 'utf8');
  const wowUsage = fs.readFileSync(path.join(E72_ROOT, 'WOW_USAGE.md'), 'utf8');
  const edgeContract = fs.readFileSync(path.join(E72_ROOT, 'EDGE_CONTRACT.md'), 'utf8');
  const runsRaw = fs.readFileSync(path.join(E72_ROOT, 'RUNS_EDGE_CONTRACT_X2.md'), 'utf8');

  const wowFp = (materials.match(/wow_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const wowUsageFp = (materials.match(/wow_usage_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const edgeFp = (materials.match(/edge_meta_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const chainBundle = (materials.match(/chain_bundle_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run1 = (runsRaw.match(/run1_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run2 = (runsRaw.match(/run2_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const det = (runsRaw.match(/deterministic_match:\s*(true|false)/) || [])[1] || 'false';
  if (!wowFp || !wowUsageFp || !edgeFp || !chainBundle || !run1 || !run2) return '';

  const chunks = [
    `## E71_BINDING\n${JSON.stringify(binding)}\n`,
    `## SCALARS\ncontract_text_hash=${contractTextHash()}\nwow_fingerprint=${wowFp}\nwow_usage_fingerprint=${wowUsageFp}\nedge_meta_fingerprint=${edgeFp}\nchain_bundle_fingerprint=${chainBundle}\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${materials}`,
    `## WOW_USAGE\n${wowUsage}`,
    `## EDGE_CONTRACT\n${edgeContract}`,
    `## SUMS_CORE\n${readSumsCoreTextE72()}`
  ];
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE72() {
  const lines = fs.readdirSync(E72_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort()
    .map((f) => {
      const abs = path.join(E72_ROOT, f);
      const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
      return `${sha256File(abs)}  ${rel}`;
    });
  writeMd(path.join(E72_ROOT, 'SHA256SUMS.md'), `# E72 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsRowsE72() {
  const raw = fs.readFileSync(path.join(E72_ROOT, 'SHA256SUMS.md'), 'utf8');
  if (!/\sreports\/evidence\/E72\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E72\/VERDICT\.md$/m.test(raw)) throw new Error('SHA rows missing CLOSEOUT/VERDICT');
  if (/\sreports\/evidence\/E72\/SHA256SUMS\.md$/m.test(raw)) throw new Error('SHA self-row forbidden');
  for (const line of raw.split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
    const [hash, rel] = line.split(/\s{2}/);
    if (sha256File(path.resolve(rel)) !== hash) throw new Error(`SHA mismatch ${rel}`);
  }
}
