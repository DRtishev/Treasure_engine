#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { E126_ROOT } from './e126_lib.mjs';
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EGRESS_DIAG_V5.md','OPERATOR_CHECKLIST.md','QUORUM_POLICY.md','QUORUM_SUMMARY.md','ANTI_FAKE_FULL.md','FILL_RELIABILITY_REPORT.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md'];
for(const f of req) if(!fs.existsSync(path.join(E126_ROOT,f))) throw new Error(`E126_MISSING:${f}`);
const d=fs.readFileSync(path.join(E126_ROOT,'EGRESS_DIAG_V5.md'),'utf8');
for(const c of ['target_id','provider','channel','endpoint','url_hash','dns_ok','tcp_ok','tls_ok','http_status','ws_event','rtt_ms','bytes','schema_ok','non_empty','retries','time_drift_sec','reason_code']) if(!d.includes(c)) throw new Error(`E126_DIAG_COL_MISSING:${c}`);
if(!fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')||!fs.existsSync('artifacts/incoming/E126_evidence.tar.gz')) throw new Error('E126_PACK_MISSING');
if(!/- status: PASS/.test(fs.readFileSync(path.join(E126_ROOT,'ZERO_WRITES_ON_FAIL.md'),'utf8'))) throw new Error('E126_ZERO_WRITES_FAIL');
if(!/- parity_3of3: PASS/.test(fs.readFileSync(path.join(E126_ROOT,'SEAL_X2.md'),'utf8'))) throw new Error('E126_SEAL_FAIL');
if(!/verdict: MATCH/.test(fs.readFileSync(path.join(E126_ROOT,'REPLAY_X2.md'),'utf8'))) throw new Error('E126_REPLAY_FAIL');
