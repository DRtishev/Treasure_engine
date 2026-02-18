#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cmds = [
  ['node', 'scripts/verify/e113_online_proof_contract.mjs'],
  ['node', 'scripts/verify/e113_snapshot_freshness_contract.mjs'],
  ['node', 'scripts/verify/e113_replay_x2.mjs']
];
for (const c of cmds) {
  const r = spawnSync(c[0], c.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E113_CONTRACT_FAIL:${c.join(' ')}`);
}
console.log('e113_contracts_pack: PASS');
