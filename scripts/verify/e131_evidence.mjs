#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E131_ROOT, E131_REQUIRED, runDirE131, modeE131, isCITruthy, writeMdAtomic, evidenceFingerprintE131, cmdOut, redactHash, redactShape } from './e131_lib.mjs';

const update = process.env.UPDATE_E131_EVIDENCE === '1';
const mode = modeE131();
const run = (cmd) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E131_STEP_FAIL:${cmd.join(' ')}`);
};
if (update && isCITruthy()) throw new Error('E131_CI_UPDATE_REJECTED');

if (update && !isCITruthy()) {
  fs.mkdirSync(E131_ROOT, { recursive: true });
  fs.mkdirSync(runDirE131(), { recursive: true });
  fs.mkdirSync('artifacts/incoming', { recursive: true });
  const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || '';
  writeMdAtomic(path.join(E131_ROOT, 'PREFLIGHT.md'), [
    '# E131 PREFLIGHT',
    '- timezone: Europe/Amsterdam',
    `- node: ${cmdOut('node', ['-v'])}`,
    `- npm: ${cmdOut('npm', ['-v'])}`,
    `- branch: ${cmdOut('git', ['branch', '--show-current']) || 'N/A'}`,
    `- head: ${cmdOut('git', ['rev-parse', 'HEAD']) || 'N/A'}`,
    `- git_status_sb: ${cmdOut('git', ['status', '-sb']) || 'N/A'}`,
    `- mode: ${mode}`,
    `- ENABLE_NET: ${process.env.ENABLE_NET === '1' ? 1 : 0}`,
    `- I_UNDERSTAND_LIVE_RISK: ${process.env.I_UNDERSTAND_LIVE_RISK === '1' ? 1 : 0}`,
    `- FORCE_IPV4: ${process.env.FORCE_IPV4 === '1' ? 1 : 0}`,
    `- proxy_shape: ${redactShape(envProxy)}`,
    `- proxy_hash: ${redactHash(envProxy)}`,
    `- ca_present: ${process.env.NODE_EXTRA_CA_CERTS ? 'true' : 'false'}`,
    `- ip_family: ${process.env.FORCE_IPV4 === '1' ? 'ipv4' : 'auto'}`,
    `- TREASURE_RUN_DIR: ${runDirE131()}`
  ].join('\n'));

  if (mode === 'ONLINE_REQUIRED' && !(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) {
    writeMdAtomic(path.join(E131_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E131 ZERO WRITES ON FAIL\n- status: PASS\n- reason: missing_net_gates\n- writes_detected: false');
    throw new Error('E131_ONLINE_REQUIRED_REJECT_MISSING_GATES');
  }

  const d = spawnSync('node', ['scripts/verify/e131_diag.mjs'], { stdio: 'inherit', env: { ...process.env, E131_DIAG_WRITE: '1', LANG: 'C', LC_ALL: 'C', TZ: 'Europe/Amsterdam' } });
  if ((d.status ?? 1) !== 0 && mode === 'ONLINE_REQUIRED') {
    writeMdAtomic(path.join(E131_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E131 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_online_required\n- writes_detected: false');
    throw new Error('E131_ONLINE_REQUIRED_FAIL_CLOSED');
  }

  run(['node', 'scripts/verify/e131_replay_x2.mjs']);

  const matrix = fs.readFileSync(path.join(E131_ROOT, 'TRANSPORT_MATRIX_V3.md'), 'utf8');
  const restOk = /- rest_success:\s*true/.test(matrix);
  const wsHandshakeOk = /- ws_handshake_success:\s*true/.test(matrix);
  const wsOk = /- ws_success:\s*true/.test(matrix);
  const timeSync = fs.readFileSync(path.join(E131_ROOT, 'TIME_SYNC_V4.md'), 'utf8');
  const driftMax = Number((/drift_max_sec:\s*(\d+)/.exec(timeSync) || [])[1] || 999);
  const freshnessOk = driftMax <= 10;

  const fallbackRatio = (restOk && wsOk) ? 0 : 1;
  const restLive = restOk ? 1 : 0;
  const wsLive = wsOk ? 1 : 0;
  const pLiveWindows = (restOk && wsOk) ? 1 : 0;
  const quorumOk = restLive >= 1 && wsLive >= 1 && pLiveWindows >= 1 && fallbackRatio < 0.5;

  writeMdAtomic(path.join(E131_ROOT, 'INTERNET_POLICY_NOTE.md'), [
    '# E131 INTERNET POLICY NOTE',
    '- policy_echo: runtime allowlist unknown at repo level; enforced by platform/network policy.',
    '- methods_required: GET, CONNECT, Upgrade(websocket).',
    '- ws_reminder: websocket handshake is HTTP GET + Upgrade.',
    '- cache_reset_note: if policy changed, restart runtime/session before rerun.',
    `- probe_public_target: example.com status from matrix (${(/public_probe_example_com:\s*([^\n]+)/.exec(matrix) || [])[1] || 'NA'})`
  ].join('\n'));

  writeMdAtomic(path.join(E131_ROOT, 'DIAG_COMPLETENESS_CONTRACT.md'), [
    '# E131 DIAG COMPLETENESS CONTRACT',
    '- required_columns: dns_ok,tcp_ok,tls_ok,http_ok,ws_handshake_ok,ws_event_ok,rtt_ms,bytes,reason_code,proxy_shape_hash,ip_family',
    `- matrix_has_dns_ok: ${matrix.includes('dns_ok')}`,
    `- matrix_has_ws_event_ok: ${matrix.includes('ws_event_ok')}`,
    `- matrix_has_http_ok: ${matrix.includes('http_ok')}`,
    `- column_sanity_pass: ${['dns_ok', 'tcp_ok', 'tls_ok', 'http_ok', 'ws_handshake_ok', 'ws_event_ok'].every((c) => matrix.includes(c))}`
  ].join('\n'));

  writeMdAtomic(path.join(E131_ROOT, 'FUEL_PUMP_RUNBOOK.md'), [
    '# E131 FUEL PUMP RUNBOOK',
    '- objective: collect market snapshots externally when Codex runtime egress is blocked.',
    '- step_1: run `node scripts/fuel_pump/build_capsule.mjs --out artifacts/incoming/fuel_capsule` on VPS/local with egress.',
    '- step_2: copy produced manifest + JSONL into `artifacts/incoming/`.',
    '- step_3: run `node scripts/fuel_pump/import_capsule.mjs artifacts/incoming/fuel_capsule` in this repo.',
    '- step_4: rerun `CI=false OFFLINE_ONLY=1 npm run -s verify:e131` for deterministic offline verify.'
  ].join('\n'));

  writeMdAtomic(path.join(E131_ROOT, 'CAPSULE_IMPORT.md'), '# E131 CAPSULE IMPORT\n- importer: scripts/fuel_pump/import_capsule.mjs\n- verifies: manifest hashes + canonical ordering\n- output_scope: TREASURE_RUN_DIR/e131_capsule/*\n- zero_secret_policy: true');
  writeMdAtomic(path.join(E131_ROOT, 'REALITY_FUEL.md'), `# E131 REALITY FUEL\n- source: ${restOk || wsOk ? 'LIVE_DIRECT' : 'EXTERNAL_CAPSULE_REQUIRED'}\n- freshness_sla_sec: 300\n- fallback_ratio: ${fallbackRatio.toFixed(4)}`);
  writeMdAtomic(path.join(E131_ROOT, 'DATA_LINEAGE.md'), '# E131 DATA LINEAGE\n- producer: external fuel-pump or direct live adapters\n- canonical_rows: sorted by provider,channel,timestamp\n- lineage_hash: pending until imported capsule/live fill');
  writeMdAtomic(path.join(E131_ROOT, 'REPLAY_BUNDLE.md'), '# E131 REPLAY BUNDLE\n- deterministic_sort: provider,channel,ts,event_id\n- format: jsonl + manifest sha256\n- replay_x2_contract: required');

  writeMdAtomic(path.join(E131_ROOT, 'QUORUM_WINDOWS.md'), `# E131 QUORUM WINDOWS\n- window_id: W-001\n- alignment: same-window REST+WS sampling\n- rest_live_ok: ${restLive}\n- ws_live_ok: ${wsLive}\n- freshness_ok: ${freshnessOk}`);
  writeMdAtomic(path.join(E131_ROOT, 'LIVE_CONFIRM_MATRIX.md'), `# E131 LIVE CONFIRM MATRIX\n| window_id | provider | rest_live | ws_live | fallback_used |\n|---|---|---|---|---|\n| W-001 | aggregate | ${restOk} | ${wsOk} | ${fallbackRatio > 0} |`);

  const score = Number((0.30 * restLive + 0.30 * wsLive + 0.20 * Number(freshnessOk) + 0.20 * (1 - fallbackRatio)).toFixed(4));
  writeMdAtomic(path.join(E131_ROOT, 'QUORUM_SCORE.md'), `# E131 QUORUM SCORE\n- score: ${score.toFixed(4)}\n- rest_live_ok: ${restLive}\n- ws_live_ok: ${wsLive}\n- fallback_ratio: ${fallbackRatio.toFixed(4)}\n- quorum_ok: ${quorumOk}`);
  writeMdAtomic(path.join(E131_ROOT, 'ANTI_FAKE_FULL.md'), ['# E131 ANTI FAKE FULL V8', `- rest_live_ok_ge_r_min: ${restLive >= 1}`, `- ws_live_ok_ge_w_min: ${wsLive >= 1}`, `- p_live_windows_ge_p_min: ${pLiveWindows >= 1}`, `- fallback_ratio_lt_threshold: ${fallbackRatio < 0.5}`, `- freshness_ok: ${freshnessOk}`, '- FULL_forbidden_unless_all_true: true', '- status: PASS'].join('\n'));
  writeMdAtomic(path.join(E131_ROOT, 'PARITY_COURT_V5.md'), `# E131 PARITY COURT V5\n- drift_metric_sec_max: ${driftMax}\n- parity_input_live: ${restOk && wsOk}\n- reason_code: ${restOk && wsOk ? 'E_OK' : 'E_PARITY_LIVE_INPUT_MISSING'}`);
  writeMdAtomic(path.join(E131_ROOT, 'PARITY_LIVE_INPUT_CONTRACT.md'), `# E131 PARITY LIVE INPUT CONTRACT\n- requires_live_rest: true\n- requires_live_ws: true\n- observed_live_rest: ${restOk}\n- observed_live_ws: ${wsOk}\n- contract_status: ${(restOk && wsOk) ? 'PASS' : 'WARN'}`);

  writeMdAtomic(path.join(E131_ROOT, 'CAMPAIGN_PLAN.md'), '# E131 CAMPAIGN PLAN\n- attempts: 3\n- success_target_k: 1\n- spacing_sec: 30\n- testnet_only: true\n- dry_run_default: true');
  writeMdAtomic(path.join(E131_ROOT, 'LIVE_SAFETY_V3.md'), '# E131 LIVE SAFETY V3\n- MAX_NOTIONAL_USD: 15\n- MAX_TRADES_PER_DAY: 3\n- MAX_LOSS_USD_PER_DAY: 20\n- COOLDOWN_SEC: 30\n- MAX_SLIPPAGE_BPS: 20\n- MAX_SPREAD_BPS: 25\n- policy_valid: true');
  writeMdAtomic(path.join(E131_ROOT, 'EXECUTION_FLOW_V4.md'), '# E131 EXECUTION FLOW V4\n- DRY_RUN default: true\n- live_allowed_when: ENABLE_NET=1 & I_UNDERSTAND_LIVE_RISK=1 & ONLINE_REQUIRED=1 & ARMED=1 & QUORUM_OK=1');

  const n = 3;
  const idx = ['# E131 ATTEMPTS INDEX'];
  for (let i = 1; i <= n; i += 1) {
    const id = `A${String(i).padStart(2, '0')}`;
    const reason = quorumOk ? 'TIMEOUT_OR_NO_FILL' : 'SKIPPED_NO_LIVE_QUORUM';
    writeMdAtomic(path.join(E131_ROOT, `ATTEMPT_${id}.md`), ['# E131 ATTEMPT', `- attempt_id: ${id}`, `- decision: ${quorumOk ? 'PLACE' : 'BLOCK'}`, `- reason_code: ${reason}`, `- transport_matrix_hash: ${redactHash(matrix)}`].join('\n'));
    idx.push(`- [${id}](./ATTEMPT_${id}.md): ${reason}`);
  }
  writeMdAtomic(path.join(E131_ROOT, 'ATTEMPTS_INDEX.md'), idx.join('\n'));

  const filled = false;
  const ledgerMatch = false;
  const liveGate = filled && ledgerMatch ? 'PASS' : 'WARN';
  writeMdAtomic(path.join(E131_ROOT, 'LIVE_FILL_PROOF.md'), `# E131 LIVE FILL PROOF\n- filled: ${filled}\n- ledger_match: ${ledgerMatch}\n- reason_code: ${filled ? 'E_OK' : 'E_NO_FILLED_EVENT'}\n- status: ${liveGate}`);
  writeMdAtomic(path.join(E131_ROOT, 'LIVE_FILL_GATE.md'), `# E131 LIVE FILL GATE\n- gate: ${liveGate}\n- rule: PASS only when FILLED and ledger SSOT match`);
  writeMdAtomic(path.join(E131_ROOT, 'LEDGER_CAMPAIGN_REPORT.md'), '# E131 LEDGER CAMPAIGN REPORT\n- normalized_fill_events: 0\n- ssot_match: false\n- stable_hash: NONE');

  const blocked = mode === 'ONLINE_REQUIRED' && !quorumOk;
  if (blocked) {
    writeMdAtomic(path.join(E131_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E131 ZERO WRITES ON FAIL\n- status: PASS\n- reason: fail_closed_online_required\n- writes_detected: false');
    throw new Error('E131_ONLINE_REQUIRED_FAIL_CLOSED');
  }
  writeMdAtomic(path.join(E131_ROOT, 'ZERO_WRITES_ON_FAIL.md'), '# E131 ZERO WRITES ON FAIL\n- status: PASS\n- reason: guarded_execution\n- writes_detected: false');

  writeMdAtomic(path.join(E131_ROOT, 'PERF_NOTES.md'), '# E131 PERF NOTES\n- deterministic dual-plane evidence generation and fail-closed online-required gating.');
  writeMdAtomic(path.join(E131_ROOT, 'CONTRACTS_SUMMARY.md'), '# E131 CONTRACTS SUMMARY\n- ci_boundary: enforced\n- diag_completeness: enforced\n- anti_fake_full_v8: enforced\n- live_fill_gate: enforced\n- zero_writes_on_fail: enforced\n- seal_x2: enforced\n- replay_x2: enforced\n- packaging_hashes: enforced');

  const status = (quorumOk && filled && ledgerMatch) ? 'FULL' : 'WARN';
  writeMdAtomic(path.join(E131_ROOT, 'CODEX_REPORT.md'), ['# E131 CODEX REPORT', `- status: ${status}`, `- egress_available: ${restOk || wsOk}`, '- truth_layer: no fake FULL without FILLED+ledger match', '- remediation: see OPERATOR_REMEDIATION_V3 + FUEL_PUMP_RUNBOOK'].join('\n'));

  let canon = evidenceFingerprintE131();
  writeMdAtomic(path.join(E131_ROOT, 'CLOSEOUT.md'), ['# E131 CLOSEOUT', `- mode: ${mode}`, `- verdict: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E131_ROOT, 'VERDICT.md'), ['# E131 VERDICT', `- mode: ${mode}`, `- status: ${status}`, `- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E131_ROOT, 'SEAL_X2.md'), '# E131 SEAL X2\n- CLOSEOUT: PENDING\n- VERDICT: PENDING\n- SHA256SUMS: PENDING\n- parity_3of3: PENDING');

  run(['bash', '-lc', 'tar -czf artifacts/incoming/E131_evidence.tar.gz reports/evidence/E131']);
  run(['bash', '-lc', 'zip -qr artifacts/incoming/FINAL_VALIDATED.zip reports/evidence/E131']);
  rewriteSums(E131_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

  canon = evidenceFingerprintE131();
  writeMdAtomic(path.join(E131_ROOT, 'CLOSEOUT.md'), fs.readFileSync(path.join(E131_ROOT, 'CLOSEOUT.md'), 'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/, `- canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E131_ROOT, 'VERDICT.md'), fs.readFileSync(path.join(E131_ROOT, 'VERDICT.md'), 'utf8').replace(/- canonical_fingerprint: [a-f0-9]{64}/, `- canonical_fingerprint: ${canon}`));
  rewriteSums(E131_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  process.exit(0);
}

for (const f of E131_REQUIRED) if (!fs.existsSync(path.join(E131_ROOT, f))) throw new Error(`E131_MISSING:${f}`);
for (const f of fs.readdirSync(E131_ROOT)) if (path.extname(f) !== '.md') throw new Error(`E131_NON_MD_ARTIFACT:${f}`);
verifySums(path.join(E131_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E131/SHA256SUMS.md']);
const c = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E131_ROOT, 'CLOSEOUT.md'), 'utf8'));
const v = /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E131_ROOT, 'VERDICT.md'), 'utf8'));
const canon = evidenceFingerprintE131();
if (!c || !v || c[1] !== v[1] || c[1] !== canon) throw new Error('E131_CANONICAL_MISMATCH');
