#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { E98_LOCK_PATH, E98_ROOT, ensureDir, isCIMode, isQuiet, minimalLog } from './e98_lib.mjs';

const update=process.env.UPDATE_E98_EVIDENCE==='1';
const chainMode=String(process.env.CHAIN_MODE||(isCIMode()?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode))
  throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');

// E98-4: CI truthiness hardening - forbid update/apply/etc when CI is truthy
for(const k of Object.keys(process.env)){
  if(isCIMode()&&/^(UPDATE_|APPLY_|ROLLBACK_|DEMO_|DRILL_|CLEAR_)/.test(k)){
    const val=String(process.env[k]||'').trim();
    if(val!=='') throw new Error(`${k} forbidden when CI=${process.env.CI}`);
  }
}

if(process.env.CLEAR_E98_KILL_LOCK==='1'&&!isCIMode()){
  fs.rmSync(E98_LOCK_PATH,{force:true});
}

if(fs.existsSync(E98_LOCK_PATH)){
  throw new Error(`kill-lock active: ${E98_LOCK_PATH}`);
}

function armKillLock(reason){
  fs.mkdirSync(path.dirname(E98_LOCK_PATH),{recursive:true});
  fs.writeFileSync(E98_LOCK_PATH,
    `# E98 KILL LOCK\n- reason: ${reason}\n- clear_rule: CI=false CLEAR_E98_KILL_LOCK=1\n`
  );
}

function run(name,cmd,env,critical=true){
  const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});
  if((r.status??1)!==0){
    if(critical) armKillLock(`critical_failure:${name}`);
    throw new Error(`verify:e98 failed at ${name}`);
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
  // E98 allowed file surface
  return ch.every((r)=>
    r.startsWith('reports/evidence/E98/')||
    r==='package.json'||
    r.startsWith('scripts/verify/e98_')||
    r==='.foundation-seal/E98_KILL_LOCK.md'||
    r==='agents.md' // allow removing this collision file
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

// E98-2: Path invariance - use <REPO_ROOT> instead of absolute pwd
const repoRoot='<REPO_ROOT>';
const pre=[
  '# E98 PREFLIGHT',
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

ensureDir(E98_ROOT);
if(update&&!isCIMode()){
  writeMd(path.join(E98_ROOT,'PREFLIGHT.md'),pre);
}

const before=gitStatus();

// Chain to E97 (FAST_PLUS mode checks E97 is valid)
if(chainMode==='FULL'){
  run('verify:e97',['npm','run','-s','verify:e97'],{...env,CI:'true'});
}else{
  run('verify:e97:pack',['bash','-lc',
    "grep -E 'canonical_fingerprint' reports/evidence/E97/CLOSEOUT.md reports/evidence/E97/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E97/SHA256SUMS.md | sha256sum -c - >/dev/null"
  ],{...env,CI:'true'});
}

// E98-1: Case collision contract
run('case-collision',['node','scripts/verify/e98_case_collision_scan.mjs'],env);

// E98-2: Path invariance
run('path-invariance',['node','scripts/verify/e98_path_invariance_check.mjs'],env,false);

// Perf notes
const perfReport=[
  '# E98 PERF NOTES',
  '',
  `- chain_mode: ${chainMode}`,
  `- quiet: ${isQuiet()}`,
  '- target: under 15s for FAST_PLUS'
].join('\n');
if(update&&!isCIMode()){
  writeMd(path.join(E98_ROOT,'PERF_NOTES.md'),perfReport);
}

// Evidence generation
run('evidence',['node','scripts/verify/e98_evidence.mjs'],env);

const after=gitStatus();
if(before!==after){
  if(isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION');
  if(!update) throw new Error('READ_ONLY_VIOLATION');
  if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

minimalLog(`verify:e98 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
