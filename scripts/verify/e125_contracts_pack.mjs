#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { E125_ROOT } from './e125_lib.mjs';
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EGRESS_DIAG.md','QUORUM_POLICY.md','QUORUM_SUMMARY.md','ANTI_FAKE_FULL.md','FILL_PROBE_PLAN.md','LIVE_FILL_PROOFS.md','LIVE_FILL_GATE.md','LEDGER_CAMPAIGN_REPORT.md','EXEC_RELIABILITY_COURT.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'];
for(const f of req) if(!fs.existsSync(path.join(E125_ROOT,f))) throw new Error(`E125_MISSING:${f}`);
const e=fs.readFileSync(path.join(E125_ROOT,'EGRESS_DIAG.md'),'utf8'); for(const c of ['target_id','provider','channel','url_hash','dns_ok','tcp_ok','tls_ok','http_status','ws_upgrade_ok','first_event_ms','payload_nonempty','schema_ok','rtt_ms','time_drift_sec','reason_code']) if(!e.includes(c)) throw new Error(`E125_DIAG_COL_MISSING:${c}`);
if(!fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')||!fs.existsSync('artifacts/incoming/E125_evidence.tar.gz')) throw new Error('E125_PACK_MISSING');
if(!/- status: PASS/.test(fs.readFileSync(path.join(E125_ROOT,'ZERO_WRITES_ON_FAIL.md'),'utf8'))) throw new Error('E125_ZERO_WRITES_FAIL');
if(!/- parity_3of3: PASS/.test(fs.readFileSync(path.join(E125_ROOT,'SEAL_X2.md'),'utf8'))) throw new Error('E125_SEAL_FAIL');
if(!/verdict: MATCH/.test(fs.readFileSync(path.join(E125_ROOT,'REPLAY_X2.md'),'utf8'))) throw new Error('E125_REPLAY_FAIL');
