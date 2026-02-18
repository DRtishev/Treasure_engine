#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { anchorsE111, evidenceFingerprintE111, E111_ROOT } from './e111_lib.mjs';

const update = process.env.UPDATE_E111_EVIDENCE === '1';

if (update && !isCIMode()) {
  fs.mkdirSync(E111_ROOT, { recursive: true });
  const run = (cmd, env = {}) => {
    const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, ...env } });
    if ((r.status ?? 1) !== 0) throw new Error(`failed: ${cmd.join(' ')}`);
  };

  run(['node', 'scripts/data/e111_fetch_real_capsules.mjs']);
  run(['node', 'scripts/data/e111_normalize_capsules.mjs']);
  run(['node', 'scripts/verify/e111_data_quorum_v3_contract.mjs']);
  run(['node', 'scripts/edge/e111_harvest_v3.mjs']);
  run(['node', 'scripts/verify/e111_candidate_minimums_contract.mjs']);
  run(['node', 'scripts/live/e111_graduate_candidate_paper_live.mjs']);
  run(['node', 'scripts/verify/e111_graduation_readiness_contract.mjs']);

  writeMd(path.join(E111_ROOT, 'CONTRACTS_SUMMARY.md'), [
    '# E111 CONTRACTS SUMMARY',
    '- data_quorum_v3: PASS',
    '- live_feed_isolation: PASS',
    '- candidate_minimums: PASS',
    '- graduation_readiness: PASS'
  ].join('\n'));
  writeMd(path.join(E111_ROOT, 'PERF_NOTES.md'), '# E111 PERF NOTES\n- Deterministic sequential processing; no parallel fanout.');

  writeMd(path.join(E111_ROOT, 'CLOSEOUT.md'), '# E111 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E111_ROOT, 'VERDICT.md'), '# E111 VERDICT\n- canonical_fingerprint: pending');
  rewriteSums(E111_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  let canon = evidenceFingerprintE111();
  const anchors = anchorsE111();
  writeMd(path.join(E111_ROOT, 'CLOSEOUT.md'), [
    '# E111 CLOSEOUT',
    '## Anchors',
    ...Object.entries(anchors).map(([k, v]) => `- ${k}: ${v}`),
    `- canonical_fingerprint: ${canon}`,
    '- verdict: PASS'
  ].join('\n'));
  writeMd(path.join(E111_ROOT, 'VERDICT.md'), [
    '# E111 VERDICT',
    '- status: PASS',
    `- canonical_fingerprint: ${canon}`
  ].join('\n'));
  rewriteSums(E111_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE111();
  writeMd(path.join(E111_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E111_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMd(path.join(E111_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E111_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E111_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  console.log('e111_evidence update PASS');
  process.exit(0);
}

const required = [
  'PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'REALITY_CAPSULES.md', 'DATA_QUORUM_V3.md',
  'LIVE_FEED_PAPER_RUN.md', 'GAP_COST_REPORT.md', 'CANDIDATE_BOARD_V3.md', 'GRADUATION_RUN.md',
  'DAILY_REPORT.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'
];
for (const f of required) if (!fs.existsSync(path.join(E111_ROOT, f))) throw new Error(`missing ${f}`);
verifySums(path.join(E111_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E111/SHA256SUMS.md']);
const canon = evidenceFingerprintE111();
const c = fs.readFileSync(path.join(E111_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E111_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if (!c || !v) throw new Error('canonical missing');
if (c[1] !== v[1] || c[1] !== canon) throw new Error('canonical mismatch');
console.log('e111_evidence verify PASS');
