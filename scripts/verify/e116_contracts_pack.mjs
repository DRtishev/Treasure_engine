#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cmds = [
  ['node', 'scripts/verify/e101_path_invariance_contract.mjs'],
  ['node', 'scripts/verify/e101_eol_contract.mjs'],
  ['node', 'scripts/verify/e101_node_truth_contract.mjs'],
  ['node', 'scripts/verify/e101_no_secrets_scan.mjs'],
  ['node', 'scripts/contracts/e116_net_proof_ws_matrix.mjs'],
  ['node', 'scripts/contracts/e116_ws_rest_parity_contract.mjs'],
  ['node', 'scripts/contracts/e116_no_lookahead_ws_contract.mjs'],
  ['node', 'scripts/contracts/e116_candidate_minimums_contract.mjs'],
  ['node', 'scripts/contracts/e116_graduation_realism_gate.mjs'],
  ['node', 'scripts/contracts/e116_zero_writes_on_fail.mjs']
];
for (const c of cmds) {
  const r = spawnSync(c[0], c.slice(1), { stdio: 'inherit', env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' } });
  if ((r.status ?? 1) !== 0) throw new Error(`E116_CONTRACT_FAIL:${c.join(' ')}`);
}
console.log('e116_contracts_pack: PASS');
