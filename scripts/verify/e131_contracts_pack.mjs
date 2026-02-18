#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E131_ROOT, E131_REQUIRED } from './e131_lib.mjs';
import { verifySums } from './foundation_sums.mjs';

for (const f of E131_REQUIRED) if (!fs.existsSync(path.join(E131_ROOT, f))) throw new Error(`E131_MISSING:${f}`);
const m = fs.readFileSync(path.join(E131_ROOT, 'TRANSPORT_MATRIX_V3.md'), 'utf8');
for (const c of ['dns_ok', 'tcp_ok', 'tls_ok', 'http_ok', 'ws_handshake_ok', 'ws_event_ok', 'rtt_ms', 'bytes', 'reason_code', 'proxy_shape_hash', 'ip_family']) if (!m.includes(c)) throw new Error(`E131_DIAG_COL_MISSING:${c}`);
const anti = fs.readFileSync(path.join(E131_ROOT, 'ANTI_FAKE_FULL.md'), 'utf8'); if (!anti.includes('V8')) throw new Error('E131_ANTI_FAKE_VERSION');
const fill = fs.readFileSync(path.join(E131_ROOT, 'LIVE_FILL_PROOF.md'), 'utf8');
const gate = fs.readFileSync(path.join(E131_ROOT, 'LIVE_FILL_GATE.md'), 'utf8');
if (/filled:\s*true/.test(fill) && !/ledger_match:\s*true/.test(fill)) throw new Error('E131_FILL_LEDGER_MISMATCH');
if (/filled:\s*true/.test(fill) && !/gate:\s*PASS/.test(gate)) throw new Error('E131_FILL_GATE_MISMATCH');
const corpus = fs.readdirSync(E131_ROOT).filter((f) => f.endsWith('.md')).map((f) => fs.readFileSync(path.join(E131_ROOT, f), 'utf8')).join('\n');
if (/https?:\/\/[^\s]*:[^\s]*@/.test(corpus)) throw new Error('E131_SECRET_URL');
if (!/- status: PASS/.test(fs.readFileSync(path.join(E131_ROOT, 'ZERO_WRITES_ON_FAIL.md'), 'utf8'))) throw new Error('E131_ZERO_WRITES_FAIL');
if (!/parity_3of3: (PASS|PENDING)/.test(fs.readFileSync(path.join(E131_ROOT, 'SEAL_X2.md'), 'utf8'))) throw new Error('E131_SEAL_FAIL');
if (!/verdict: (MATCH|PENDING)/.test(fs.readFileSync(path.join(E131_ROOT, 'REPLAY_X2.md'), 'utf8'))) throw new Error('E131_REPLAY_FAIL');
if (!fs.existsSync('artifacts/incoming/E131_evidence.tar.gz') || !fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')) throw new Error('E131_PACK_MISSING');
verifySums(path.join(E131_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E131/SHA256SUMS.md']);
