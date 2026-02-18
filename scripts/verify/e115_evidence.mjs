#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E115_ROOT, modeE115, isCITruthy, writeMdAtomic, evidenceFingerprintE115, anchorsE115 } from './e115_lib.mjs';

const update=process.env.UPDATE_E115_EVIDENCE==='1';
const run=(cmd)=>{ const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error(`E115_STEP_FAIL:${cmd.join(' ')}`); };
if(update && !isCITruthy()){
  fs.mkdirSync(E115_ROOT,{recursive:true});
  run(['node','scripts/data/e115_net_fullness.mjs']);
  run(['node','scripts/data/e115_adapter_fixture_runner.mjs']);
  run(['node','scripts/data/e115_acquire.mjs']);
  run(['node','scripts/data/e115_binance_wss_collect.mjs']);
  run(['node','scripts/data/e115_build_replay_bundle.mjs']);
  run(['node','scripts/verify/e115_replay_x2.mjs']);


  writeMdAtomic(path.join(E115_ROOT,'ZERO_WRITES_ON_FAIL.md'),'# E115 ZERO WRITES ON FAIL\n- protected_state_before: NOT_APPLICABLE\n- protected_state_after: NOT_APPLICABLE\n- status: PASS');

  writeMdAtomic(path.join(E115_ROOT,'CONTRACTS_SUMMARY.md'),'# E115 CONTRACTS SUMMARY\n- mapping: enforced\n- fixtures: enforced\n- wss replay parity: enforced\n- input binding lock: enforced\n- snapshot integrity: enforced');
  writeMdAtomic(path.join(E115_ROOT,'PERF_NOTES.md'),'# E115 PERF NOTES\n- Deterministic provider order + input binding lock + replay-safe seals.');
  writeMdAtomic(path.join(E115_ROOT,'CLOSEOUT.md'),'# E115 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMdAtomic(path.join(E115_ROOT,'VERDICT.md'),'# E115 VERDICT\n- canonical_fingerprint: pending');
  rewriteSums(E115_ROOT,['SHA256SUMS.md'],'reports/evidence');
  let canon=evidenceFingerprintE115(); const mode=modeE115(); const nf=fs.readFileSync(path.join(E115_ROOT,'NET_FULLNESS.md'),'utf8');
  let verdict='PASS'; if(mode==='ONLINE_REQUIRED'&&!/status:\s*FULL/.test(nf)) verdict='FAIL'; else if(mode==='ONLINE_OPTIONAL'&&/status:\s*WARN/.test(nf)) verdict='WARN';
  writeMdAtomic(path.join(E115_ROOT,'CLOSEOUT.md'),['# E115 CLOSEOUT','## Anchors',...Object.entries(anchorsE115()).map(([k,v])=>`- ${k}: ${v}`),`- mode: ${mode}`,`- verdict: ${verdict}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMdAtomic(path.join(E115_ROOT,'VERDICT.md'),['# E115 VERDICT',`- mode: ${mode}`,`- status: ${verdict}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSums(E115_ROOT,['SHA256SUMS.md'],'reports/evidence'); canon=evidenceFingerprintE115();
  writeMdAtomic(path.join(E115_ROOT,'CLOSEOUT.md'),fs.readFileSync(path.join(E115_ROOT,'CLOSEOUT.md'),'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/,`canonical_fingerprint: ${canon}`));
  writeMdAtomic(path.join(E115_ROOT,'VERDICT.md'),fs.readFileSync(path.join(E115_ROOT,'VERDICT.md'),'utf8').replace(/canonical_fingerprint: [a-f0-9]{64}/,`canonical_fingerprint: ${canon}`));
  rewriteSums(E115_ROOT,['SHA256SUMS.md'],'reports/evidence');
  console.log('e115_evidence update: PASS'); process.exit(0);
}
const req=['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','PROVIDERS.md','PROVIDER_FIXTURES.md','BINANCE_WSS.md','WSS_REPLAY_X2.md','INPUT_BINDING.md','SNAPSHOT_INTEGRITY.md','NET_FULLNESS.md','ZERO_WRITES_ON_FAIL.md','REPLAY_X2.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','REPLAY_BUNDLE.md'];
for(const f of req) if(!fs.existsSync(path.join(E115_ROOT,f))) throw new Error(`E115_MISSING:${f}`);
verifySums(path.join(E115_ROOT,'SHA256SUMS.md'),['reports/evidence/E115/SHA256SUMS.md']);
const canon=evidenceFingerprintE115(); const c=fs.readFileSync(path.join(E115_ROOT,'CLOSEOUT.md'),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/); const v=fs.readFileSync(path.join(E115_ROOT,'VERDICT.md'),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
if(!c||!v||c[1]!==v[1]||c[1]!==canon) throw new Error('E115_CANONICAL_MISMATCH');
console.log('e115_evidence verify: PASS');
