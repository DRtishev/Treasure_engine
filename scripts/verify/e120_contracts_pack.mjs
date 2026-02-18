#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E120_ROOT } from './e120_lib.mjs';
const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EXECUTION_ADAPTER.md','LIVE_SAFETY.md','MICRO_LIVE_RUN.md','LEDGER_DAILY_REPORT.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
const miss = req.filter((f) => !fs.existsSync(path.join(E120_ROOT, f)));
if (miss.length) throw new Error(`E120_CONTRACTS_MISSING:${miss.join(',')}`);
