#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E75_ROOT = path.resolve('reports/evidence/E75');
export const E75_LOCK_PATH = path.resolve('.foundation-seal/E75_KILL_LOCK.md');

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

export function readE74Binding() {
  const closeout = path.resolve('reports/evidence/E74/CLOSEOUT.md');
  const verdict = path.resolve('reports/evidence/E74/VERDICT.md');
  const a = readCanonicalFingerprintFromMd(closeout);
  const b = readCanonicalFingerprintFromMd(verdict);
  if (!a || !b || a !== b) throw new Error('E74 canonical mismatch');
  return { e74_canonical_fingerprint: a };
}

export function materialsHashesE75() {
  const files = [
    'core/edge/e75_profit_harness.mjs',
    'core/edge/e75_execution_recon.mjs',
    'core/exec/adapters/demo_adapter_bybit.mjs',
    'scripts/verify/e75_lib.mjs',
    'scripts/verify/e75_edge_profit_x2.mjs',
    'scripts/verify/e75_evidence.mjs',
    'scripts/verify/e75_run.mjs',
    'scripts/verify/e75_profit_harness_check.mjs',
    'package.json',
    'package-lock.json'
  ].filter((f) => fs.existsSync(f));
  return files.sort().map((file) => ({ file, sha256: sha256File(path.resolve(file)) }));
}

export function readSumsCoreTextE75() {
  const sumsPath = path.join(E75_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(sumsPath)) return '';
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E75/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E75/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E75/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE75() {
  const bind = readE74Binding();
  const required = ['MATERIALS.md', 'EDGE_PROFIT.md', 'EXEC_RECON.md', 'RUNS_EDGE_PROFIT_X2.md'];
  if (required.some((f) => !fs.existsSync(path.join(E75_ROOT, f)))) return '';
  const runs = fs.readFileSync(path.join(E75_ROOT, 'RUNS_EDGE_PROFIT_X2.md'), 'utf8');
  const run1 = (runs.match(/run1_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run2 = (runs.match(/run2_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const det = (runs.match(/deterministic_match:\s*(true|false)/) || [])[1] || 'false';
  if (!run1 || !run2) return '';
  return sha256Text([
    `## E74_BINDING\n${JSON.stringify(bind)}\n`,
    `## RUN_SCALARS\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${fs.readFileSync(path.join(E75_ROOT, 'MATERIALS.md'), 'utf8')}`,
    `## EDGE_PROFIT\n${fs.readFileSync(path.join(E75_ROOT, 'EDGE_PROFIT.md'), 'utf8')}`,
    `## EXEC_RECON\n${fs.readFileSync(path.join(E75_ROOT, 'EXEC_RECON.md'), 'utf8')}`,
    `## RUNS_EDGE_PROFIT_X2\n${runs}`,
    `## SUMS_CORE\n${readSumsCoreTextE75()}`
  ].join('\n'));
}

export function rewriteSumsE75() {
  const lines = fs.readdirSync(E75_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort()
    .map((f) => {
      const abs = path.join(E75_ROOT, f);
      const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
      return `${sha256File(abs)}  ${rel}`;
    });
  writeMd(path.join(E75_ROOT, 'SHA256SUMS.md'), `# E75 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsRowsE75() {
  const raw = fs.readFileSync(path.join(E75_ROOT, 'SHA256SUMS.md'), 'utf8');
  if (!/\sreports\/evidence\/E75\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E75\/VERDICT\.md$/m.test(raw)) throw new Error('SHA rows missing closeout/verdict');
  if (/\sreports\/evidence\/E75\/SHA256SUMS\.md$/m.test(raw)) throw new Error('self-row forbidden');
  for (const line of raw.split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
    const [h, rel] = line.split(/\s{2}/);
    if (sha256File(path.resolve(rel)) !== h) throw new Error(`SHA mismatch ${rel}`);
  }
}
