#!/usr/bin/env node
/**
 * E135 Run — orchestrates harness + contracts + export + sha evidence.
 * Always offline-deterministic. Evidence regenerated every run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import {
  E135_ROOT, E135_REQUIRED, isCITruthy, enforceCIBoundaryE135, writeMdAtomic, evidenceFingerprintE135,
} from './e135_lib.mjs';
import { runHarness } from './e135_transport_harness.mjs';
import { runContracts } from './e135_contracts.mjs';
import { runExport } from './e135_export.mjs';

enforceCIBoundaryE135();

fs.mkdirSync(E135_ROOT, { recursive: true });
fs.mkdirSync('artifacts/outgoing', { recursive: true });

// ── 1. Run harness ────────────────────────────────────────────────────────────
process.stdout.write('[E135] running offline harness...\n');
const results = await runHarness();
const allOk = results.every((r) => r.reason_code === 'OK');

// ── 2. Write harness evidence ─────────────────────────────────────────────────
const header = '| scenario | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | reason_code |';
const sep = '|---|---|---|---|---|---|---|---|---|---|---|---:|---|';
const rows = results.map((r) =>
  `| ${r.scenario} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.tcp_to_proxy_ok} | ${r.connect_tunnel_ok} | ${r.tls_over_tunnel_ok} | ${r.http_over_tunnel_ok} | ${r.ws_over_tunnel_ok} | ${r.rtt_ms} | ${r.reason_code} |`,
);

writeMdAtomic(path.join(E135_ROOT, 'TRANSPORT_HARNESS_MATRIX.md'), [
  '# E135 TRANSPORT HARNESS MATRIX',
  '- mode: OFFLINE_DETERMINISTIC',
  '- servers: 127.0.0.1:0 ephemeral (http_echo, ws_echo, connect_proxy)',
  '- retries: 0',
  '- timeouts: fixed',
  '- external_network: NONE',
  header,
  sep,
  ...rows,
].join('\n'));

writeMdAtomic(path.join(E135_ROOT, 'HARNESS_RUN.md'), [
  '# E135 HARNESS RUN',
  `- timestamp: ${new Date().toISOString()}`,
  `- node: ${process.version}`,
  `- scenarios_run: ${results.length}`,
  `- scenarios_ok: ${results.filter((r) => r.reason_code === 'OK').length}`,
  `- all_ok: ${allOk}`,
  `- verdict: ${allOk ? 'PASS' : 'FAIL'}`,
  '',
  '## Scenario Results',
  ...results.map((r) => `- ${r.scenario}: ${r.reason_code}`),
].join('\n'));

const reasonCodes = [...new Set(results.map((r) => r.reason_code))].sort();
writeMdAtomic(path.join(E135_ROOT, 'REASON_CODES.md'), [
  '# E135 REASON CODES',
  '- OK: all stages passed',
  '- E_TCP_FAIL: TCP connection failed to target or proxy',
  '- E_TLS_FAIL: TLS handshake failed',
  '- E_HTTP_FAIL: HTTP response not 2xx or body mismatch',
  '- E_WS_HANDSHAKE_FAIL: WebSocket upgrade failed (non-101 or timeout)',
  '- E_WS_EVENT_FAIL: WebSocket message not received or mismatched',
  '- E_PROXY_CONNECT_FAIL: CONNECT tunnel rejected by proxy',
  '',
  '## Observed in this run',
  ...reasonCodes.map((c) => `- ${c}`),
].join('\n'));

// ── 3. Contracts ──────────────────────────────────────────────────────────────
process.stdout.write('[E135] running contracts...\n');
const contracts = runContracts();
// CONTRACTS.md written by runContracts() internally when called via run
const contractsLines = [
  '# E135 CONTRACTS',
  `- md_only: ${contracts.md_only}`,
  `- redaction: ${contracts.redaction}`,
  `- header_exactness: ${contracts.header_exactness}`,
  `- overall: ${contracts.overall}`,
];
if (contracts.details.length) contractsLines.push('## Details', ...contracts.details.map((d) => `- ${d}`));
writeMdAtomic(path.join(E135_ROOT, 'CONTRACTS.md'), contractsLines.join('\n'));

// ── 4. Export ─────────────────────────────────────────────────────────────────
process.stdout.write('[E135] running export...\n');
runExport();

// ── 5. VERDICT ────────────────────────────────────────────────────────────────
const harnessPass = allOk;
const contractsPass = contracts.overall === 'PASS';
const overallStatus = harnessPass && contractsPass ? 'PASS' : 'FAIL';

const fingerprint = evidenceFingerprintE135();
writeMdAtomic(path.join(E135_ROOT, 'VERDICT.md'), [
  '# E135 VERDICT',
  `- harness_pass: ${harnessPass}`,
  `- contracts_pass: ${contractsPass}`,
  `- status: ${overallStatus}`,
  `- canonical_fingerprint: ${fingerprint}`,
  `- node: ${process.version}`,
  `- timestamp: ${new Date().toISOString()}`,
].join('\n'));

// ── 6. SHA256SUMS ─────────────────────────────────────────────────────────────
rewriteSums(E135_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

// ── 7. Verify required files present & md-only ────────────────────────────────
for (const f of E135_REQUIRED) {
  if (!fs.existsSync(path.join(E135_ROOT, f))) throw new Error(`E135_MISSING:${f}`);
}
for (const f of fs.readdirSync(E135_ROOT)) {
  if (path.extname(f) !== '.md') throw new Error(`E135_NON_MD_ARTIFACT:${f}`);
}

// ── 8. Verify sums ────────────────────────────────────────────────────────────
verifySums(path.join(E135_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E135/SHA256SUMS.md']);

process.stdout.write(`[E135] DONE — status: ${overallStatus}\n`);
if (!harnessPass) {
  process.stderr.write(`[E135] HARNESS FAIL — check TRANSPORT_HARNESS_MATRIX.md\n`);
  process.exit(1);
}
if (!contractsPass) {
  process.stderr.write(`[E135] CONTRACTS FAIL — check CONTRACTS.md\n`);
  process.exit(1);
}
process.exit(0);
