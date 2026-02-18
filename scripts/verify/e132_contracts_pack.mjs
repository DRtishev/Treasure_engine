#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E132_ROOT, E132_REQUIRED } from './e132_lib.mjs';
import { verifySums } from './foundation_sums.mjs';

for (const f of E132_REQUIRED) if (!fs.existsSync(path.join(E132_ROOT, f))) throw new Error(`E132_MISSING:${f}`);
const d = fs.readFileSync(path.join(E132_ROOT, 'EGRESS_DIAG_V10.md'), 'utf8');
for (const c of ['scenario','path','ip_family','target_kind','host_hash','port','dns_ok','tcp_ok','tls_ok','http_ok','ws_handshake_ok','ws_event_ok','rtt_ms','bytes','reason_code','retry_count','proxy_shape_hash','ca_present']) {
  if (!d.includes(c)) throw new Error(`E132_DIAG_COL_MISSING:${c}`);
}
for (const line of d.split('\n')) {
  if (!line.startsWith('| S')) continue;
  const parts = line.split('|').map((x)=>x.trim());
  const reason = parts[15] || '';
  if (!reason) throw new Error('E132_EMPTY_REASON_CODE');
}
const cs = fs.readFileSync(path.join(E132_ROOT, 'CONNECT_PROOF.md'),'utf8');
const nConnect = cs.split('\n').filter((l)=>/^\|\s*[a-f0-9]{16}\s*\|/.test(l)).length;
if (nConnect < 5) throw new Error('E132_CONNECT_MIN5_FAIL');
if (!/proxy_dispatcher_enabled: (true|false)/.test(cs)) throw new Error('E132_PROXY_USAGE_PROOF_MISSING');
const anti = fs.readFileSync(path.join(E132_ROOT, 'ANTI_FAKE_FULL_V9.md'),'utf8');
if (!anti.includes('V9')) throw new Error('E132_ANTI_FAKE_VERSION');
const corpus = fs.readdirSync(E132_ROOT).filter((f)=>f.endsWith('.md')).map((f)=>fs.readFileSync(path.join(E132_ROOT,f),'utf8')).join('\n');
if (/(api[_-]?key\s*[=:]|secret\s*[=:]|authorization:\s*bearer\s+[a-z0-9._-]+)/i.test(corpus)) throw new Error('E132_SECRET_LEAK');
verifySums(path.join(E132_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E132/SHA256SUMS.md']);
