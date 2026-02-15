#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const update=process.env.UPDATE_E71_EVIDENCE==='1';
const chainMode=String(process.env.CHAIN_MODE||'FAST_PLUS').toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)){ console.error('verify:e71 FAILED\n- CHAIN_MODE must be FULL|FAST_PLUS|FAST'); process.exit(1); }
if(process.env.CI==='true'&&update){ console.error('verify:e71 FAILED\n- UPDATE_E71_EVIDENCE=1 forbidden when CI=true'); process.exit(1); }
for(const k of Object.keys(process.env)){ if((k.startsWith('UPDATE_')||k.startsWith('APPROVE_'))&&process.env.CI==='true'&&String(process.env[k]||'').trim()!==''){ console.error(`verify:e71 FAILED\n- ${k} forbidden when CI=true`); process.exit(1);} }

function gitStatus(){ return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim(); }
function parseMap(t){ const m=new Map(); for(const r of t.split('\n').map((x)=>x.trim()).filter(Boolean)) m.set(r.slice(3).trim(),r.slice(0,2)); return m; }
function driftOnlyAllowed(before,after){ const b=parseMap(before),a=parseMap(after),c=[]; for(const [r,s] of a.entries()) if(!b.has(r)||b.get(r)!==s)c.push(r); for(const r of b.keys()) if(!a.has(r)) c.push(r); return c.every((r)=>r.startsWith('reports/evidence/E71/')||r.startsWith('docs/wow/')||r.startsWith('core/edge/fixtures/')); }
function scrub(env){const c={...env}; for(const k of Object.keys(c)) if(k.startsWith('UPDATE_')||k.startsWith('APPROVE_')) delete c[k]; return c;}
function runStep(name,cmd,env){ const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env}); if((r.status??1)!==0){ console.error(`verify:e71 FAILED at ${name}`); process.exit(1);} }

const env={...process.env,CHAIN_MODE:chainMode,TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const ciEnv={...scrub(env),CI:'true'};
const before=gitStatus();
if(chainMode==='FULL'){
  for(const s of ['verify:e66','verify:phoenix:x2','verify:evidence','verify:e67','verify:e68','verify:e69','verify:e70']) runStep(s,['npm','run','-s',s],ciEnv);
}
runStep('verify:wow',['npm','run','-s','verify:wow'],env);
runStep('verify:edge:meta:x2',['npm','run','-s','verify:edge:meta:x2'],env);
runStep('verify:e71:evidence',['npm','run','-s','verify:e71:evidence'],env);
const after=gitStatus();
if(before!==after){ if(process.env.CI==='true'){ console.error('verify:e71 FAILED\n- CI_READ_ONLY_VIOLATION'); process.exit(1);} if(!update){ console.error('verify:e71 FAILED\n- READ_ONLY_VIOLATION'); process.exit(1);} if(!driftOnlyAllowed(before,after)){ console.error('verify:e71 FAILED\n- UPDATE_SCOPE_VIOLATION'); process.exit(1);} }
console.log(`verify:e71 PASSED chain_mode=${chainMode}`);
