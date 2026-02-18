#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { E129_ROOT, E129_REQUIRED } from './e129_lib.mjs'; import { verifySums } from './foundation_sums.mjs';
for(const f of E129_REQUIRED) if(!fs.existsSync(path.join(E129_ROOT,f))) throw new Error(`E129_MISSING:${f}`);
const d=fs.readFileSync(path.join(E129_ROOT,'EGRESS_DIAG_V8.md'),'utf8');
for(const c of ['target_id','provider','channel','endpoint','url_hash','family','rest_stack','dns_ok','tcp_ok','tls_ok','http_ok','ws_handshake_ok','ws_event_ok','rest_payload_ok','handshake_rtt_ms','first_event_rtt_ms','rtt_ms','bytes','err_code','reason_code']) if(!d.includes(c)) throw new Error(`E129_DIAG_COL_MISSING:${c}`);
for(const f of ['QUORUM_POLICY_V4.md','QUORUM_SCORE_V5.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md']) if(!fs.existsSync(path.join(E129_ROOT,f))) throw new Error(`E129_QUORUM_MISSING:${f}`);
const corpus=fs.readdirSync(E129_ROOT).filter((f)=>f.endsWith('.md')).map((f)=>fs.readFileSync(path.join(E129_ROOT,f),'utf8')).join('\n');
if(/https?:\/\/[^\s]*:[^\s]*@/.test(corpus)) throw new Error('E129_SECRET_LEAK_URL'); if(/\b(?:AKIA|sk_live_|API_KEY=|SECRET=)\b/.test(corpus)) throw new Error('E129_SECRET_PATTERN');
if(!/- status: PASS/.test(fs.readFileSync(path.join(E129_ROOT,'ZERO_WRITES_ON_FAIL.md'),'utf8'))) throw new Error('E129_ZERO_WRITES_FAIL');
if(!/parity_3of3: (PASS|PENDING)/.test(fs.readFileSync(path.join(E129_ROOT,'SEAL_X2.md'),'utf8'))) throw new Error('E129_SEAL_FAIL');
if(!/verdict: (MATCH|PENDING)/.test(fs.readFileSync(path.join(E129_ROOT,'REPLAY_X2.md'),'utf8'))) throw new Error('E129_REPLAY_FAIL');
if(!fs.existsSync('artifacts/incoming/E129_evidence.tar.gz')||!fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')) throw new Error('E129_PACK_MISSING');
verifySums(path.join(E129_ROOT,'SHA256SUMS.md'),['reports/evidence/E129/SHA256SUMS.md']);
