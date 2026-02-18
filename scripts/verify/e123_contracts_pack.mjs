#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { E123_ROOT } from './e123_lib.mjs';
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','CONNECTIVITY_DIAG_V2.md','TESTNET_AUTH_PRECHECK.md','ARMING_PROOF.md','EXECUTION_FLOW_V2.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_DAILY_REPORT.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'];
const miss=req.filter(f=>!fs.existsSync(path.join(E123_ROOT,f))); if(miss.length) throw new Error(`E123_MISSING:${miss.join(',')}`);
for(const s of ['scripts/verify/e123_contract_diag_completeness.mjs','scripts/verify/e123_contract_redaction.mjs','scripts/verify/e123_contract_anti_fake_full_v4.mjs','scripts/verify/e123_contract_fill_ledger_match.mjs','scripts/verify/e123_contract_packaging.mjs','scripts/verify/e123_contract_zero_writes.mjs']){
 const r=spawnSync('node',[s],{stdio:'inherit'}); if((r.status??1)!==0) throw new Error(`E123_CONTRACT_FAIL:${s}`);
}
