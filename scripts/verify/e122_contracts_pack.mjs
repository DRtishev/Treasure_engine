#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E122_ROOT } from './e122_lib.mjs';
const req = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','CONNECTIVITY_DIAG.md','EXECUTION_FLOW.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_DAILY_REPORT.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md'];
const miss = req.filter((f) => !fs.existsSync(path.join(E122_ROOT, f)));
if (miss.length) throw new Error(`E122_CONTRACTS_MISSING:${miss.join(',')}`);
for (const s of ['scripts/verify/e122_contract_redaction.mjs', 'scripts/verify/e122_contract_anti_fake_full.mjs']) {
  const r = spawnSync('node', [s], { stdio: 'inherit', env: { ...process.env, UPDATE_E122_EVIDENCE: '0' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E122_CONTRACT_FAIL:${s}`);
}
