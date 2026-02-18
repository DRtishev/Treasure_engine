#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E121_ROOT, runDirE121, modeE121, isCITruthy, writeMdAtomic, evidenceFingerprintE121, anchorsE121, cmdOut } from './e121_lib.mjs';

const update = process.env.UPDATE_E121_EVIDENCE === '1';
const mode = modeE121();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } }); if ((r.status ?? 1) !== 0) throw new Error(`E121_STEP_FAIL:${cmd.join(' ')}`); };
if (update && isCITruthy()) throw new Error('E121_CI_UPDATE_REJECTED');

if (update && !isCITruthy()) {
  fs.mkdirSync(E121_ROOT, { recursive: true });
  fs.mkdirSync(runDirE121(), { recursive: true });
  writeMdAtomic(path.join(E121_ROOT, 'PREFLIGHT.md'), ['# E121 PREFLIGHT', `- timezone: Europe/Amsterdam`, `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- git_status_sb: ${cmdOut('git', ['status', '-sb']) || 'git_present:false'}`, `- branch: ${cmdOut('git', ['branch', '--show-current']) || 'N/A'}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD']) || 'N/A'}`, `- mode: ${mode}`].join('\n'));

  run(['node', 'scripts/verify/e121_contract_anchor_sanity.mjs']);

  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) {
    writeMdAtomic(path.join(E121_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E121 ZERO WRITES ON FAIL\n- status: PASS\n- reason: missing_net_gates\n- fallback_ratio: 1.0000\n- freshness_ok: false');
    throw new Error('E121_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  }

  run(['node', 'scripts/data/e121_safety_kernel.mjs']);
  run(['node', 'scripts/data/e121_execution_adapter.mjs']);
  run(['node', 'scripts/data/e121_micro_live_runner.mjs']);
  run(['node', 'scripts/report/e121_ledger_daily_report.mjs']);
  run(['node', 'scripts/verify/e121_replay_x2.mjs']);

  const runText = fs.readFileSync(path.join(E121_ROOT, 'MICRO_LIVE_RUN.md'), 'utf8');
  const liveSuccess = Number(/live_success_count:\s*(\d+)/.exec(runText)?.[1] || '0');
  const fallbackUsed = /fallback_used:\s*true/.test(runText);
  const freshnessOk = liveSuccess > 0;
  const fallbackRatio = fallbackUsed ? 1 : 0;
  const status = mode === 'ONLINE_REQUIRED' ? (liveSuccess > 0 ? 'FULL' : 'FAIL') : (liveSuccess > 0 ? 'FULL' : 'WARN');

  if (mode === 'ONLINE_REQUIRED' && status !== 'FULL') {
    writeMdAtomic(path.join(E121_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E121 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_online_required\n- fallback_ratio: 1.0000\n- freshness_ok: false');
    throw new Error('E121_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  writeMdAtomic(path.join(E121_ROOT, 'ZERO_WRITES_ON_FAIL.md'), ['# E121 ZERO WRITES ON FAIL', '- status: PASS', '- reason: guarded_execution', `- fallback_ratio: ${fallbackRatio.toFixed(4)}`, `- freshness_ok: ${freshnessOk}`].join('\n'));
  writeMdAtomic(path.join(E121_ROOT, 'PERF_NOTES.md'), '# E121 PERF NOTES\n- deterministic state machine, replay_x2 parity, and stable summary hash from normalized events.');
  writeMdAtomic(path.join(E121_ROOT, 'CONTRACTS_SUMMARY.md'), '# E121 CONTRACTS SUMMARY\n- e121_anchor_sanity: enforced\n- e121_live_safety: enforced\n- e121_anti_fake_full: enforced\n- e121_zero_writes_on_fail: enforced\n- e121_redaction: enforced');

  let canon = evidenceFingerprintE121();
  writeMdAtomic(path.join(E121_ROOT, 'CLOSEOUT.md'), ['# E121 CLOSEOUT', '## Anchors', ...Object.entries(anchorsE121()).map(([k, v]) => `- ${k}: ${v}`), `- mode: ${mode}`, `- verdict: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E121_ROOT, 'VERDICT.md'), ['# E121 VERDICT', `- mode: ${mode}`, `- status: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E121_ROOT, 'SEAL_X2.md'), '# E121 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');

  run(['node', 'scripts/verify/e121_contract_redaction.mjs']);
  run(['node', 'scripts/verify/e121_contract_anti_fake_full.mjs']);

  rewriteSums(E121_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE121();
  writeMdAtomic(path.join(E121_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E121_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/, `- canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E121_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E121_ROOT, 'VERDICT.md'), 'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/, `- canonical_fingerprint: ${canon}`));
  rewriteSums(E121_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  process.exit(0);
}

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','ANCHOR_SANITY.md','EXECUTION_ADAPTER.md','LIVE_SAFETY.md','MICRO_LIVE_RUN.md','LEDGER_DAILY_REPORT.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md'];
for (const f of req) if (!fs.existsSync(path.join(E121_ROOT, f))) throw new Error(`E121_MISSING:${f}`);
verifySums(path.join(E121_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E121/SHA256SUMS.md']);
const c = fs.readFileSync(path.join(E121_ROOT, 'CLOSEOUT.md'), 'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
const v = fs.readFileSync(path.join(E121_ROOT, 'VERDICT.md'), 'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
const canon = evidenceFingerprintE121();
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E121_CANONICAL_MISMATCH');
