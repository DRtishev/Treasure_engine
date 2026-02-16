#!/usr/bin/env node
// E99-1: COMPLETE APPLY REHEARSAL (mandatory execution)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E99_ROOT, ensureDir, isCIMode, isQuiet, minimalLog } from './e99_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E99_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E99_EVIDENCE forbidden in CI');
if(isCIMode()) throw new Error('apply_rehearsal forbidden in CI mode');

function run(name,cmd,env,opts={}){
  if(!isQuiet()) minimalLog(`[E99_APPLY_REHEARSAL] ${name}`);
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

function captureOverlayHash(){
  const p='core/edge/contracts/e97_envelope_tuning_overlay.md';
  if(!fs.existsSync(p)) return 'ABSENT';
  return sha256File(p);
}

// Build clean env without E99-specific UPDATE vars
const cleanEnv={...process.env};
delete cleanEnv.UPDATE_E99_EVIDENCE;

const env={
  ...cleanEnv,
  CHAIN_MODE:'FAST_PLUS',
  QUIET:'1',
  TZ:'UTC',
  LANG:'C',
  LC_ALL:'C',
  SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',
  SEED:String(process.env.SEED||'12345')
};

const report=[];
report.push('# E99 APPLY REHEARSAL');
report.push('');
report.push('## Phase 1: Pre-apply baseline (non-CI)');

const baseline_before=gitStatus();
const fp_baseline_before=captureE97Fingerprint();
run('pre-apply-e97-noci',['npm','run','-s','verify:e97'],{...env,CI:'false'});
const fp_baseline_after=captureE97Fingerprint();
report.push(`- baseline_fingerprint_before: ${fp_baseline_before}`);
report.push(`- baseline_fingerprint_after: ${fp_baseline_after}`);
report.push(`- baseline_stable: ${fp_baseline_before===fp_baseline_after}`);

// Save pre-apply snapshot
if(update&&!isCIMode()){
  ensureDir(E99_ROOT);
  writeMd(path.join(E99_ROOT,'PRE_APPLY_E97_SNAPSHOT.md'),
    `# PRE APPLY E97 SNAPSHOT\n- canonical_fingerprint: ${fp_baseline_after}\n`);
}
report.push('');

report.push('## Phase 2: Pre-apply baseline (CI=true read-only)');
run('pre-apply-e97-ci',['npm','run','-s','verify:e97'],{...env,CI:'true'});
const fp_baseline_ci=captureE97Fingerprint();
report.push(`- baseline_ci_fingerprint: ${fp_baseline_ci}`);
report.push(`- ci_mode_stable: ${fp_baseline_after===fp_baseline_ci}`);
report.push('');

report.push('## Phase 3: Apply x2 (idempotence test)');
const apply_before=gitStatus();
const overlay_before=captureOverlayHash();

// Apply run #1
run('apply-e97-run1',['npm','run','-s','verify:e97:apply'],{
  ...env,
  CI:'false',
  UPDATE_E97_EVIDENCE:'1',
  UPDATE_E97_APPLY:'1',
  APPLY_MODE:'APPLY'
});

const overlay_after_1=captureOverlayHash();
const fp_after_apply_1=captureE97Fingerprint();

// Apply run #2 (idempotence check - should not change overlay)
run('apply-e97-run2',['npm','run','-s','verify:e97:apply'],{
  ...env,
  CI:'false',
  UPDATE_E97_EVIDENCE:'1',
  UPDATE_E97_APPLY:'1',
  APPLY_MODE:'APPLY'
});

const overlay_after_2=captureOverlayHash();
const fp_after_apply_2=captureE97Fingerprint();

report.push(`- overlay_before: ${overlay_before}`);
report.push(`- overlay_after_run1: ${overlay_after_1}`);
report.push(`- overlay_after_run2: ${overlay_after_2}`);
report.push(`- idempotent: ${overlay_after_1===overlay_after_2}`);
report.push(`- apply_fingerprint_run1: ${fp_after_apply_1}`);
report.push(`- apply_fingerprint_run2: ${fp_after_apply_2}`);
report.push('');

const apply_after=gitStatus();

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
  'reports/evidence/E99/',
  'core/edge/contracts/e97_envelope_tuning_overlay.md',
  'core/edge/state/profit_ledger_state.md',
  'core/edge/state/fixtures/e97_profit_ledger_adverse_fixture.md'
];

const out_of_scope=changed.filter((r)=>
  !allowed_write_surface.some((prefix)=>r.startsWith(prefix))
);

report.push(`- files_changed: ${changed.length}`);
report.push(`- out_of_scope_writes: ${out_of_scope.length}`);
if(out_of_scope.length>0){
  report.push('');
  report.push('### Out-of-scope writes (VIOLATION)');
  for(const f of out_of_scope) report.push(`  - ${f}`);
}
report.push('');

report.push('## Phase 4: Post-apply verification (non-CI)');
run('post-apply-e97-noci',['npm','run','-s','verify:e97'],{...env,CI:'false'});
const fp_post_apply_noci=captureE97Fingerprint();
report.push(`- post_apply_noci_fingerprint: ${fp_post_apply_noci}`);

// Save post-apply snapshot
if(update&&!isCIMode()){
  writeMd(path.join(E99_ROOT,'POST_APPLY_E97_SNAPSHOT.md'),
    `# POST APPLY E97 SNAPSHOT\n- canonical_fingerprint: ${fp_post_apply_noci}\n`);
}
report.push('');

report.push('## Phase 5: Post-apply verification (CI=true read-only)');
run('post-apply-e97-ci',['npm','run','-s','verify:e97'],{...env,CI:'true'});
const fp_post_apply_ci=captureE97Fingerprint();
report.push(`- post_apply_ci_fingerprint: ${fp_post_apply_ci}`);
report.push(`- post_apply_stable: ${fp_post_apply_noci===fp_post_apply_ci}`);
report.push('');

const verdict=(
  out_of_scope.length===0 &&
  overlay_after_1===overlay_after_2 &&
  fp_post_apply_noci===fp_post_apply_ci
)?'PASS':'FAIL';

report.push(`## Verdict: ${verdict}`);
report.push('');
report.push('## Contracts');
report.push('- E97 apply must be idempotent (overlay hash stable across x2 runs)');
report.push('- E97 apply must write only to allowed surface');
report.push('- Post-apply CI read-only must not drift');

if(update&&!isCIMode()){
  ensureDir(E99_ROOT);
  writeMd(path.join(E99_ROOT,'APPLY_REHEARSAL.md'),report.join('\n'));

  // Write x2 proof
  const x2Report=[
    '# E99 RUNS APPLY REHEARSAL X2',
    '',
    '## Run 1',
    `- overlay_hash: ${overlay_after_1}`,
    `- e97_fingerprint: ${fp_after_apply_1}`,
    '',
    '## Run 2',
    `- overlay_hash: ${overlay_after_2}`,
    `- e97_fingerprint: ${fp_after_apply_2}`,
    '',
    `## Idempotent: ${overlay_after_1===overlay_after_2?'PASS':'FAIL'}`,
    `## Match: ${fp_after_apply_1===fp_after_apply_2?'PASS':'FAIL'}`
  ].join('\n');
  writeMd(path.join(E99_ROOT,'RUNS_APPLY_REHEARSAL_X2.md'),x2Report);
}

if(verdict==='FAIL'){
  console.error('E99 apply rehearsal FAILED');
  process.exit(1);
}

minimalLog('e99:apply_rehearsal PASSED');
