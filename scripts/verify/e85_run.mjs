#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { isQuiet, minimalLog } from './e85_lib.mjs';

const update=process.env.UPDATE_E85_EVIDENCE==='1';
const apply=process.env.UPDATE_E85_THRESHOLDS==='1';
const chainMode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if(process.env.CI==='true'&&(update||apply)) throw new Error('UPDATE_E85 flags forbidden in CI');
for(const k of Object.keys(process.env)) if(process.env.CI==='true'&&/^(UPDATE_|APPLY_|APPROVE_|ALLOW_MANUAL_|ENABLE_DEMO_)/.test(k)&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);
function run(name,cmd,env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`verify:e85 failed at ${name}`);}
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E85/')||r.includes('core/edge/contracts/e85_threshold_policy.md')||r.startsWith('core/edge/calibration/e85_')||r.startsWith('docs/wow/'));}
const env={...process.env,CHAIN_MODE:chainMode,TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const before=gitStatus();
if(chainMode==='FULL') run('verify:e84',['npm','run','-s','verify:e84'],{...env,CI:'true'});
else run('verify:e84:pack',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E84/CLOSEOUT.md reports/evidence/E84/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E84/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});
run('verify:wow',['npm','run','-s','verify:wow'],env);
run('verify:wow:usage',['npm','run','-s','verify:wow:usage'],{...env,WOW_USED:'W-0003,W-0019,W-0020'});
run('threshold-apply',['node','scripts/verify/e85_threshold_apply.mjs'],env);
run('threshold-apply-x2',['node','scripts/verify/e85_threshold_apply_x2.mjs'],env);
run('e84-canary-x2-verify',['node','scripts/verify/e84_edge_canary_x2.mjs'],env);
run('e84-canary-x2-verify-2',['node','scripts/verify/e84_edge_canary_x2.mjs'],env);
run('evidence',['node','scripts/verify/e85_evidence.mjs'],env);
const after=gitStatus();if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
minimalLog(`verify:e85 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
