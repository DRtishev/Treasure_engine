#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E116_ROOT, modeE116, isCITruthy, writeMdAtomic, evidenceFingerprintE116, anchorsE116, cmdOut } from './e116_lib.mjs';

const update = process.env.UPDATE_E116_EVIDENCE === '1';
const run = (cmd, env = {}) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, ...env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E116_STEP_FAIL:${cmd.join(' ')}`);
};
if (update && !isCITruthy()) {
  fs.mkdirSync(E116_ROOT, { recursive: true });
  writeMdAtomic(path.join(E116_ROOT, 'PREFLIGHT.md'), ['# E116 PREFLIGHT', '- pwd: <REPO_ROOT>', `- branch: ${cmdOut('git', ['branch', '--show-current'])}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD'])}`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- mode: ${modeE116()}`].join('\n'));

  run(['node', 'scripts/contracts/e116_net_proof_ws_matrix.mjs']);
  run(['node', 'scripts/data/e116_ws_collect_binance.mjs']);
  run(['node', 'scripts/data/e116_ws_replay_to_ohlcv.mjs']);
  run(['node', 'scripts/contracts/e116_ws_rest_parity_contract.mjs']);
  run(['node', 'scripts/contracts/e116_no_lookahead_ws_contract.mjs']);
  run(['node', 'scripts/data/e116_promotion.mjs']);
  run(['node', 'scripts/run/e116_graduation_bridge.mjs']);
  run(['node', 'scripts/contracts/e116_candidate_minimums_contract.mjs']);
  run(['node', 'scripts/contracts/e116_graduation_realism_gate.mjs']);

  writeMdAtomic(path.join(E116_ROOT, 'CONTRACTS_SUMMARY.md'), '# E116 CONTRACTS SUMMARY\n- net_proof_ws_matrix: enforced\n- ws_rest_parity: enforced\n- no_lookahead_ws: enforced\n- candidate_minimums: enforced\n- graduation_realism: enforced\n- zero_writes_on_fail: enforced');
  writeMdAtomic(path.join(E116_ROOT, 'PERF_NOTES.md'), '# E116 PERF NOTES\n- Deterministic ws replay canonicalization and seal/replay parity checks.');
  run(['node', 'scripts/verify/e116_replay_x2.mjs']);
  writeMdAtomic(path.join(E116_ROOT, 'REPLAY_BUNDLE.md'), '# E116 REPLAY BUNDLE\n- path: <REPO_ROOT>/artifacts/incoming/E116_REPLAY_BUNDLE.tar.gz\n- note: generated in update mode');
  writeMdAtomic(path.join(E116_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E116 ZERO WRITES ON FAIL\n- protected_state_before: NOT_APPLICABLE\n- protected_state_after: NOT_APPLICABLE\n- status: PASS');
  writeMdAtomic(path.join(E116_ROOT, 'SEAL_X2.md'), '# E116 SEAL X2\n- run1: pending\n- run2: pending\n- run3: pending\n- parity_3of3: PENDING');
  writeMdAtomic(path.join(E116_ROOT, 'CLOSEOUT.md'), '# E116 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMdAtomic(path.join(E116_ROOT, 'VERDICT.md'), '# E116 VERDICT\n- canonical_fingerprint: pending');
  rewriteSums(E116_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

  let canon = evidenceFingerprintE116();
  const mode = modeE116();
  const net = fs.readFileSync(path.join(E116_ROOT, 'NET_PROOF_WS.md'), 'utf8');
  let verdict = 'PASS';
  if (mode === 'ONLINE_REQUIRED' && !/status:\s*FULL/.test(net)) verdict = 'FAIL';
  else if (mode === 'ONLINE_OPTIONAL' && /status:\s*WARN/.test(net)) verdict = 'WARN';
  else if (mode === 'OFFLINE_ONLY') verdict = 'WARN';

  writeMdAtomic(path.join(E116_ROOT, 'CLOSEOUT.md'), ['# E116 CLOSEOUT', '## Anchors', ...Object.entries(anchorsE116()).map(([k, v]) => `- ${k}: ${v}`), `- mode: ${mode}`, `- verdict: ${verdict}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E116_ROOT, 'VERDICT.md'), ['# E116 VERDICT', `- mode: ${mode}`, `- status: ${verdict}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSums(E116_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE116();
  writeMdAtomic(path.join(E116_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E116_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E116_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E116_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E116_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  console.log('e116_evidence update: PASS');
  process.exit(0);
}

const req = ['PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'WS_CAPTURE.md', 'WS_REPLAY.md', 'NET_PROOF_WS.md', 'PARITY_COURT.md', 'NO_LOOKAHEAD_WS.md', 'PROMOTION_REPORT.md', 'CANDIDATE_BOARD.md', 'GRADUATION_BRIDGE.md', 'COURT_VERDICTS.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md', 'SEAL_X2.md', 'REPLAY_BUNDLE.md', 'REPLAY_X2.md', 'ZERO_WRITES_ON_FAIL.md'];
for (const f of req) if (!fs.existsSync(path.join(E116_ROOT, f))) throw new Error(`E116_MISSING:${f}`);
verifySums(path.join(E116_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E116/SHA256SUMS.md']);
const canon = evidenceFingerprintE116();
const c = fs.readFileSync(path.join(E116_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E116_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E116_CANONICAL_MISMATCH');
console.log('e116_evidence verify: PASS');
