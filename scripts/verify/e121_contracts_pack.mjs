#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E121_ROOT } from './e121_lib.mjs';

const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','ANCHOR_SANITY.md','EXECUTION_ADAPTER.md','LIVE_SAFETY.md','MICRO_LIVE_RUN.md','LEDGER_DAILY_REPORT.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md'];
const miss = req.filter((f) => !fs.existsSync(path.join(E121_ROOT, f)));
if (miss.length) throw new Error(`E121_CONTRACTS_MISSING:${miss.join(',')}`);
for (const s of ['scripts/verify/e121_contract_anchor_sanity.mjs', 'scripts/verify/e121_contract_redaction.mjs', 'scripts/verify/e121_contract_anti_fake_full.mjs']) {
  const r = spawnSync('node', [s], { stdio: 'inherit', env: { ...process.env, UPDATE_E121_EVIDENCE: '0' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E121_CONTRACT_FAIL:${s}`);
}
