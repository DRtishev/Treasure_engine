#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E77_ROOT = path.resolve('reports/evidence/E77');
export const E77_LOCK_PATH = path.resolve('.foundation-seal/E77_KILL_LOCK.md');

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
export function defaultNormalizedEnv() { return { TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000', SEED: String(process.env.SEED || '12345') }; }
export function readCanonicalFingerprintFromMd(filePath) { if (!fs.existsSync(filePath)) return ''; const m = fs.readFileSync(filePath, 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i); return m ? m[1] : ''; }

export function readE76Binding() {
  const c = readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E76/CLOSEOUT.md'));
  const v = readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E76/VERDICT.md'));
  if (!c || !v || c !== v) throw new Error('E76 canonical mismatch');
  return { e76_canonical_fingerprint: c };
}

export function readSumsCoreTextE77() {
  const p = path.join(E77_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(p)) return '';
  const raw = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E77/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E77/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E77/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}

export function evidenceFingerprintE77() {
  const bind = readE76Binding();
  const req = ['MATERIALS.md', 'EXEC_RECON_MULTI.md', 'CALIBRATION_COURT.md', 'EDGE_CANARY.md', 'RUNS_EDGE_CANARY_X2.md', 'WOW_USAGE.md'];
  if (req.some((f) => !fs.existsSync(path.join(E77_ROOT, f)))) return '';
  return sha256Text([
    `## E76_BINDING\n${JSON.stringify(bind)}\n`,
    `## MATERIALS\n${fs.readFileSync(path.join(E77_ROOT, 'MATERIALS.md'), 'utf8')}`,
    `## EXEC_RECON_MULTI\n${fs.readFileSync(path.join(E77_ROOT, 'EXEC_RECON_MULTI.md'), 'utf8')}`,
    `## CALIBRATION_COURT\n${fs.readFileSync(path.join(E77_ROOT, 'CALIBRATION_COURT.md'), 'utf8')}`,
    `## EDGE_CANARY\n${fs.readFileSync(path.join(E77_ROOT, 'EDGE_CANARY.md'), 'utf8')}`,
    `## RUNS_EDGE_CANARY_X2\n${fs.readFileSync(path.join(E77_ROOT, 'RUNS_EDGE_CANARY_X2.md'), 'utf8')}`,
    `## WOW_USAGE\n${fs.readFileSync(path.join(E77_ROOT, 'WOW_USAGE.md'), 'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE77()}`
  ].join('\n'));
}

export function rewriteSumsE77() {
  const lines = fs.readdirSync(E77_ROOT).filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md').sort().map((f) => {
    const abs = path.join(E77_ROOT, f);
    const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
    return `${sha256File(abs)}  ${rel}`;
  });
  writeMd(path.join(E77_ROOT, 'SHA256SUMS.md'), `# E77 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE77() {
  const raw = fs.readFileSync(path.join(E77_ROOT, 'SHA256SUMS.md'), 'utf8');
  if (!/\sreports\/evidence\/E77\/CLOSEOUT\.md$/m.test(raw) || !/\sreports\/evidence\/E77\/VERDICT\.md$/m.test(raw)) throw new Error('sha rows missing closeout/verdict');
  if (/\sreports\/evidence\/E77\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  for (const line of raw.split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
    const [h, rel] = line.split(/\s{2}/);
    if (sha256File(path.resolve(rel)) !== h) throw new Error(`sha mismatch ${rel}`);
  }
}
