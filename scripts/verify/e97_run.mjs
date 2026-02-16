#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { E97_LOCK_PATH, E97_ROOT, ensureDir, isQuiet, minimalLog } from './e97_lib.mjs';

// E100-1: CI truthiness hardening
function isCIMode(){
  const ci=String(process.env.CI||'');
  return ci==='true'||ci==='1';
}

const update=process.env.UPDATE_E97_EVIDENCE==='1';
const updateState=process.env.UPDATE_E97_STATE==='1';
const chainMode=String(process.env.CHAIN_MODE||(isCIMode()?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
for(const k of Object.keys(process.env)) if(isCIMode()&&/^(UPDATE_|APPLY_|ROLLBACK_|ENABLE_DEMO_ADAPTER|ALLOW_MANUAL_RECON|DEMO_|DRILL_|CLEAR_)/.test(k)&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=${process.env.CI}`);
if(process.env.CLEAR_E97_KILL_LOCK==='1'&&!isCIMode()) fs.rmSync(E97_LOCK_PATH,{force:true});
if(fs.existsSync(E97_LOCK_PATH)) throw new Error(`kill-lock active: ${E97_LOCK_PATH}`);

function armKillLock(reason){fs.mkdirSync(path.dirname(E97_LOCK_PATH),{recursive:true});fs.writeFileSync(E97_LOCK_PATH,`# E97 KILL LOCK\n- reason: ${reason}\n- clear_rule: CI=false CLEAR_E97_KILL_LOCK=1\n`);} 
function run(name,cmd,env,critical=true){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0){if(critical) armKillLock(`critical_failure:${name}`);throw new Error(`verify:e97 failed at ${name}`);}}
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').filter(Boolean)){if(row.length<3) continue;m.set(row.slice(3),row.slice(0,2));}return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E97/')||r==='package.json'||r.startsWith('scripts/verify/e97_')||r==='AGENTS.md'||r==='agents.md'||r==='core/edge/state/profit_ledger_state.md'||r==='core/edge/state/fixtures/e97_profit_ledger_adverse_fixture.md'||r==='core/edge/contracts/e97_envelope_tuning_overlay.md'||r==='.foundation-seal/E97_KILL_LOCK.md'||r.startsWith('reports/evidence/E98/')||r.startsWith('scripts/verify/e98_')||r.startsWith('reports/evidence/E99/')||r.startsWith('scripts/verify/e99_')||r.startsWith('reports/evidence/E100/')||r.startsWith('scripts/verify/e100_')||r==='.foundation-seal/E100_KILL_LOCK.md'||r==='.foundation-seal/E100_APPLY_JOURNAL.json'||r.startsWith('reports/evidence/SPEC_REFACTOR/'));}

const env={...process.env,CHAIN_MODE:chainMode,TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
// E100-4: Path invariance - use <REPO_ROOT> instead of absolute path
const pre=['# E97 PREFLIGHT','- pwd: <REPO_ROOT>',`- branch: ${spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim()}`,`- head: ${spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()}`,`- node: ${spawnSync('node',['-v'],{encoding:'utf8'}).stdout.trim()}`,`- npm: ${spawnSync('npm',['-v'],{encoding:'utf8'}).stdout.trim()}`,'- git_status_sb:','```',spawnSync('git',['status','-sb'],{encoding:'utf8'}).stdout.trim(),'```',`- env_CI: ${String(process.env.CI||'')}`].join('\n');
ensureDir(E97_ROOT);if(update&&!isCIMode()) writeMd(path.join(E97_ROOT,'PREFLIGHT.md'),pre);
const before=gitStatus();
if(chainMode==='FULL') run('verify:e96',['npm','run','-s','verify:e96'],{...env,CI:'true'});
else run('verify:e96:pack',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E96/CLOSEOUT.md reports/evidence/E96/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E96/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});
if(updateState) run('profit-ledger-update',['node','scripts/verify/e97_profit_ledger_update.mjs'],env);
run('court',['node','scripts/verify/e97_envelope_tuning_court.mjs'],env);
run('adverse-suite',['node','scripts/verify/e97_adverse_fixture_suite.mjs'],env);
if(process.env.CI!=='true'&&process.env.UPDATE_E97_APPLY==='1'&&String(process.env.APPLY_MODE||'').toUpperCase()==='APPLY') run('apply',['node','scripts/verify/e97_apply_overlay.mjs'],env);
run('perf-notes',['node','scripts/verify/e97_perf_notes.mjs'],env,false);
run('no-secrets',['node','scripts/verify/e97_no_secrets_scan.mjs'],env,false);
run('evidence',['node','scripts/verify/e97_evidence.mjs'],env);
const after=gitStatus();
if(before!==after){if(isCIMode()) throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
minimalLog(`verify:e97 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
