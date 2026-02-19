#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E133_ROOT, E133_REQUIRED } from './e133_lib.mjs';
import { verifySums } from './foundation_sums.mjs';
for (const f of E133_REQUIRED) if (!fs.existsSync(path.join(E133_ROOT, f))) throw new Error(`E133_MISSING:${f}`);
const stage = fs.readFileSync(path.join(E133_ROOT, 'TRANSPORT_STAGE_MATRIX.md'), 'utf8');
for (const c of ['dns_ok','tcp_ok','tls_ok','http_ok','ws_handshake_ok','ws_event_ok','tcp_to_proxy_ok','connect_tunnel_ok','tls_over_tunnel_ok','http_over_tunnel_ok','ws_over_tunnel_ok','reason_code']) if (!stage.includes(c)) throw new Error(`E133_DIAG_COL_MISSING:${c}`);
const corpus = fs.readdirSync(E133_ROOT).filter((f)=>f.endsWith('.md')).map((f)=>fs.readFileSync(path.join(E133_ROOT,f),'utf8')).join('\n');
if (/(https?:\/\/[^\s]*@|authorization:\s*bearer\s+[a-z0-9._-]+)/i.test(corpus)) throw new Error('E133_REDACTION_FAIL');
if (!/full_forbidden_without_filled_and_ledger_match:\s*true/.test(fs.readFileSync(path.join(E133_ROOT, 'ANTI_FAKE_FULL.md'), 'utf8'))) throw new Error('E133_ANTI_FAKE_FAIL');
verifySums(path.join(E133_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E133/SHA256SUMS.md']);
