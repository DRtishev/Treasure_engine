#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E120_ROOT, runDirE120, modeE120, isCITruthy, writeMdAtomic, evidenceFingerprintE120, anchorsE120, cmdOut } from './e120_lib.mjs';

const update = process.env.UPDATE_E120_EVIDENCE === '1';
const mode = modeE120();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } }); if ((r.status ?? 1) !== 0) throw new Error(`E120_STEP_FAIL:${cmd.join(' ')}`); };

if (update && !isCITruthy()) {
  fs.mkdirSync(E120_ROOT, { recursive: true });
  fs.mkdirSync(runDirE120(), { recursive: true });
  writeMdAtomic(path.join(E120_ROOT, 'PREFLIGHT.md'), ['# E120 PREFLIGHT', `- timezone: Europe/Amsterdam`, `- branch: ${cmdOut('git', ['branch', '--show-current'])}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD'])}`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- mode: ${mode}`].join('\n'));

  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) {
    writeMdAtomic(path.join(E120_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E120 ZERO WRITES ON FAIL\n- status: PASS\n- reason: missing_net_gates\n- fallback_ratio: 1.0000\n- freshness_ok: false');
    throw new Error('E120_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  }

  run(['node', 'scripts/data/e120_execution_adapter.mjs']);
  run(['node', 'scripts/data/e120_safety_kernel.mjs']);
  run(['node', 'scripts/data/e120_micro_live_runner.mjs']);
  run(['node', 'scripts/report/e120_ledger_daily_report.mjs']);

  const runText = fs.readFileSync(path.join(E120_ROOT, 'MICRO_LIVE_RUN.md'), 'utf8');
  const liveSuccess = Number(/live_success_count:\s*(\d+)/.exec(runText)?.[1] || '0');
  const freshnessOk = liveSuccess > 0;
  const fallbackRatio = liveSuccess > 0 ? 0 : 1;
  const status = mode === 'ONLINE_REQUIRED' ? (liveSuccess > 0 ? 'FULL' : 'FAIL') : (liveSuccess > 0 ? 'FULL' : 'WARN');

  if (mode === 'ONLINE_REQUIRED' && status !== 'FULL') {
    writeMdAtomic(path.join(E120_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E120 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_online_required\n- fallback_ratio: 1.0000\n- freshness_ok: false');
    throw new Error('E120_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  run(['node', 'scripts/data/e120_replay_bundle.mjs']);
  run(['node', 'scripts/verify/e120_replay_x2.mjs']);
  run(['node', 'scripts/verify/e120_replay_determinism_contract.mjs']);

  writeMdAtomic(path.join(E120_ROOT, 'ZERO_WRITES_ON_FAIL.md'), ['# E120 ZERO WRITES ON FAIL', '- status: PASS', '- reason: guarded_execution', `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, `- freshness_ok: ${freshnessOk}`].join('\n'));
  writeMdAtomic(path.join(E120_ROOT, 'PERF_NOTES.md'), '# E120 PERF NOTES\n- deterministic micro-live summary hash and replay parity checks.');
  writeMdAtomic(path.join(E120_ROOT, 'CONTRACTS_SUMMARY.md'), '# E120 CONTRACTS SUMMARY\n- e120_ci_boundary: enforced\n- e120_live_safety: enforced\n- e120_anti_fake_full: enforced\n- e120_zero_writes_on_fail: enforced\n- e120_secrets_redaction: enforced\n- e120_replay_determinism: enforced');

  let canon = evidenceFingerprintE120();
  writeMdAtomic(path.join(E120_ROOT, 'CLOSEOUT.md'), ['# E120 CLOSEOUT', '## Anchors', ...Object.entries(anchorsE120()).map(([k, v]) => `- ${k}: ${v}`), `- mode: ${mode}`, `- verdict: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E120_ROOT, 'VERDICT.md'), ['# E120 VERDICT', `- mode: ${mode}`, `- status: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E120_ROOT, 'SEAL_X2.md'), '# E120 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');

  run(['node', 'scripts/verify/e120_live_safety_contract.mjs']);
  run(['node', 'scripts/verify/e120_zero_writes_on_fail_contract.mjs']);
  run(['node', 'scripts/verify/e120_anti_fake_full_contract.mjs']);
  run(['node', 'scripts/verify/e120_secrets_redaction_contract.mjs']);

  rewriteSums(E120_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE120();
  writeMdAtomic(path.join(E120_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E120_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E120_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E120_ROOT, 'VERDICT.md'), 'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/, `canonical_fingerprint: ${canon}`));
  rewriteSums(E120_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  process.exit(0);
}

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EXECUTION_ADAPTER.md','LIVE_SAFETY.md','MICRO_LIVE_RUN.md','LEDGER_DAILY_REPORT.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
for (const f of req) if (!fs.existsSync(path.join(E120_ROOT, f))) throw new Error(`E120_MISSING:${f}`);
verifySums(path.join(E120_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E120/SHA256SUMS.md']);
const c = fs.readFileSync(path.join(E120_ROOT, 'CLOSEOUT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const v = fs.readFileSync(path.join(E120_ROOT, 'VERDICT.md'), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
const canon = evidenceFingerprintE120();
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E120_CANONICAL_MISMATCH');
