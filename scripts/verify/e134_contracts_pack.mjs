#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E134_ROOT, E134_REQUIRED, evidenceFingerprintE134 } from './e134_lib.mjs';
import { verifySums } from './foundation_sums.mjs';
for (const f of E134_REQUIRED) if (!fs.existsSync(path.join(E134_ROOT, f))) throw new Error(`E134_MISSING:${f}`);
const s = fs.readFileSync(path.join(E134_ROOT, 'TRANSPORT_STAGE_MATRIX.md'),'utf8');
const exact='| scenario | target | ip_family | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | bytes | reason_code |';
if (!s.includes(exact)) throw new Error('E134_DIAG_HEADER_MISMATCH');
const corpus = fs.readdirSync(E134_ROOT).filter((f)=>f.endsWith('.md')).map((f)=>fs.readFileSync(path.join(E134_ROOT,f),'utf8')).join('\n');
if (/(https?:\/\/[^\s]*@|authorization:\s*bearer\s+[a-z0-9._-]+)/i.test(corpus)) throw new Error('E134_REDACTION_FAIL');
if (!/full_allowed:\s*false/.test(fs.readFileSync(path.join(E134_ROOT,'CONTRACTS_SUMMARY.md'),'utf8'))) throw new Error('E134_ANTI_FAKE_FAIL');
verifySums(path.join(E134_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E134/SHA256SUMS.md']);
const c=/canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E134_ROOT,'CLOSEOUT.md'),'utf8'))?.[1];
const v=/canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E134_ROOT,'VERDICT.md'),'utf8'))?.[1];
if(!c||!v||c!==v||c!==evidenceFingerprintE134()) throw new Error('E134_CANONICAL_PARITY_FAIL');
