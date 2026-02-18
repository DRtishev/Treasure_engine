#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E112_ROOT, anchorsE112, evidenceFingerprintE112, isCITruthy, modeState, writeMdAtomic } from './e112_lib.mjs';

const update = process.env.UPDATE_E112_EVIDENCE === '1';
const run = (cmd) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, TZ: 'UTC', LANG: 'C', LC_ALL: 'C' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E112_STEP_FAIL:${cmd.join(' ')}`);
};

if (update && !isCITruthy()) {
  fs.mkdirSync(E112_ROOT, { recursive: true });
  run(['node', 'scripts/data/e112_net_proof.mjs']);
  run(['node', 'scripts/data/e112_fetch_capsules.mjs']);
  run(['node', 'scripts/data/e112_normalize_canonical_jsonl.mjs']);
  run(['node', 'scripts/contracts/e112_data_quorum_v4.mjs']);
  run(['node', 'scripts/data/e112_pin_snapshot.mjs']);
  run(['node', 'scripts/contracts/e112_snapshot_integrity_contract.mjs']);
  run(['node', 'scripts/data/e112_snapshot_lock.mjs']);
  run(['node', 'scripts/report/e112_exec_calibration_report.mjs']);
  run(['node', 'scripts/contracts/e112_gap_cost_contract_v2.mjs']);
  run(['node', 'scripts/harvest/e112_harvest_v4.mjs']);
  run(['node', 'scripts/contracts/e112_candidate_minimums_v2.mjs']);
  run(['node', 'scripts/live/e112_graduation_bite.mjs']);
  run(['node', 'scripts/report/e112_daily_report.mjs']);
  run(['node', 'scripts/contracts/e112_live_safety_v2.mjs']);
  run(['node', 'scripts/contracts/e112_net_mode_contract.mjs']);
  run(['node', 'scripts/contracts/e112_net_proof_contract.mjs']);

  writeMdAtomic(path.join(E112_ROOT, 'CONTRACTS_SUMMARY.md'), [
    '# E112 CONTRACTS SUMMARY',
    '- net_mode_contract: PASS',
    '- net_proof_contract: PASS',
    '- data_quorum_v4: PASS',
    '- snapshot_integrity: PASS',
    '- gap_cost_v2: PASS',
    '- candidate_minimums_v2: PASS',
    '- live_safety_v2: PASS'
  ].join('\n'));
  writeMdAtomic(path.join(E112_ROOT, 'PERF_NOTES.md'), '# E112 PERF NOTES\n- Deterministic sequential gates, canonical jsonl, atomic snapshot writes.');

  writeMdAtomic(path.join(E112_ROOT, 'CLOSEOUT.md'), '# E112 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMdAtomic(path.join(E112_ROOT, 'VERDICT.md'), '# E112 VERDICT\n- canonical_fingerprint: pending');
  rewriteSums(E112_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

  let canon = evidenceFingerprintE112();
  const mode = modeState();
  const verdict = mode === 'ONLINE_OPTIONAL' && /verdict:\s*WARN/m.test(fs.readFileSync(path.join(E112_ROOT, 'REALITY_FUEL.md'), 'utf8')) ? 'WARN' : 'PASS';
  writeMdAtomic(path.join(E112_ROOT, 'CLOSEOUT.md'), [
    '# E112 CLOSEOUT',
    '## Anchors',
    ...Object.entries(anchorsE112()).map(([k, v]) => `- ${k}: ${v}`),
    `- mode: ${mode}`,
    `- verdict: ${verdict}`,
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  writeMdAtomic(path.join(E112_ROOT, 'VERDICT.md'), [
    '# E112 VERDICT',
    `- status: ${verdict}`,
    `- mode: ${mode}`,
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  rewriteSums(E112_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE112();
  writeMdAtomic(path.join(E112_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E112_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E112_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E112_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E112_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  console.log('e112_evidence update: PASS');
  process.exit(0);
}

const req = [
  'PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'REALITY_FUEL.md', 'NET_PROOF.md', 'DATA_QUORUM_V4.md',
  'CAPSULE_MANIFEST.md', 'SNAPSHOT_LOCK.md', 'SNAPSHOT_INTEGRITY.md', 'EXEC_CALIBRATION.md', 'GAP_COST_REPORT.md',
  'CANDIDATE_BOARD_V4.md', 'COURT_VERDICTS.md', 'GRADUATION_BITE.md', 'LEDGER_SUMMARY.md', 'DAILY_REPORT.md',
  'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'
];
for (const f of req) if (!fs.existsSync(path.join(E112_ROOT, f))) throw new Error(`E112_MISSING_EVIDENCE:${f}`);
verifySums(path.join(E112_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E112/SHA256SUMS.md']);
const canon = evidenceFingerprintE112();
const c = fs.readFileSync(path.join(E112_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E112_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E112_CANONICAL_MISMATCH');
console.log('e112_evidence verify: PASS');
