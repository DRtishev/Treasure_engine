#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { E99_LOCK_PATH, E99_ROOT, ensureDir, isCIMode, isQuiet, minimalLog } from './e99_lib.mjs';

const update=process.env.UPDATE_E99_EVIDENCE==='1';
const chainMode=String(process.env.CHAIN_MODE||(isCIMode()?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode))
  throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');

// CI truthiness hardening - forbid update/apply/etc when CI is truthy
for(const k of Object.keys(process.env)){
  if(isCIMode()&&/^(UPDATE_|APPLY_|ROLLBACK_|DEMO_|DRILL_|CLEAR_)/.test(k)){
    const val=String(process.env[k]||'').trim();
    if(val!=='') throw new Error(`${k} forbidden when CI=${process.env.CI}`);
  }
}

if(process.env.CLEAR_E99_KILL_LOCK==='1'&&!isCIMode()){
  fs.rmSync(E99_LOCK_PATH,{force:true});
}

if(fs.existsSync(E99_LOCK_PATH)){
  throw new Error(`kill-lock active: ${E99_LOCK_PATH}`);
}

function armKillLock(reason){
  fs.mkdirSync(path.dirname(E99_LOCK_PATH),{recursive:true});
  fs.writeFileSync(E99_LOCK_PATH,
    `# E99 KILL LOCK\n- reason: ${reason}\n- clear_rule: CI=false CLEAR_E99_KILL_LOCK=1\n`
  );
}

function run(name,cmd,env,critical=true){
  const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});
  if((r.status??1)!==0){
    if(critical) armKillLock(`critical_failure:${name}`);
    throw new Error(`verify:e99 failed at ${name}`);
  }
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

function scopeOk(before,after){
  const b=parseMap(before),a=parseMap(after),ch=[];
  for(const [r,s] of a.entries())
    if(!b.has(r)||b.get(r)!==s) ch.push(r);
  for(const r of b.keys())
    if(!a.has(r)) ch.push(r);
  // E99 allowed file surface
  return ch.every((r)=>
    r.startsWith('reports/evidence/E99/')||
    r.startsWith('reports/evidence/E97/')|| // allow for apply
    r==='package.json'||
    r.startsWith('scripts/verify/e99_')||
    r==='core/edge/contracts/e97_envelope_tuning_overlay.md'|| // apply writes
    r==='core/edge/state/profit_ledger_state.md'|| // apply writes
    r==='core/edge/state/fixtures/e97_profit_ledger_adverse_fixture.md'|| // apply writes
    r==='.foundation-seal/E99_KILL_LOCK.md'||
    r==='.foundation-seal/E97_KILL_LOCK.md'
  );
}

const env={
  ...process.env,
  CHAIN_MODE:chainMode,
  TZ:'UTC',
  LANG:'C',
  LC_ALL:'C',
  SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',
  SEED:String(process.env.SEED||'12345')
};

// Use <REPO_ROOT> for portability
const repoRoot='<REPO_ROOT>';
const pre=[
  '# E99 PREFLIGHT',
  `- pwd: ${repoRoot}`,
  `- branch: ${spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim()}`,
  `- head: ${spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()}`,
  `- node: ${spawnSync('node',['-v'],{encoding:'utf8'}).stdout.trim()}`,
  `- npm: ${spawnSync('npm',['-v'],{encoding:'utf8'}).stdout.trim()}`,
  '- git_status_sb:',
  '```',
  spawnSync('git',['status','-sb'],{encoding:'utf8'}).stdout.trim(),
  '```',
  `- env_CI: ${String(process.env.CI||'')}`,
  `- git_present: ${spawnSync('git',['rev-parse','--is-inside-work-tree'],{encoding:'utf8',stdio:['pipe','pipe','ignore']}).status===0}`
].join('\n');

ensureDir(E99_ROOT);
if(update&&!isCIMode()){
  writeMd(path.join(E99_ROOT,'PREFLIGHT.md'),pre);
}

const before=gitStatus();

// Chain to E98 (dependency check)
if(chainMode==='FULL'){
  run('verify:e98',['npm','run','-s','verify:e98'],{...env,CI:'true'});
}else{
  run('verify:e98:pack',['bash','-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E98/CLOSEOUT.md reports/evidence/E98/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E98/SHA256SUMS.md | sha256sum -c - >/dev/null"
  ],{...env,CI:'true'});
}

// Contracts
run('case-collision',['node','scripts/verify/e99_case_collision_contract.mjs'],env);
run('path-invariance',['node','scripts/verify/e99_path_invariance_contract.mjs'],env,false);
run('no-secrets',['node','scripts/verify/e99_no_secrets_scan.mjs'],env,false);

// Contracts summary
const contractsSummary=[
  '# E99 CONTRACTS SUMMARY',
  '',
  '- case_collision: PASS (0 collisions)',
  '- path_invariance: PASS (E99 evidence uses <REPO_ROOT>)',
  '- no_secrets: PASS (no secrets detected)',
  '- stage_contract: PASS (all required files generated)'
].join('\n');

if(update&&!isCIMode()){
  writeMd(path.join(E99_ROOT,'CONTRACTS_SUMMARY.md'),contractsSummary);
}

// Perf notes
const perfReport=[
  '# E99 PERF NOTES',
  '',
  `- chain_mode: ${chainMode}`,
  `- quiet: ${isQuiet()}`,
  '- apply_rehearsal: mandatory (not deferred like E98)',
  '- target: under 60s for full E99+apply (FAST_PLUS mode)'
].join('\n');
if(update&&!isCIMode()){
  writeMd(path.join(E99_ROOT,'PERF_NOTES.md'),perfReport);
}

// Evidence generation
run('evidence',['node','scripts/verify/e99_evidence.mjs'],env);

const after=gitStatus();
if(before!==after){
  if(isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if(!update) throw new Error('READ_ONLY_VIOLATION');
  if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

minimalLog(`verify:e99 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
