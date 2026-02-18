#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { E124_ROOT } from './e124_lib.mjs';
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','CAMPAIGN_PLAN.md','ATTEMPTS_INDEX.md','LIVE_SAFETY_V2.md','CONNECTIVITY_DIAG_V3.md','QUORUM_SCORE_V2.md','LIVE_FILL_PROOFS.md','LEDGER_CAMPAIGN_REPORT.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'];
for(const f of req) if(!fs.existsSync(path.join(E124_ROOT,f))) throw new Error(`E124_MISSING:${f}`);
const t=fs.readFileSync(path.join(E124_ROOT,'ATTEMPTS_INDEX.md'),'utf8');
for(const m of t.match(/\|\s*\d+\s*\|\s*([a-f0-9]{16})\s*\|/g)||[]){const id=m.split('|')[2].trim(); if(!fs.existsSync(path.join(E124_ROOT,`ATTEMPT_${id}.md`))) throw new Error(`E124_ATTEMPT_FILE_MISSING:${id}`);}
if(!fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')||!fs.existsSync('artifacts/incoming/E124_evidence.tar.gz')) throw new Error('E124_PACKAGING_MISSING');
if(!/- status: PASS/.test(fs.readFileSync(path.join(E124_ROOT,'ZERO_WRITES_ON_FAIL.md'),'utf8'))) throw new Error('E124_ZERO_WRITES_FAIL');
