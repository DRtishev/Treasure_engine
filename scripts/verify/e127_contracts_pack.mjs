#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E127_ROOT, E127_REQUIRED } from './e127_lib.mjs';

for (const f of E127_REQUIRED) if (!fs.existsSync(path.join(E127_ROOT,f))) throw new Error(`E127_MISSING:${f}`);
const d=fs.readFileSync(path.join(E127_ROOT,'EGRESS_DIAG_V6.md'),'utf8');
for (const col of ['target_id','provider','channel','endpoint','url_hash','dns_ok','tcp_ok','tls_ok','http_ok','ws_handshake_ok','ws_event_ok','rtt_ms','bytes','reason_code']) if(!d.includes(col)) throw new Error(`E127_DIAG_COL_MISSING:${col}`);
const redactionCorpus = fs.readdirSync(E127_ROOT).filter((f)=>f.endsWith('.md')).map((f)=>fs.readFileSync(path.join(E127_ROOT,f),'utf8')).join('\n');
if (/https?:\/\/[^\s]*:[^\s]*@/.test(redactionCorpus)) throw new Error('E127_REDACTION_FAIL_RAW_CREDENTIAL_URL');
if (/\b(?:AKIA|sk_live_|SECRET=|API_KEY=)\b/.test(redactionCorpus)) throw new Error('E127_REDACTION_FAIL_SECRET_PATTERN');
if (!/- status: PASS/.test(fs.readFileSync(path.join(E127_ROOT,'ZERO_WRITES_ON_FAIL.md'),'utf8'))) throw new Error('E127_ZERO_WRITES_FAIL');
if (!/parity_3of3: (PASS|PENDING)/.test(fs.readFileSync(path.join(E127_ROOT,'SEAL_X2.md'),'utf8'))) throw new Error('E127_SEAL_FAIL');
if (!/verdict: (MATCH|PENDING)/.test(fs.readFileSync(path.join(E127_ROOT,'REPLAY_X2.md'),'utf8'))) throw new Error('E127_REPLAY_FAIL');
if (!fs.existsSync('artifacts/incoming/E127_evidence.tar.gz') || !fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')) throw new Error('E127_PACK_MISSING');
