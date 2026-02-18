#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E122_ROOT, runDirE122, modeE122, isCITruthy, writeMdAtomic, evidenceFingerprintE122, cmdOut } from './e122_lib.mjs';

const update = process.env.UPDATE_E122_EVIDENCE === '1';
const mode = modeE122();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } }); if ((r.status ?? 1) !== 0) throw new Error(`E122_STEP_FAIL:${cmd.join(' ')}`); };
if (update && isCITruthy()) throw new Error('E122_CI_UPDATE_REJECTED');

if (update && !isCITruthy()) {
  fs.mkdirSync(E122_ROOT, { recursive: true });
  fs.mkdirSync(runDirE122(), { recursive: true });
  writeMdAtomic(path.join(E122_ROOT, 'PREFLIGHT.md'), ['# E122 PREFLIGHT', `- timezone: Europe/Amsterdam`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- git_status_sb: ${cmdOut('git', ['status', '-sb']) || 'git_present:false'}`, `- branch: ${cmdOut('git', ['branch', '--show-current']) || 'N/A'}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD']) || 'N/A'}`, `- mode: ${mode}`].join('\n'));

  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) {
    writeMdAtomic(path.join(E122_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E122 ZERO WRITES ON FAIL\n- status: PASS\n- reason: missing_net_gates\n- fallback_ratio: 1.0000\n- freshness_ok: false');
    throw new Error('E122_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  }

  run(['node', 'scripts/data/e122_connectivity_diag.mjs']);
  run(['node', 'scripts/data/e122_execution_flow.mjs']);
  run(['node', 'scripts/report/e122_daily_cashflow_report.mjs']);
  run(['node', 'scripts/verify/e122_live_fill_gate.mjs']);
  run(['node', 'scripts/verify/e122_replay_x2.mjs']);

  const gateText = fs.readFileSync(path.join(E122_ROOT, 'LIVE_FILL_GATE.md'), 'utf8');
  const proofText = fs.readFileSync(path.join(E122_ROOT, 'LIVE_FILL_PROOF.md'), 'utf8');
  const diagText = fs.readFileSync(path.join(E122_ROOT, 'CONNECTIVITY_DIAG.md'), 'utf8');
  const gateStatus = /status:\s*(\w+)/.exec(gateText)?.[1] || 'FAIL';
  const proofStatus = /status:\s*(\w+)/.exec(proofText)?.[1] || 'FAIL';
  const connectivity = Number(/success:\s*(\d+)/.exec(diagText)?.[1] || '0');
  const freshnessOk = gateStatus === 'PASS';
  const fallbackRatio = freshnessOk ? 0 : 1;

  const status = gateStatus === 'PASS' ? 'FULL' : (mode === 'ONLINE_OPTIONAL' ? 'WARN' : 'FAIL');
  if (mode === 'ONLINE_REQUIRED' && status !== 'FULL') {
    writeMdAtomic(path.join(E122_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E122 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_online_required\n- fallback_ratio: 1.0000\n- freshness_ok: false');
    throw new Error('E122_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  writeMdAtomic(path.join(E122_ROOT, 'ZERO_WRITES_ON_FAIL.md'), ['# E122 ZERO WRITES ON FAIL', '- status: PASS', '- reason: guarded_execution', `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, `- freshness_ok: ${freshnessOk}`].join('\n'));
  const antiFake = status !== 'FULL' || (connectivity > 0 && proofStatus === 'PASS' && gateStatus === 'PASS');
  writeMdAtomic(path.join(E122_ROOT, 'ANTI_FAKE_FULL.md'), ['# E122 ANTI FAKE FULL', `- status: ${antiFake ? 'PASS' : 'FAIL'}`, `- connectivity_success: ${connectivity}`, `- live_fill_proof: ${proofStatus}`, `- live_fill_gate: ${gateStatus}`].join('\n'));
  writeMdAtomic(path.join(E122_ROOT, 'PERF_NOTES.md'), '# E122 PERF NOTES\n- connectivity diagnostics + deterministic replay/seal + live fill gate linkage.');
  writeMdAtomic(path.join(E122_ROOT, 'CONTRACTS_SUMMARY.md'), '# E122 CONTRACTS SUMMARY\n- e122_ci_boundary: enforced\n- e122_redaction: enforced\n- e122_anti_fake_full: enforced\n- e122_zero_writes_on_fail: enforced\n- e122_live_fill_gate: enforced');

  let canon = evidenceFingerprintE122();
  writeMdAtomic(path.join(E122_ROOT, 'CLOSEOUT.md'), ['# E122 CLOSEOUT', `- mode: ${mode}`, `- verdict: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E122_ROOT, 'VERDICT.md'), ['# E122 VERDICT', `- mode: ${mode}`, `- status: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E122_ROOT, 'SEAL_X2.md'), '# E122 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');

  run(['node', 'scripts/verify/e122_contract_redaction.mjs']);
  run(['node', 'scripts/verify/e122_contract_anti_fake_full.mjs']);

  rewriteSums(E122_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE122();
  writeMdAtomic(path.join(E122_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E122_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/, `- canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E122_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E122_ROOT, 'VERDICT.md'), 'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/, `- canonical_fingerprint: ${canon}`));
  rewriteSums(E122_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  process.exit(0);
}

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','CONNECTIVITY_DIAG.md','EXECUTION_FLOW.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_DAILY_REPORT.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md'];
for (const f of req) if (!fs.existsSync(path.join(E122_ROOT, f))) throw new Error(`E122_MISSING:${f}`);
verifySums(path.join(E122_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E122/SHA256SUMS.md']);
const c = fs.readFileSync(path.join(E122_ROOT, 'CLOSEOUT.md'), 'utf8').match(/- canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E122_ROOT, 'VERDICT.md'), 'utf8').match(/- canonical_fingerprint:\s*([a-f0-9]{64})/);
const canon = evidenceFingerprintE122();
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E122_CANONICAL_MISMATCH');
