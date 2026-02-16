#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E88_ROOT, E88_STATE_PATH, ensureDir, isQuiet, minimalLog } from './e88_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E88_EVIDENCE==='1';
const updateState=process.env.UPDATE_E88_STATE==='1';
const updateApply=process.env.UPDATE_E88_APPLY==='1';
const chainMode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
for(const k of Object.keys(process.env)) if(process.env.CI==='true'&&/^(UPDATE_E88_|UPDATE_|APPLY_|ENABLE_DEMO_ADAPTER|ALLOW_MANUAL_RECON|ALLOW_NETWORK)/.test(k)&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);
function run(name,cmd,env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`verify:e88 failed at ${name}`);} 
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E88/')||r==='core/edge/state/reason_history_state.md'||r==='core/edge/contracts/e88_park_aging_policy.md'||r==='package.json');}

const env={...process.env,CHAIN_MODE:chainMode,TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const pre=['# E88 PREFLIGHT',`- pwd: ${process.cwd()}`,`- branch: ${spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim()}`,`- head: ${spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()}`,`- node: ${spawnSync('node',['-v'],{encoding:'utf8'}).stdout.trim()}`,`- npm: ${spawnSync('npm',['-v'],{encoding:'utf8'}).stdout.trim()}`,'- git_status_sb:','```',spawnSync('git',['status','-sb'],{encoding:'utf8'}).stdout.trim(),'```',`- env_CI: ${String(process.env.CI||'')}`,`- env_TZ: ${String(process.env.TZ||'')}`,`- env_LANG: ${String(process.env.LANG||'')}`,`- env_LC_ALL: ${String(process.env.LC_ALL||'')}`].join('\n');
ensureDir(E88_ROOT);if(update&&process.env.CI!=='true') writeMd(path.join(E88_ROOT,'PREFLIGHT.md'),pre);

const before=gitStatus();
if(chainMode==='FULL') run('verify:e87',['npm','run','-s','verify:e87'],{...env,CI:'true'});
else run('verify:e87:pack',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E87/CLOSEOUT.md reports/evidence/E87/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E87/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});
if(update&&updateState) run('reason-history-update',['node','scripts/verify/e88_reason_history_update.mjs'],env);
run('ordering-contract',['node','scripts/verify/e88_ordering_contract.mjs'],env);
run('park-court',['node','scripts/verify/e88_park_aging_court.mjs'],env);
if(update&&updateApply&&String(process.env.APPLY_MODE||'PROPOSE').toUpperCase()==='APPLY'&&process.env.CI!=='true') writeMd(path.join(E88_ROOT,'APPLY_RECEIPT.md'),'# E88 APPLY RECEIPT\n- status: PASS\n- mode: APPLY\n- update_scope: reason_history_state + evidence');
run('apply-x2',['node','scripts/verify/e88_apply_x2.mjs'],env);
run('perf-notes',['node','scripts/verify/e88_perf_notes.mjs'],env);
run('no-secrets',['node','scripts/verify/e88_no_secrets_scan.mjs'],env);
run('evidence',['node','scripts/verify/e88_evidence.mjs'],env);
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION'); if(!updateState&&before!==after&&after.includes('core/edge/state/reason_history_state.md')) throw new Error('STATE_UPDATE_FLAG_REQUIRED');}
if(!update&&!fs.existsSync(E88_STATE_PATH)) throw new Error('missing reason history state');
minimalLog(`verify:e88 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
