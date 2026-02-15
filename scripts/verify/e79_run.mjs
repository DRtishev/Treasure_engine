#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { isQuiet, minimalLog } from './e79_lib.mjs';

const update=process.env.UPDATE_E79_EVIDENCE==='1';
const chainMode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E79_EVIDENCE forbidden in CI');
for(const k of Object.keys(process.env)) if(process.env.CI==='true'&&/^(UPDATE_|APPROVE_|ALLOW_MANUAL_|ENABLE_DEMO_)/.test(k)&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);

function run(name,cmd,env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`verify:e79 failed at ${name}`);}
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E79/')||r==='core/edge/contracts/e79_canary_stage_policy.md'||r.startsWith('docs/wow/'));}

const env={...process.env,CHAIN_MODE:chainMode,CANARY_STAGE:String(process.env.CANARY_STAGE||(process.env.CI==='true'?'AUTO':'AUTO')).toUpperCase(),TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const before=gitStatus();

if(chainMode==='FULL') run('verify:e78',['npm','run','-s','verify:e78'],{...env,CI:'true'});
else if(chainMode==='FAST_PLUS') run('verify:e78:pack',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E78/CLOSEOUT.md reports/evidence/E78/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E78/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});
else run('verify:e78:last',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E78/CLOSEOUT.md reports/evidence/E78/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E78/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});

run('verify:wow',['npm','run','-s','verify:wow'],env);
run('verify:wow:usage',['npm','run','-s','verify:wow:usage'],{...env,WOW_USED:'W-0003,W-0017,W-0018'});
run('recon',['node','scripts/verify/e79_recon_observed_multi.mjs'],env);
run('shortlist',['node','scripts/verify/e79_edge_shortlist.mjs'],env);
run('canary-x2',['node','scripts/verify/e79_edge_canary_x2.mjs'],env);
run('evidence',['node','scripts/verify/e79_evidence.mjs'],env);

const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
minimalLog(`verify:e79 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
