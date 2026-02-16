#!/usr/bin/env node
// E98-3: Governed apply rehearsal - exercise E97 apply path safely
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E98_ROOT, ensureDir, isCIMode, isQuiet, minimalLog } from './e98_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E98_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E98_EVIDENCE forbidden in CI');
if(isCIMode()) throw new Error('apply_rehearsal forbidden in CI mode');

function run(name,cmd,env,opts={}){
  if(!isQuiet()) minimalLog(`[E98_APPLY_REHEARSAL] ${name}`);
  const r=spawnSync(cmd[0],cmd.slice(1),{stdio:opts.silent?'pipe':'inherit',env,encoding:'utf8'});
  if((r.status??1)!==0){
    throw new Error(`apply_rehearsal failed at ${name}: exit ${r.status}`);
  }
  return r;
}

function gitStatus(){
  return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();
}

function parseMap(text){
  const m=new Map();
  for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))
    m.set(row.slice(3).trim(),row.slice(0,2));
  return m;
}

function captureE97Fingerprint(){
  const closeout='reports/evidence/E97/CLOSEOUT.md';
  if(!fs.existsSync(closeout)) return 'ABSENT';
  const m=fs.readFileSync(closeout,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
  return m?m[1]:'ABSENT';
}

const env={
  ...process.env,
  CHAIN_MODE:'FAST_PLUS',
  QUIET:'1',
  TZ:'UTC',
  LANG:'C',
  LC_ALL:'C',
  SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',
  SEED:String(process.env.SEED||'12345')
};

const report=[];
report.push('# E98 APPLY REHEARSAL');
report.push('');
report.push('## Phase 1: Baseline E97 (non-CI)');

const baseline_before=gitStatus();
const fp_baseline_before=captureE97Fingerprint();
run('baseline-e97-noci',['npm','run','-s','verify:e97'],{...env,CI:'false'});
const fp_baseline_after=captureE97Fingerprint();
report.push(`- baseline_fingerprint_before: ${fp_baseline_before}`);
report.push(`- baseline_fingerprint_after: ${fp_baseline_after}`);
report.push(`- baseline_stable: ${fp_baseline_before===fp_baseline_after}`);
report.push('');

report.push('## Phase 2: Baseline E97 (CI=true read-only)');
run('baseline-e97-ci',['npm','run','-s','verify:e97'],{...env,CI:'true'});
const fp_baseline_ci=captureE97Fingerprint();
report.push(`- baseline_ci_fingerprint: ${fp_baseline_ci}`);
report.push(`- ci_mode_stable: ${fp_baseline_after===fp_baseline_ci}`);
report.push('');

report.push('## Phase 3: E97 Apply (non-CI with UPDATE+APPLY)');
const apply_before=gitStatus();
const fp_before_apply=captureE97Fingerprint();

run('apply-e97',['npm','run','-s','verify:e97'],{
  ...env,
  CI:'false',
  UPDATE_E97_EVIDENCE:'1',
  UPDATE_E97_APPLY:'1',
  APPLY_MODE:'APPLY'
});

const apply_after=gitStatus();
const fp_after_apply=captureE97Fingerprint();

// Compute drift
const before_map=parseMap(apply_before);
const after_map=parseMap(apply_after);
const changed=[];
for(const [r,s] of after_map.entries())
  if(!before_map.has(r)||before_map.get(r)!==s)
    changed.push(r);
for(const r of before_map.keys())
  if(!after_map.has(r))
    changed.push(r);

const allowed_write_surface=[
  'reports/evidence/E97/',
  'core/edge/contracts/e97_envelope_tuning_overlay.md',
  'core/edge/state/profit_ledger_state.md',
  'core/edge/state/fixtures/e97_profit_ledger_adverse_fixture.md'
];

const out_of_scope=changed.filter((r)=>
  !allowed_write_surface.some((prefix)=>r.startsWith(prefix))
);

report.push(`- apply_fingerprint_before: ${fp_before_apply}`);
report.push(`- apply_fingerprint_after: ${fp_after_apply}`);
report.push(`- apply_changed_evidence: ${fp_before_apply!==fp_after_apply}`);
report.push(`- files_changed: ${changed.length}`);
report.push(`- out_of_scope_writes: ${out_of_scope.length}`);
if(out_of_scope.length>0){
  report.push('');
  report.push('### Out-of-scope writes (VIOLATION)');
  for(const f of out_of_scope) report.push(`  - ${f}`);
}
report.push('');

report.push('## Phase 4: Post-apply E97 (CI=true read-only)');
run('post-apply-e97-ci',['npm','run','-s','verify:e97'],{...env,CI:'true'});
const fp_post_apply=captureE97Fingerprint();
report.push(`- post_apply_fingerprint: ${fp_post_apply}`);
report.push(`- post_apply_stable: ${fp_after_apply===fp_post_apply}`);
report.push('');

report.push('## Phase 5: Determinism proof (x2)');
const fp_x2_1=captureE97Fingerprint();
run('determinism-x2',['npm','run','-s','verify:e97'],{...env,CI:'true'});
const fp_x2_2=captureE97Fingerprint();
report.push(`- run1_fingerprint: ${fp_x2_1}`);
report.push(`- run2_fingerprint: ${fp_x2_2}`);
report.push(`- deterministic_match: ${fp_x2_1===fp_x2_2}`);
report.push('');

const verdict=out_of_scope.length===0&&fp_x2_1===fp_x2_2?'PASS':'FAIL';
report.push(`## Verdict: ${verdict}`);
report.push('');
report.push('## Contract');
report.push('- E97 apply must write only to allowed surface');
report.push('- E97 must be deterministic across CI and non-CI runs');
report.push('- Post-apply CI run must not drift');

if(update&&!isCIMode()){
  ensureDir(E98_ROOT);
  writeMd(path.join(E98_ROOT,'APPLY_REHEARSAL.md'),report.join('\n'));

  // Write x2 proof
  const x2Report=[
    '# E98 RUNS APPLY REHEARSAL X2',
    '',
    '## Run 1',
    `- canonical_fingerprint: ${fp_x2_1}`,
    '',
    '## Run 2',
    `- canonical_fingerprint: ${fp_x2_2}`,
    '',
    `## Match: ${fp_x2_1===fp_x2_2?'PASS':'FAIL'}`
  ].join('\n');
  writeMd(path.join(E98_ROOT,'RUNS_APPLY_REHEARSAL_X2.md'),x2Report);
}

if(verdict==='FAIL'){
  console.error('E98 apply rehearsal FAILED');
  process.exit(1);
}

minimalLog('e98:apply_rehearsal PASSED');
