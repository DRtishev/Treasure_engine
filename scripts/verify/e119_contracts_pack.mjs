#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E119_ROOT } from './e119_lib.mjs';
const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','QUORUM_WINDOWS.md','LIVE_CONFIRM_MATRIX.md','QUORUM_SCORE.md','ANTI_FAKE_FULL.md','DATA_LINEAGE.md','REALITY_FUEL.md','PARITY_COURT_V4.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
const miss = req.filter((f) => !fs.existsSync(path.join(E119_ROOT, f)));
if (miss.length) throw new Error(`E119_CONTRACTS_MISSING:${miss.join(',')}`);
console.log('e119_contracts_pack: PASS');
