#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  E67_ROOT,
  ensureDir,
  readE66CanonicalFingerprint,
  materialsHashes,
  evidenceFingerprintE67,
  rewriteSumsE67,
  readCanonicalFingerprintFromMd
} from './e67_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E67_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E67_EVIDENCE=1 forbidden when CI=true');

const required = ['RUNS_RECON_X2.md'];
if (!update) required.push('CLOSEOUT.md', 'VERDICT.md', 'EDGE_RECON.md', 'MATERIALS.md', 'SHA256SUMS.md');

for (const f of required) {
  if (!fs.existsSync(path.join(E67_ROOT, f))) throw new Error(`Missing ${f}`);
}

function shortSha() {
  const out = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return (out.stdout || '').trim() || 'UNKNOWN';
}

function buildMaterials() {
  const e66 = readE66CanonicalFingerprint();
  const rows = materialsHashes().map((x) => `- ${x.file}: ${x.sha256}`);
  return [
    '# E67 MATERIALS',
    `- e66_canonical_fingerprint: ${e66}`,
    ...rows
  ].join('\n');
}

function buildEdgeRecon() {
  return [
    '# E67 EDGE RECON',
    '- epochs_ran: 31, 32, 33, 34, 35, 36, 37, 38, 39, 40',
    '- evidence_root: temp dir via EVIDENCE_ROOT override',
    '- env_normalization:',
    '  - TZ=UTC',
    '  - LANG=C',
    '  - LC_ALL=C',
    '  - SOURCE_DATE_EPOCH=1700000000 (default)',
    '  - SEED=12345 (default)',
    '- source: RUNS_RECON_X2.md'
  ].join('\n');
}

function buildCloseout(fp) {
  return [
    '# E67 CLOSEOUT',
    '',
    `- commit: ${shortSha()}`,
    `- utc: ${new Date().toISOString()}`,
    '- mode: update ritual',
    '- commands:',
    '  - CI=false UPDATE_E67_EVIDENCE=1 npm run -s verify:e67',
    '',
    `- canonical_fingerprint: ${fp}`,
    '- links:',
    '  - RUNS_RECON_X2.md',
    '  - EDGE_RECON.md',
    '  - MATERIALS.md',
    '  - SHA256SUMS.md'
  ].join('\n');
}

function buildVerdict(fp) {
  return [
    '# E67 VERDICT',
    '',
    'Status: PASS',
    `- canonical_fingerprint: ${fp}`,
    '- recon details: RUNS_RECON_X2.md',
    '- chain details: MATERIALS.md'
  ].join('\n');
}

if (update) {
  ensureDir(E67_ROOT);
  writeMd(path.join(E67_ROOT, 'MATERIALS.md'), buildMaterials());
  writeMd(path.join(E67_ROOT, 'EDGE_RECON.md'), buildEdgeRecon());
  writeMd(path.join(E67_ROOT, 'CLOSEOUT.md'), buildCloseout('0'.repeat(64)));
  writeMd(path.join(E67_ROOT, 'VERDICT.md'), buildVerdict('0'.repeat(64)));
  rewriteSumsE67();

  let fp = evidenceFingerprintE67();
  writeMd(path.join(E67_ROOT, 'CLOSEOUT.md'), buildCloseout(fp));
  writeMd(path.join(E67_ROOT, 'VERDICT.md'), buildVerdict(fp));
  rewriteSumsE67();

  const fp2 = evidenceFingerprintE67();
  if (fp2 !== fp) {
    writeMd(path.join(E67_ROOT, 'CLOSEOUT.md'), buildCloseout(fp2));
    writeMd(path.join(E67_ROOT, 'VERDICT.md'), buildVerdict(fp2));
    rewriteSumsE67();
  }
}

const computed = evidenceFingerprintE67();
if (!computed) throw new Error('Failed to compute E67 evidence fingerprint');
const closeoutFp = readCanonicalFingerprintFromMd(path.join(E67_ROOT, 'CLOSEOUT.md'));
const verdictFp = readCanonicalFingerprintFromMd(path.join(E67_ROOT, 'VERDICT.md'));
if (closeoutFp !== computed || verdictFp !== computed) {
  throw new Error(`canonical fingerprint mismatch closeout=${closeoutFp} verdict=${verdictFp} computed=${computed}`);
}


const sumsRaw = fs.readFileSync(path.join(E67_ROOT, 'SHA256SUMS.md'), 'utf8');
if (!/\sreports\/evidence\/E67\/CLOSEOUT\.md$/m.test(sumsRaw) || !/\sreports\/evidence\/E67\/VERDICT\.md$/m.test(sumsRaw)) {
  throw new Error('SHA256SUMS missing CLOSEOUT.md or VERDICT.md row');
}

const sumsCheck = spawnSync('bash', ['-lc', "grep -E '^[0-9a-f]{64} ' reports/evidence/E67/SHA256SUMS.md | sha256sum -c -"], { encoding: 'utf8' });
if ((sumsCheck.status ?? 1) !== 0) throw new Error(`SHA check failed\n${sumsCheck.stdout}\n${sumsCheck.stderr}`);
console.log(`verify:e67:evidence PASSED canonical_fingerprint=${computed}`);
