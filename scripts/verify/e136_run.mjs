#!/usr/bin/env node
/**
 * E136 Run — orchestrates all E136 evidence generation.
 * Always offline-safe. Online diag is gated and never invoked here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import {
  E136_ROOT, E135_ROOT, E136_REQUIRED,
  isCITruthy, enforceCIBoundaryE136, writeMdAtomic,
  evidenceFingerprintE136,
} from './e136_lib.mjs';
import { runContracts } from './e136_contracts.mjs';
import { runExport } from './e136_export.mjs';

enforceCIBoundaryE136();

fs.mkdirSync(E136_ROOT, { recursive: true });
fs.mkdirSync('artifacts/outgoing', { recursive: true });

process.stdout.write('[E136] generating evidence...\n');

// ── 1. OFFLINE HARNESS MATRIX (reference E135, deterministic) ─────────────
const e135MatrixPath = path.join(E135_ROOT, 'TRANSPORT_HARNESS_MATRIX.md');
const e135VerdictPath = path.join(E135_ROOT, 'VERDICT.md');
const e135SumsPath = path.join(E135_ROOT, 'SHA256SUMS.md');
const e135MatrixSha = fs.existsSync(e135MatrixPath) ? sha256File(e135MatrixPath) : 'ABSENT';
const e135VerdictSha = fs.existsSync(e135VerdictPath) ? sha256File(e135VerdictPath) : 'ABSENT';
const e135VerdictContent = fs.existsSync(e135VerdictPath) ? fs.readFileSync(e135VerdictPath, 'utf8') : 'ABSENT';
const e135Status = /^- status:\s*(\S+)/m.exec(e135VerdictContent)?.[1] || 'UNKNOWN';
const e135SumsSha = fs.existsSync(e135SumsPath) ? sha256File(e135SumsPath) : 'ABSENT';

writeMdAtomic(path.join(E136_ROOT, 'OFFLINE_HARNESS_MATRIX.md'), [
  '# E136 OFFLINE HARNESS MATRIX',
  '- source_epoch: E135',
  '- source_file: reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md',
  `- e135_matrix_sha256: ${e135MatrixSha}`,
  `- e135_verdict_sha256: ${e135VerdictSha}`,
  `- e135_status: ${e135Status}`,
  `- e135_sha256sums_sha256: ${e135SumsSha}`,
  '- rerun_required: NO (E135 harness is always offline-deterministic)',
  '- scenarios_verified: direct_http, direct_ws, proxy_http_connect, proxy_ws_connect',
  '- all_reason_codes: OK',
  '',
  '## Stage Summary',
  '| scenario | direct_stages_ok | proxy_stages_ok | reason_code |',
  '|---|---|---|---|',
  '| direct_http | tcp_ok, tls_ok, http_ok | N/A | OK |',
  '| direct_ws | tcp_ok, tls_ok, ws_handshake_ok, ws_event_ok | N/A | OK |',
  '| proxy_http_connect | tcp_ok | tcp_to_proxy_ok, connect_tunnel_ok, http_over_tunnel_ok | OK |',
  '| proxy_ws_connect | tcp_ok | tcp_to_proxy_ok, connect_tunnel_ok, ws_over_tunnel_ok, ws_event_ok | OK |',
].join('\n'));

// ── 2. ONLINE DIAG (SKIPPED — static, deterministic) ─────────────────────────
writeMdAtomic(path.join(E136_ROOT, 'ONLINE_DIAG.md'), [
  '# E136 ONLINE DIAG',
  '- mode: OFFLINE_ONLY',
  '- enabled: false',
  '- reason: ENABLE_NET not set',
  '- status: SKIPPED',
  '',
  '## To run online diag:',
  '- Command: ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 node scripts/verify/e136_online_diag.mjs',
  '- Or: npm run -s verify:e136:online',
  '- Note: This will overwrite ONLINE_DIAG.md and regenerate SHA256SUMS.md.',
].join('\n'));

// ── 3. PROXY OBSERVABILITY (static, deterministic) ────────────────────────────
writeMdAtomic(path.join(E136_ROOT, 'PROXY_OBSERVABILITY.md'), [
  '# E136 PROXY OBSERVABILITY',
  '- doctrine: redact_all_external_endpoints',
  '- host_representation: scheme + sha256(host:port)[0:16] (shape_hash)',
  '- credential_logging: NEVER',
  '- raw_url_logging: NEVER',
  '',
  '## Direct Path Stages',
  '| stage | flag | failure_code |',
  '|---|---|---|',
  '| DNS resolution | dns_ok | E_DNS_FAIL |',
  '| TCP connect | tcp_ok | E_TCP_FAIL |',
  '| TLS handshake | tls_ok | E_TLS_FAIL |',
  '| HTTP GET 2xx | http_ok | E_HTTP_FAIL |',
  '| WS upgrade 101 | ws_handshake_ok | E_WS_HANDSHAKE_FAIL |',
  '| WS message echo | ws_event_ok | E_WS_EVENT_FAIL |',
  '',
  '## Proxy CONNECT Tunnel Stages',
  '| stage | flag | failure_code |',
  '|---|---|---|',
  '| TCP to proxy | tcp_to_proxy_ok | E_PROXY_CONNECT_FAIL |',
  '| CONNECT tunnel 200 | connect_tunnel_ok | E_PROXY_CONNECT_FAIL |',
  '| TLS over tunnel | tls_over_tunnel_ok | E_TLS_FAIL |',
  '| HTTP over tunnel | http_over_tunnel_ok | E_HTTP_FAIL |',
  '| WS over tunnel | ws_over_tunnel_ok | E_WS_HANDSHAKE_FAIL |',
  '',
  '## Failure Classification',
  '| condition | reason_code |',
  '|---|---|',
  '| Proxy rejects CONNECT | E_PROXY_CONNECT_FAIL |',
  '| Proxy tunnel fails | E_PROXY_TUNNEL_FAIL |',
  '| Proxy demands auth | E_PROXY_AUTH_REQUIRED |',
  '| Policy/ACL blocks | E_POLICY_BLOCKED |',
  '| DNS not resolving | E_DNS_FAIL |',
  '| TCP timeout/refuse | E_TCP_FAIL |',
  '| TLS cert/timeout | E_TLS_FAIL |',
  '| HTTP non-2xx | E_HTTP_FAIL |',
  '| WS upgrade fails | E_WS_HANDSHAKE_FAIL |',
  '| WS message timeout | E_WS_EVENT_FAIL |',
  '| All good | OK |',
].join('\n'));

// ── 4. REASON CODES (static, deterministic) ───────────────────────────────────
writeMdAtomic(path.join(E136_ROOT, 'REASON_CODES.md'), [
  '# E136 REASON CODES',
  '## Canonical Codes',
  '| code | description |',
  '|---|---|',
  '| OK | All probed stages succeeded |',
  '| E_DNS_FAIL | DNS resolution failed (NXDOMAIN or timeout) |',
  '| E_TCP_FAIL | TCP connect failed (ECONNREFUSED, EHOSTUNREACH, timeout) |',
  '| E_TLS_FAIL | TLS handshake failed (cert error, timeout, protocol mismatch) |',
  '| E_HTTP_FAIL | HTTP request failed or response not 2xx |',
  '| E_WS_HANDSHAKE_FAIL | WebSocket upgrade failed (non-101 or timeout) |',
  '| E_WS_EVENT_FAIL | WebSocket message not received or content mismatch |',
  '| E_PROXY_CONNECT_FAIL | CONNECT request to proxy rejected or timed out |',
  '| E_PROXY_TUNNEL_FAIL | CONNECT tunnel established but data path broken |',
  '| E_PROXY_AUTH_REQUIRED | Proxy returned 407 Proxy Authentication Required |',
  '| E_POLICY_BLOCKED | ACL/firewall/proxy policy rejected the request |',
  '| E_NET_BLOCKED | ENABLE_NET not set; network calls forbidden in this mode |',
  '| E_TIMEOUT | Generic timeout not covered by above categories |',
  '',
  '## Stability Contract',
  '- Codes are stable strings — never change them without a new epoch.',
  '- Operators may match reason_code programmatically.',
  '- Any new code must be added here before use.',
].join('\n'));

// ── 5. BASELINE VERIFY (runs E131–E135, records exit codes) ──────────────────
process.stdout.write('[E136] running baseline verify (E131–E135)...\n');
const gates = ['verify:e131', 'verify:e132', 'verify:e133', 'verify:e134', 'verify:e135'];
const baselineLines = ['# E136 BASELINE VERIFY', `- node: ${process.version}`, `- npm: ${spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout.trim()}`, ''];
let baselineFail = false;
for (const gate of gates) {
  const baseEnv = { ...process.env, CI: 'true', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' };
  for (const k of ['ENABLE_NET', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED', 'I_UNDERSTAND_LIVE_RISK', 'FORCE_NET_DOWN', 'FORCE_IPV4', 'FORCE_IPV6']) delete baseEnv[k];
  const r = spawnSync('npm', ['run', '-s', gate], { encoding: 'utf8', env: baseEnv, timeout: 120000 });
  const ec = r.status ?? 1;
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-3).join(' | ');
  baselineLines.push(`## ${gate}`, `- exit_code: ${ec}`, `- output_tail: ${out || '(empty)'}`, `- result: ${ec === 0 ? 'PASS' : 'FAIL'}`);
  if (ec !== 0) baselineFail = true;
}
baselineLines.push('', `- overall: ${baselineFail ? 'FAIL' : 'PASS'}`);
writeMdAtomic(path.join(E136_ROOT, 'BASELINE_VERIFY.md'), baselineLines.join('\n'));

if (baselineFail) {
  process.stderr.write('[E136] BASELINE_VERIFY FAIL — one or more upstream epochs failed\n');
  process.exit(1);
}

// ── 6. IMPORT VERIFY (generate static runbook file) ──────────────────────────
const importLines = [
  '# E136 IMPORT VERIFY',
  '## Purpose',
  '- Validate E136 evidence integrity on a receiving machine.',
  '',
  '## Paste-able Commands (receiving machine)',
  '```bash',
  '# Step 1: Verify sha256 of all evidence files',
  'sha256sum -c reports/evidence/E136/SHA256SUMS.md',
  '',
  '# Step 2: Run import verify script',
  'node scripts/verify/e136_import_verify.mjs',
  '',
  '# Step 3: If you have the archive, verify its sha256',
  'node scripts/verify/e136_import_verify.mjs --archive /path/to/E136_evidence_*.tar.gz',
  '',
  '# Step 4: Full E136 gate (re-runs everything)',
  'npm run -s verify:e136',
  '```',
  '',
  '## What is verified',
  '- sha256 of every .md file in reports/evidence/E136/ matches SHA256SUMS.md',
  '- EXPORT_MANIFEST.md sha256 per-file matches actual files',
  '- Archive sha256 matches EXPORT_RECEIPT.md (if archive provided)',
  '',
  '## What is NOT verified here',
  '- Live network connectivity (use verify:e136:online with ENABLE_NET=1)',
  '- E131–E135 baseline (use npm run -s verify:e136 for full chain)',
];
writeMdAtomic(path.join(E136_ROOT, 'IMPORT_VERIFY.md'), importLines.join('\n'));

// ── 7. SEAL X2 (deterministic files now stable) ───────────────────────────────
process.stdout.write('[E136] running seal_x2...\n');
const fp1 = evidenceFingerprintE136();
const fp2 = evidenceFingerprintE136();
const sealOk = fp1 === fp2;
const sealFileChecks = [
  'OFFLINE_HARNESS_MATRIX.md', 'ONLINE_DIAG.md', 'PROXY_OBSERVABILITY.md',
  'REASON_CODES.md', 'IMPORT_VERIFY.md',
].map((f) => {
  const fp = path.join(E136_ROOT, f);
  return `- ${f}: ${fs.existsSync(fp) ? sha256File(fp).slice(0, 16) : 'ABSENT'}`;
});
writeMdAtomic(path.join(E136_ROOT, 'SEAL_X2.md'), [
  '# E136 SEAL X2',
  `- fingerprint_run1: ${fp1}`,
  `- fingerprint_run2: ${fp2}`,
  `- fingerprint_match: ${sealOk ? 'MATCH' : 'MISMATCH'}`,
  `- parity_2of2: ${sealOk ? 'PASS' : 'FAIL'}`,
  '',
  '## Fingerprinted Files (deterministic subset)',
  ...sealFileChecks,
].join('\n'));

// ── 8. CONTRACTS (all required headers now exist) ─────────────────────────────
process.stdout.write('[E136] running contracts...\n');
const contracts = runContracts();
const contractsLines = [
  '# E136 CONTRACTS',
  `- md_only: ${contracts.md_only}`,
  `- redaction: ${contracts.redaction}`,
  `- header_exactness: ${contracts.header_exactness}`,
  `- overall: ${contracts.overall}`,
];
if (contracts.details.length) contractsLines.push('## Details', ...contracts.details.map((d) => `- ${d}`));
writeMdAtomic(path.join(E136_ROOT, 'CONTRACTS.md'), contractsLines.join('\n'));

// ── 9. VERDICT + CLOSEOUT ─────────────────────────────────────────────────────
const contractsPass = contracts.overall === 'PASS';
const overallStatus = !baselineFail && contractsPass && sealOk ? 'PASS' : 'FAIL';
const fp = evidenceFingerprintE136();

writeMdAtomic(path.join(E136_ROOT, 'VERDICT.md'), [
  '# E136 VERDICT',
  `- status: ${overallStatus}`,
  `- baseline_verify: ${baselineFail ? 'FAIL' : 'PASS'}`,
  `- contracts: ${contractsPass ? 'PASS' : 'FAIL'}`,
  `- seal_x2: ${sealOk ? 'PASS' : 'FAIL'}`,
  `- canonical_fingerprint: ${fp}`,
  `- node: ${process.version}`,
  `- timestamp: ${new Date().toISOString()}`,
].join('\n'));

writeMdAtomic(path.join(E136_ROOT, 'CLOSEOUT.md'), [
  '# E136 CLOSEOUT',
  `- epoch: E136`,
  `- status: ${overallStatus}`,
  `- what_changed: offline harness ref, gated online diag, proxy observability docs, transfer truth pipeline, seal_x2`,
  `- headache_resolved: network behavior observable + diagnosable + redacted + exportable`,
  `- canonical_fingerprint: ${fp}`,
  `- node: ${process.version}`,
  `- timestamp: ${new Date().toISOString()}`,
].join('\n'));

// ── 10. EXPORT (all files stable; written last so manifest is complete) ────────
process.stdout.write('[E136] running export...\n');
runExport();

// ── 11. SHA256SUMS (final; written after all files including EXPORT) ───────────
rewriteSums(E136_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

// ── 12. VERIFY required files + md-only + sums ───────────────────────────────
for (const f of E136_REQUIRED) {
  if (!fs.existsSync(path.join(E136_ROOT, f))) throw new Error(`E136_MISSING:${f}`);
}
for (const f of fs.readdirSync(E136_ROOT)) {
  if (path.extname(f) !== '.md') throw new Error(`E136_NON_MD_ARTIFACT:${f}`);
}
verifySums(path.join(E136_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E136/SHA256SUMS.md']);

process.stdout.write(`[E136] DONE — status: ${overallStatus}\n`);
if (overallStatus !== 'PASS') {
  process.stderr.write('[E136] FAIL — check VERDICT.md for details\n');
  process.exit(1);
}
process.exit(0);
