#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const cmds=[
  ['node','scripts/verify/e101_path_invariance_contract.mjs'],
  ['node','scripts/verify/e101_eol_contract.mjs'],
  ['node','scripts/verify/e101_node_truth_contract.mjs'],
  ['node','scripts/verify/e101_no_secrets_scan.mjs'],
  ['node','scripts/verify/e106_porcelain_contract.mjs'],
  ['node','scripts/verify/e114_provider_parity_contract.mjs'],
  ['node','scripts/verify/e114_promotion_contract.mjs'],
  ['node','scripts/verify/e114_data_quorum_v5.mjs'],
  ['node','scripts/verify/e114_graduation_realism_gate.mjs']
];
for(const c of cmds){ const r=spawnSync(c[0],c.slice(1),{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error(`E114_CONTRACT_FAIL:${c.join(' ')}`); }
console.log('e114_contracts_pack: PASS');
