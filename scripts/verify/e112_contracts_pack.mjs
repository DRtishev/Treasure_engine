#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cmds = [
  ['node', 'scripts/contracts/e112_net_mode_contract.mjs'],
  ['node', 'scripts/contracts/e112_net_proof_contract.mjs'],
  ['node', 'scripts/contracts/e112_data_quorum_v4.mjs'],
  ['node', 'scripts/contracts/e112_snapshot_integrity_contract.mjs'],
  ['node', 'scripts/contracts/e112_gap_cost_contract_v2.mjs'],
  ['node', 'scripts/contracts/e112_candidate_minimums_v2.mjs'],
  ['node', 'scripts/contracts/e112_live_safety_v2.mjs']
];
for (const c of cmds) {
  const r = spawnSync(c[0], c.slice(1), { stdio: 'inherit', env: { ...process.env, TZ: 'UTC', LANG: 'C', LC_ALL: 'C' } });
  if ((r.status ?? 1) !== 0) throw new Error(`e112_contracts_pack fail at ${c.join(' ')}`);
}
console.log('e112_contracts_pack: PASS');
