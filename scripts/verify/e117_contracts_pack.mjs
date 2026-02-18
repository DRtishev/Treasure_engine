#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E117_ROOT } from './e117_lib.mjs';

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF_QUORUM.md','WS_PROVIDERS.md','WS_CAPTURE.md','WS_REPLAY.md','PARITY_COURT_V2.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_BUNDLE_MANIFEST.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
const missing = req.filter((f) => !fs.existsSync(path.join(E117_ROOT, f)));
if (missing.length) throw new Error(`E117_CONTRACTS_MISSING:${missing.join(',')}`);
console.log('e117_contracts_pack: PASS');
