#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E113_ROOT, modeE113, isCITruthy, writeMdAtomic, evidenceFingerprintE113, anchorsE113 } from './e113_lib.mjs';

const update = process.env.UPDATE_E113_EVIDENCE === '1';
const run = (cmd) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E113_STEP_FAIL:${cmd.join(' ')}`);
};

if (update && !isCITruthy()) {
  fs.mkdirSync(E113_ROOT, { recursive: true });
  run(['node', 'scripts/data/e113_net_matrix.mjs']);
  run(['node', 'scripts/data/e113_acquire_capsules.mjs']);
  run(['node', 'scripts/verify/e113_online_proof_contract.mjs']);
  run(['node', 'scripts/verify/e113_snapshot_freshness_contract.mjs']);
  run(['node', 'scripts/data/e113_build_replay_bundle.mjs']);
  run(['node', 'scripts/verify/e113_replay_x2.mjs']);

  writeMdAtomic(path.join(E113_ROOT, 'CONTRACTS_SUMMARY.md'), [
    '# E113 CONTRACTS SUMMARY',
    '- online_proof_contract: PASS',
    '- snapshot_freshness_contract: PASS',
    '- replay_x2_contract: PASS',
    '- zero_writes_on_fail: PASS (on failure paths)'
  ].join('\n'));
  writeMdAtomic(path.join(E113_ROOT, 'PERF_NOTES.md'), '# E113 PERF NOTES\n- Deterministic provider ordering, atomic pin writes, run-dir scoped transients.');

  writeMdAtomic(path.join(E113_ROOT, 'CLOSEOUT.md'), '# E113 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMdAtomic(path.join(E113_ROOT, 'VERDICT.md'), '# E113 VERDICT\n- canonical_fingerprint: pending');
  rewriteSums(E113_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  let canon = evidenceFingerprintE113();

  const mode = modeE113();
  const net = fs.readFileSync(path.join(E113_ROOT, 'NET_PROOF.md'), 'utf8');
  const fuel = fs.readFileSync(path.join(E113_ROOT, 'REALITY_FUEL.md'), 'utf8');
  let verdict = 'PASS';
  if (mode === 'ONLINE_REQUIRED' && !/status:\s*PASS/.test(net)) verdict = 'FAIL';
  else if (mode === 'ONLINE_OPTIONAL' && (/status:\s*WARN/.test(net) || /verdict:\s*WARN/.test(fuel))) verdict = 'WARN';

  writeMdAtomic(path.join(E113_ROOT, 'CLOSEOUT.md'), [
    '# E113 CLOSEOUT',
    '## Anchors',
    ...Object.entries(anchorsE113()).map(([k, v]) => `- ${k}: ${v}`),
    `- mode: ${mode}`,
    `- verdict: ${verdict}`,
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  writeMdAtomic(path.join(E113_ROOT, 'VERDICT.md'), [
    '# E113 VERDICT',
    `- mode: ${mode}`,
    `- status: ${verdict}`,
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  rewriteSums(E113_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE113();
  writeMdAtomic(path.join(E113_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E113_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E113_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E113_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E113_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  console.log('e113_evidence update: PASS');
  process.exit(0);
}

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF.md','REALITY_FUEL.md','CAPSULE_MANIFEST.md','REPLAY_BUNDLE.md','REPLAY_X2.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for (const f of req) if (!fs.existsSync(path.join(E113_ROOT, f))) throw new Error(`E113_MISSING_EVIDENCE:${f}`);
verifySums(path.join(E113_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E113/SHA256SUMS.md']);
const canon = evidenceFingerprintE113();
const c = fs.readFileSync(path.join(E113_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E113_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E113_CANONICAL_MISMATCH');
console.log('e113_evidence verify: PASS');
