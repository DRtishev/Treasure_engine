#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { isQuiet, minimalLog } from './e86_lib.mjs';

const update=process.env.UPDATE_E86_EVIDENCE==='1';
const updThr=process.env.UPDATE_E86_THRESHOLDS==='1';
const chainMode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
for(const k of Object.keys(process.env)) if(process.env.CI==='true'&&/^(UPDATE_|APPLY_|APPROVE_|ENABLE_DEMO_ADAPTER|ALLOW_MANUAL_RECON|ALLOW_NETWORK)/.test(k)&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);
function run(name,cmd,env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`verify:e86 failed at ${name}`);}
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E86/')||r==='core/edge/contracts/e86_threshold_policy.md'||r==='core/edge/contracts/e86_canary_stage_policy.md');}
const env={...process.env,CHAIN_MODE:chainMode,CANARY_STAGE:String(process.env.CANARY_STAGE||'AUTO').toUpperCase(),TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const before=gitStatus();
if(chainMode==='FULL') run('verify:e85',['npm','run','-s','verify:e85'],{...env,CI:'true'});
else run('verify:e85:pack',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E85/CLOSEOUT.md reports/evidence/E85/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E85/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});
if(update&&process.env.ENABLE_DEMO_ADAPTER==='1'&&process.env.ALLOW_MANUAL_RECON==='1') run('demo-cadence',['node','scripts/verify/e86_demo_daily_cadence.mjs'],env);
run('tightening-court',['node','scripts/verify/e86_tightening_court.mjs'],env);
run('ordering-contract',['node','scripts/verify/e86_ordering_contract.mjs'],env);
if(update&&updThr) run('threshold-apply',['node','scripts/verify/e86_threshold_apply.mjs'],env);
run('threshold-apply-x2',['node','scripts/verify/e86_threshold_apply_x2.mjs'],env);
run('canary-x2',['node','scripts/verify/e86_edge_canary_x2.mjs'],env);
run('evidence',['node','scripts/verify/e86_evidence.mjs'],env);
const after=gitStatus();if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
minimalLog(`verify:e86 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
