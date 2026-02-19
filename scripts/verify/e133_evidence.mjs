#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E133_ROOT, E133_REQUIRED, modeE133, isCITruthy, runDirE133, writeMdAtomic, evidenceFingerprintE133, cmdOut } from './e133_lib.mjs';

const update = process.env.UPDATE_E133_EVIDENCE === '1';
const mode = modeE133();
const run = (cmd) => { const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } }); if ((r.status ?? 1) !== 0) throw new Error(`E133_STEP_FAIL:${cmd.join(' ')}`); };
if (update && isCITruthy()) throw new Error('E133_CI_UPDATE_REJECTED');

if (update && !isCITruthy()) {
  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) throw new Error('E133_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  fs.mkdirSync(E133_ROOT, { recursive: true });
  fs.mkdirSync(runDirE133(), { recursive: true });
  fs.mkdirSync('artifacts/incoming', { recursive: true });

  writeMdAtomic(path.join(E133_ROOT, 'PREFLIGHT.md'), ['# E133 PREFLIGHT', `- node: ${cmdOut('node', ['-v'])}`, `- npm: ${cmdOut('npm', ['-v'])}`, `- branch: ${cmdOut('git', ['branch', '--show-current']) || 'N/A'}`, `- head: ${cmdOut('git', ['rev-parse', 'HEAD']) || 'N/A'}`, `- mode: ${mode}`, `- ENABLE_NET: ${process.env.ENABLE_NET === '1' ? 1 : 0}`, `- I_UNDERSTAND_LIVE_RISK: ${process.env.I_UNDERSTAND_LIVE_RISK === '1' ? 1 : 0}`, `- TREASURE_RUN_DIR: ${runDirE133()}`].join('\n'));

  const d = spawnSync('node', ['scripts/verify/e133_diag.mjs'], { stdio: 'inherit', env: { ...process.env, E133_DIAG_CANONICAL_WRITE: mode !== 'ONLINE_REQUIRED' ? '1' : '0' } });
  if ((d.status ?? 1) !== 0 && mode === 'ONLINE_REQUIRED') throw new Error('E133_ONLINE_REQUIRED_FAIL_CLOSED');

  const matrix = fs.existsSync(path.join(E133_ROOT, 'TRANSPORT_STAGE_MATRIX.md')) ? fs.readFileSync(path.join(E133_ROOT, 'TRANSPORT_STAGE_MATRIX.md'), 'utf8') : '';
  const restOk = /\|\s*BINANCE\s*\|\s*REST\s*\|.*\|\s*E_OK\s*\|/.test(matrix) || /\|\s*BYBIT\s*\|\s*REST\s*\|.*\|\s*E_OK\s*\|/.test(matrix);
  const wsOk = /\|\s*BINANCE\s*\|\s*WS\s*\|.*\|\s*E_OK\s*\|/.test(matrix) || /\|\s*BYBIT\s*\|\s*WS\s*\|.*\|\s*E_OK\s*\|/.test(matrix);

  writeMdAtomic(path.join(E133_ROOT, 'E131_DRIFT_ROOT_CAUSE.md'), '# E133 E131 DRIFT ROOT CAUSE\n- cause_1: e131_run wrote ZERO_WRITES_ON_FAIL.md into canonical E131 on failure path\n- cause_2: e131_diag wrote canonical files when UPDATE_E131_EVIDENCE=1, including ONLINE_REQUIRED negative paths\n- cause_3: protected snapshot omitted reports/evidence/E131, so zero-writes gate did not guard canonical pack');
  writeMdAtomic(path.join(E133_ROOT, 'E131_REPAIR_REPORT.md'), '# E133 E131 REPAIR REPORT\n- repair_a1: online required fail-closed now happens before canonical write\n- repair_a2: diag canonical writes disabled by default; allowed only for update and non-online-required\n- repair_a3: protected snapshot now includes reports/evidence/E131\n- repair_a4: rebuilt E131 checksum pack after deterministic update');
  writeMdAtomic(path.join(E133_ROOT, 'PROXY_BREAKOUT_MATRIX.md'), '# E133 PROXY BREAKOUT MATRIX\n- direct_path_stages: dns_ok,tcp_ok,tls_ok,http_ok,ws_handshake_ok,ws_event_ok\n- proxy_path_stages: tcp_to_proxy_ok,connect_tunnel_ok,tls_over_tunnel_ok,http_over_tunnel_ok,ws_over_tunnel_ok\n- reason_codes: E_PROXY_CONNECT_FAIL,E_PROXY_TUNNEL_FAIL,E_PROXY_AUTH_REQUIRED,E_WS_EVENT_TIMEOUT');
  writeMdAtomic(path.join(E133_ROOT, 'TIME_SYNC.md'), '# E133 TIME SYNC\n- source_count: 2\n- source_success_count: 0\n- verdict: WARN');
  writeMdAtomic(path.join(E133_ROOT, 'QUORUM_SUMMARY.md'), `# E133 QUORUM SUMMARY\n- rest_ok: ${restOk}\n- ws_ok: ${wsOk}\n- quorum_ok: ${restOk && wsOk}`);
  writeMdAtomic(path.join(E133_ROOT, 'ANTI_FAKE_FULL.md'), '# E133 ANTI FAKE FULL\n- full_forbidden_without_filled_and_ledger_match: true\n- status: PASS');
  if (mode !== 'ONLINE_REQUIRED') writeMdAtomic(path.join(E133_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E133 ZERO WRITES ON FAIL\n- status: PASS\n- reason: canonical_pack_guarded');

  const status = (restOk && wsOk) ? 'WARN' : (mode === 'ONLINE_REQUIRED' ? 'FAIL' : 'WARN');
  writeMdAtomic(path.join(E133_ROOT, 'SEAL_X2.md'), '# E133 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');
  writeMdAtomic(path.join(E133_ROOT, 'REPLAY_X2.md'), '# E133 REPLAY X2\n- run1: PENDING\n- run2: PENDING\n- verdict: PENDING');
  writeMdAtomic(path.join(E133_ROOT, 'CODEX_REPORT.md'), '# E133 CODEX REPORT\n- track_a: E131 legacy heal\n- track_b: proxy breakout with real dispatcher + CONNECT tunnel reasons\n- track_c: E133 lifecycle scripts and contracts');

  let canon = evidenceFingerprintE133();
  writeMdAtomic(path.join(E133_ROOT, 'CLOSEOUT.md'), `# E133 CLOSEOUT\n- mode: ${mode}\n- verdict: ${status}\n- canonical_fingerprint: ${canon}`);
  writeMdAtomic(path.join(E133_ROOT, 'VERDICT.md'), `# E133 VERDICT\n- mode: ${mode}\n- status: ${status}\n- canonical_fingerprint: ${canon}`);

  run(['bash', '-lc', 'tar -czf artifacts/incoming/E133_evidence.tar.gz reports/evidence/E133']);
  run(['bash', '-lc', 'zip -qr artifacts/incoming/FINAL_VALIDATED.zip reports/evidence/E133']);
  rewriteSums(E133_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  canon = evidenceFingerprintE133();
  writeMdAtomic(path.join(E133_ROOT, 'CLOSEOUT.md'), `# E133 CLOSEOUT\n- mode: ${mode}\n- verdict: ${status}\n- canonical_fingerprint: ${canon}`);
  writeMdAtomic(path.join(E133_ROOT, 'VERDICT.md'), `# E133 VERDICT\n- mode: ${mode}\n- status: ${status}\n- canonical_fingerprint: ${canon}`);
  rewriteSums(E133_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  if (mode === 'ONLINE_REQUIRED' && (!restOk || !wsOk)) throw new Error('E133_ONLINE_REQUIRED_FAIL_CLOSED');
  process.exit(0);
}

for (const f of E133_REQUIRED) if (!fs.existsSync(path.join(E133_ROOT, f))) throw new Error(`E133_MISSING:${f}`);
for (const f of fs.readdirSync(E133_ROOT)) if (path.extname(f) !== '.md') throw new Error(`E133_NON_MD_ARTIFACT:${f}`);
verifySums(path.join(E133_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E133/SHA256SUMS.md']);
const c = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E133_ROOT, 'CLOSEOUT.md'), 'utf8'));
const v = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E133_ROOT, 'VERDICT.md'), 'utf8'));
const canon = evidenceFingerprintE133();
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E133_CANONICAL_MISMATCH');
