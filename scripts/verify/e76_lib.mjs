#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E76_ROOT = path.resolve('reports/evidence/E76');
export const E76_LOCK_PATH = path.resolve('.foundation-seal/E76_KILL_LOCK.md');

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
export function defaultNormalizedEnv() {
  return {
    TZ: 'UTC', LANG: 'C', LC_ALL: 'C',
    SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
    SEED: String(process.env.SEED || '12345')
  };
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE75Binding() {
  const c = readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E75/CLOSEOUT.md'));
  const v = readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E75/VERDICT.md'));
  if (!c || !v || c !== v) throw new Error('E75 canonical mismatch');
  return { e75_canonical_fingerprint: c };
}

export function readSumsCoreTextE76() {
  const p = path.join(E76_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(p)) return '';
  const raw = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E76/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E76/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E76/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE76() {
  const bind = readE75Binding();
  const req = ['MATERIALS.md', 'EXEC_RECON_OBSERVED.md', 'EDGE_PROFIT_ENVELOPE.md', 'RUNS_EDGE_PROFIT_ENVELOPE_X2.md'];
  if (req.some((f) => !fs.existsSync(path.join(E76_ROOT, f)))) return '';
  const runs = fs.readFileSync(path.join(E76_ROOT, 'RUNS_EDGE_PROFIT_ENVELOPE_X2.md'), 'utf8');
  const run1 = (runs.match(/run1_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  const run2 = (runs.match(/run2_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  if (!run1 || !run2) return '';
  return sha256Text([
    `## E75_BINDING\n${JSON.stringify(bind)}\n`,
    `## RUNS\n${runs}`,
    `## MATERIALS\n${fs.readFileSync(path.join(E76_ROOT, 'MATERIALS.md'), 'utf8')}`,
    `## EXEC_RECON_OBSERVED\n${fs.readFileSync(path.join(E76_ROOT, 'EXEC_RECON_OBSERVED.md'), 'utf8')}`,
    `## EDGE_PROFIT_ENVELOPE\n${fs.readFileSync(path.join(E76_ROOT, 'EDGE_PROFIT_ENVELOPE.md'), 'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE76()}`
  ].join('\n'));
}

export function rewriteSumsE76() {
  const rows = fs.readdirSync(E76_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort()
    .map((f) => {
      const abs = path.join(E76_ROOT, f);
      const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
      return `${sha256File(abs)}  ${rel}`;
    });
  writeMd(path.join(E76_ROOT, 'SHA256SUMS.md'), `# E76 SHA256SUMS\n\n${rows.join('\n')}`);
}

export function verifySumsE76() {
  const raw = fs.readFileSync(path.join(E76_ROOT, 'SHA256SUMS.md'), 'utf8');
  if (!/\sreports\/evidence\/E76\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E76\/VERDICT\.md$/m.test(raw)) throw new Error('sha rows missing closeout/verdict');
  if (/\sreports\/evidence\/E76\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  for (const line of raw.split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
    const [h, rel] = line.split(/\s{2}/);
    if (sha256File(path.resolve(rel)) !== h) throw new Error(`sha mismatch ${rel}`);
  }
}
