#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E118_ROOT } from './e118_lib.mjs';
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF_REAL.md','QUORUM_POLICY.md','ANTI_FAKE_FULL.md','REALITY_FUEL.md','DATA_LINEAGE.md','PARITY_COURT_V3.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
const miss=req.filter((f)=>!fs.existsSync(path.join(E118_ROOT,f)));
if(miss.length) throw new Error(`E118_CONTRACTS_MISSING:${miss.join(',')}`);
console.log('e118_contracts_pack: PASS');
