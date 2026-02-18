#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E114_ROOT, modeE114, isCITruthy, writeMdAtomic, evidenceFingerprintE114, anchorsE114 } from './e114_lib.mjs';

const update=process.env.UPDATE_E114_EVIDENCE==='1';
const run=(cmd)=>{ const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error(`E114_STEP_FAIL:${cmd.join(' ')}`); };
if(update && !isCITruthy()){
  fs.mkdirSync(E114_ROOT,{recursive:true});
  run(['node','scripts/data/e114_net_matrix.mjs']);
  run(['node','scripts/data/e114_acquire_capsules.mjs']);
  run(['node','scripts/verify/e114_provider_parity_contract.mjs']);
  run(['node','scripts/data/e114_promote_snapshot.mjs']);
  run(['node','scripts/verify/e114_promotion_contract.mjs']);
  run(['node','scripts/verify/e114_data_quorum_v5.mjs']);
  run(['node','scripts/verify/e114_graduation_realism_gate.mjs']);
  run(['node','scripts/data/e114_build_replay_bundle.mjs']);
  run(['node','scripts/verify/e114_replay_x2.mjs']);

  writeMdAtomic(path.join(E114_ROOT,'CONTRACTS_SUMMARY.md'),'# E114 CONTRACTS SUMMARY\n- provider_parity: executed\n- promotion: executed\n- quorum_v5: executed\n- graduation_realism: executed\n- baseline_contracts: executed');
  writeMdAtomic(path.join(E114_ROOT,'PERF_NOTES.md'),'# E114 PERF NOTES\n- Deterministic provider order + atomic pinning + replay bundle parity.');
  writeMdAtomic(path.join(E114_ROOT,'CLOSEOUT.md'),'# E114 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMdAtomic(path.join(E114_ROOT,'VERDICT.md'),'# E114 VERDICT\n- canonical_fingerprint: pending');
  rewriteSums(E114_ROOT,['SHA256SUMS.md'],'reports/evidence');
  let canon=evidenceFingerprintE114();
  const mode=modeE114();
  const np=fs.readFileSync(path.join(E114_ROOT,'NET_PROOF.md'),'utf8');
  const rf=fs.readFileSync(path.join(E114_ROOT,'REALITY_FUEL.md'),'utf8');
  let verdict='PASS';
  if(mode==='ONLINE_REQUIRED' && !/status:\s*PASS/.test(np)) verdict='FAIL';
  else if(mode==='ONLINE_OPTIONAL' && (/status:\s*WARN/.test(np)||/verdict:\s*WARN/.test(rf))) verdict='WARN';
  writeMdAtomic(path.join(E114_ROOT,'CLOSEOUT.md'),['# E114 CLOSEOUT','## Anchors',...Object.entries(anchorsE114()).map(([k,v])=>`- ${k}: ${v}`),`- mode: ${mode}`,`- verdict: ${verdict}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E114_ROOT,'VERDICT.md'),['# E114 VERDICT',`- mode: ${mode}`,`- status: ${verdict}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSums(E114_ROOT,['SHA256SUMS.md'],'reports/evidence');
  canon=evidenceFingerprintE114();
  writeMdAtomic(path.join(E114_ROOT,'CLOSEOUT.md'),fs.readFileSync(path.join(E114_ROOT,'CLOSEOUT.md'),'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/,`canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E114_ROOT,'VERDICT.md'),fs.readFileSync(path.join(E114_ROOT,'VERDICT.md'),'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/,`canonical_fingerprint: ${canon}`));
  rewriteSums(E114_ROOT,['SHA256SUMS.md'],'reports/evidence');
  console.log('e114_evidence update: PASS');
  process.exit(0);
}
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF.md','PROVIDERS.md','PROVIDER_PARITY.md','REALITY_FUEL.md','CAPSULE_MANIFEST.md','PROMOTION_REPORT.md','DATA_QUORUM_V5.md','GRADUATION_REALISM_GATE.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E114_ROOT,f))) throw new Error(`E114_MISSING:${f}`);
verifySums(path.join(E114_ROOT,'SHA256SUMS.md'),['reports/evidence/E114/SHA256SUMS.md']);
const canon=evidenceFingerprintE114(); const c=fs.readFileSync(path.join(E114_ROOT,'CLOSEOUT.md'),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/); const v=fs.readFileSync(path.join(E114_ROOT,'VERDICT.md'),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if(!c||!v||c[1]!==v[1]||c[1]!==canon) throw new Error('E114_CANONICAL_MISMATCH');
console.log('e114_evidence verify: PASS');
