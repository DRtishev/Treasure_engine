#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const cmds=[
 ['node','scripts/verify/e101_path_invariance_contract.mjs'],
 ['node','scripts/verify/e101_eol_contract.mjs'],
 ['node','scripts/verify/e101_node_truth_contract.mjs'],
 ['node','scripts/verify/e101_no_secrets_scan.mjs'],
 ['node','scripts/verify/e106_porcelain_contract.mjs'],
 ['node','scripts/verify/e115_mapping_contract.mjs'],
 ['node','scripts/verify/e115_input_binding_lock_contract.mjs'],
 ['node','scripts/verify/e115_snapshot_integrity_contract.mjs'],
 ['node','scripts/verify/e115_wss_replay_parity_contract.mjs']
];
for(const c of cmds){ const r=spawnSync(c[0],c.slice(1),{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error(`E115_CONTRACT_FAIL:${c.join(' ')}`); }
console.log('e115_contracts_pack: PASS');
