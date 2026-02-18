#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E128_ROOT, E128_REQUIRED } from './e128_lib.mjs';
import { verifySums } from './foundation_sums.mjs';

for(const f of E128_REQUIRED) if(!fs.existsSync(path.join(E128_ROOT,f))) throw new Error(`E128_MISSING:${f}`);
const d=fs.readFileSync(path.join(E128_ROOT,'EGRESS_DIAG_V7.md'),'utf8');
for(const c of ['target_id','provider','channel','endpoint','url_hash','family','rest_stack','dns_ok','tcp_ok','tls_ok','http_ok','ws_handshake_ok','ws_event_ok','handshake_rtt_ms','first_event_rtt_ms','rtt_ms','bytes','reason_code']) if(!d.includes(c)) throw new Error(`E128_DIAG_COL_MISSING:${c}`);
const q=fs.readFileSync(path.join(E128_ROOT,'QUORUM_SUMMARY.md'),'utf8');
for(const c of ['rest_success','ws_success','freshness_ok','fallback_ratio','parity_live_input','provider_diversity_ok','live_success_count','quorum_full','weighted_score']) if(!q.includes(c)) throw new Error(`E128_QUORUM_COL_MISSING:${c}`);
const anti=fs.readFileSync(path.join(E128_ROOT,'ANTI_FAKE_FULL.md'),'utf8'); if(!anti.includes('V5')) throw new Error('E128_ANTI_FAKE_VERSION');
const live=fs.readFileSync(path.join(E128_ROOT,'LIVE_FILL_PROOF.md'),'utf8'); const gate=fs.readFileSync(path.join(E128_ROOT,'LIVE_FILL_GATE.md'),'utf8');
if(/- fill_verified: true/.test(live)&&!/- ledger_match: true/.test(live)) throw new Error('E128_FILL_LEDGER_CONTRACT_FAIL');
if(/- fill_verified: true/.test(live)&&!/gate: PASS/.test(gate)) throw new Error('E128_FILL_GATE_CONTRACT_FAIL');
const corpus=fs.readdirSync(E128_ROOT).filter((f)=>f.endsWith('.md')).map((f)=>fs.readFileSync(path.join(E128_ROOT,f),'utf8')).join('\n');
if(/https?:\/\/[^\s]*:[^\s]*@/.test(corpus)) throw new Error('E128_REDACTION_FAIL_RAW_URL_CREDENTIAL');
if(/\b(?:AKIA|sk_live_|API_KEY=|SECRET=)\b/.test(corpus)) throw new Error('E128_REDACTION_FAIL_SECRET');
if(!/- status: PASS/.test(fs.readFileSync(path.join(E128_ROOT,'ZERO_WRITES_ON_FAIL.md'),'utf8'))) throw new Error('E128_ZERO_WRITES_FAIL');
if(!/parity_3of3: (PASS|PENDING)/.test(fs.readFileSync(path.join(E128_ROOT,'SEAL_X2.md'),'utf8'))) throw new Error('E128_SEAL_FAIL');
if(!/verdict: (MATCH|PENDING)/.test(fs.readFileSync(path.join(E128_ROOT,'REPLAY_X2.md'),'utf8'))) throw new Error('E128_REPLAY_FAIL');
if(!fs.existsSync('artifacts/incoming/E128_evidence.tar.gz')||!fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')) throw new Error('E128_PACK_MISSING');
verifySums(path.join(E128_ROOT,'SHA256SUMS.md'),['reports/evidence/E128/SHA256SUMS.md']);
