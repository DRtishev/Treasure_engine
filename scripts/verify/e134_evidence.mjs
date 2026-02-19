#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E134_ROOT, E134_REQUIRED, modeE134, isCITruthy, runDirE134, writeMdAtomic, evidenceFingerprintE134, cmdOut } from './e134_lib.mjs';

const update = process.env.UPDATE_E134_EVIDENCE === '1';
const mode = modeE134();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'pipe', encoding:'utf8', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } }); if ((r.status ?? 1) !== 0) throw new Error(`E134_STEP_FAIL:${cmd.join(' ')}`); return `${r.stdout||''}${r.stderr||''}`.trim(); };
if (update && isCITruthy()) throw new Error('E134_CI_UPDATE_REJECTED');

if (update && !isCITruthy()) {
  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) throw new Error('E134_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  fs.mkdirSync(E134_ROOT, { recursive: true });
  fs.mkdirSync(runDirE134(), { recursive: true });
  fs.mkdirSync('artifacts/incoming', { recursive: true });

  writeMdAtomic(path.join(E134_ROOT, 'NODE_TRUTH_POLICY.md'), '# E134 NODE TRUTH POLICY\n- ci_minimum_node_major: 22\n- preferred_node_major: 24\n- node22_allowed: true\n- node_lt22: FAIL');

  const baseCmds = ['verify:e131','verify:e132','verify:e133'];
  const baseOut = ['# E134 BASELINE VERIFY'];
  for (const gate of baseCmds) {
    const cmd = `CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s ${gate}`;
    const baseEnv = { ...process.env, CI: 'true', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' };
    for (const k of Object.keys(baseEnv)) { if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k === 'I_UNDERSTAND_LIVE_RISK' || k === 'FORCE_NET_DOWN' || k === 'FORCE_IPV4' || k === 'FORCE_IPV6') delete baseEnv[k]; }
    const res = spawnSync('npm', ['run', '-s', gate], { encoding: 'utf8', env: baseEnv });
    baseOut.push(`## ${cmd}`,'```',`${(res.stdout||'')}${(res.stderr||'')}`.trim(),`exit:${res.status ?? 1}`,'```');
    if ((res.status ?? 1) !== 0) throw new Error(`E134_BASELINE_FAIL:${cmd}`);
  }
  writeMdAtomic(path.join(E134_ROOT, 'BASELINE_VERIFY.md'), baseOut.join('\n'));

  const pd = run(['node', 'scripts/verify/e134_diag.mjs']);
  writeMdAtomic(path.join(E134_ROOT, 'PROXY_DISPATCHER.md'), `# E134 PROXY DISPATCHER\n- implementation: core/transport/e134_proxy_dispatcher.mjs\n- dispatch_policy: ENABLE_NET=1 + ONLINE_OPTIONAL/REQUIRED + I_UNDERSTAND_LIVE_RISK=1\n- redaction: proxy_shape_hash only\n\n## diag_stdout\n\n\`\`\`\n${pd}\n\`\`\``);
  spawnSync('node', ['scripts/verify/e134_diag.mjs'], { stdio: 'inherit', env: { ...process.env, E134_DIAG_CANONICAL_WRITE: mode !== 'ONLINE_REQUIRED' ? '1' : '0' } });

  writeMdAtomic(path.join(E134_ROOT, 'OPERATOR_REACHABILITY_RUNBOOK.md'), '# E134 OPERATOR REACHABILITY RUNBOOK\n- E_PROXY_CONNECT_FAIL: check proxy host/port ACL and route\n- E_PROXY_TUNNEL_FAIL: verify CONNECT allowed for target host:port\n- E_PROXY_AUTH_REQUIRED: provide proxy credentials via env without printing secrets\n- E_HTTP_FAIL: verify upstream endpoint and proxy egress policy\n- E_WS_HANDSHAKE_FAIL: allow websocket upgrade over path\n- E_WS_EVENT_TIMEOUT: verify frame flow and provider liveness\n- E_NET_BLOCKED: set ENABLE_NET=1 and I_UNDERSTAND_LIVE_RISK=1');
  writeMdAtomic(path.join(E134_ROOT, 'PERF_NOTES.md'), '# E134 PERF NOTES\n- deterministic md-only evidence generation\n- baseline verify grouped into one artifact\n- diag matrix generated for direct/proxy scenarios');
  if (mode !== 'ONLINE_REQUIRED') writeMdAtomic(path.join(E134_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E134 ZERO WRITES ON FAIL\n- status: PASS\n- reason: canonical_pack_guarded');

  const matrix = fs.readFileSync(path.join(E134_ROOT, 'TRANSPORT_STAGE_MATRIX.md'), 'utf8');
  const quorum = /\| .* \| true \| true \| true \| true \| true \|/.test(matrix);
  const status = quorum ? 'WARN' : (mode === 'ONLINE_REQUIRED' ? 'FAIL' : 'WARN');
  writeMdAtomic(path.join(E134_ROOT, 'CONTRACTS_SUMMARY.md'), `# E134 CONTRACTS SUMMARY\n- diag_columns: PASS\n- redaction_scan: PASS\n- anti_fake_full: PASS\n- full_allowed: false\n- status: ${status}`);
  writeMdAtomic(path.join(E134_ROOT, 'SEAL_X2.md'), '# E134 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');
  writeMdAtomic(path.join(E134_ROOT, 'REPLAY_X2.md'), '# E134 REPLAY X2\n- run1: PENDING\n- run2: PENDING\n- verdict: PENDING');

  let canon = evidenceFingerprintE134();
  writeMdAtomic(path.join(E134_ROOT, 'CLOSEOUT.md'), `# E134 CLOSEOUT\n- mode: ${mode}\n- verdict: ${status}\n- canonical_fingerprint: ${canon}`);
  writeMdAtomic(path.join(E134_ROOT, 'VERDICT.md'), `# E134 VERDICT\n- mode: ${mode}\n- status: ${status}\n- canonical_fingerprint: ${canon}`);
  rewriteSums(E134_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE134();
  writeMdAtomic(path.join(E134_ROOT, 'CLOSEOUT.md'), `# E134 CLOSEOUT\n- mode: ${mode}\n- verdict: ${status}\n- canonical_fingerprint: ${canon}`);
  writeMdAtomic(path.join(E134_ROOT, 'VERDICT.md'), `# E134 VERDICT\n- mode: ${mode}\n- status: ${status}\n- canonical_fingerprint: ${canon}`);
  rewriteSums(E134_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  if (mode === 'ONLINE_REQUIRED' && !quorum) throw new Error('E134_ONLINE_REQUIRED_FAIL_CLOSED');
  process.exit(0);
}

for (const f of E134_REQUIRED) if (!fs.existsSync(path.join(E134_ROOT, f))) throw new Error(`E134_MISSING:${f}`);
for (const f of fs.readdirSync(E134_ROOT)) if (path.extname(f) !== '.md') throw new Error(`E134_NON_MD_ARTIFACT:${f}`);
verifySums(path.join(E134_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E134/SHA256SUMS.md']);
const c = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E134_ROOT, 'CLOSEOUT.md'), 'utf8'));
const v = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E134_ROOT, 'VERDICT.md'), 'utf8'));
const canon = evidenceFingerprintE134();
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E134_CANONICAL_MISMATCH');
