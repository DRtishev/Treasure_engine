#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const update=process.env.UPDATE_E78_EVIDENCE==='1';
const quiet=String(process.env.QUIET||'0')==='1';
const chainMode=String(process.env.CHAIN_MODE || (process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if(process.env.CI==='true'&&(update||process.env.UPDATE_E78_CALIBRATION==='1')) throw new Error('UPDATE_E78 flags forbidden in CI');
for(const k of Object.keys(process.env)) if((k.startsWith('UPDATE_')||k.startsWith('APPROVE_'))&&process.env.CI==='true'&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);

function run(name,cmd,env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`verify:e78 failed at ${name}`);}
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E78/')||r==='core/edge/calibration/e78_execution_envelope_calibration.md'||r==='core/edge/contracts/e78_canary_thresholds.md'||r.startsWith('docs/wow/'));}
function scrub(env){const c={...env};for(const k of Object.keys(c)) if(k.startsWith('UPDATE_')||k.startsWith('APPROVE_')) delete c[k]; return c;}

const env={...process.env,CHAIN_MODE:chainMode,CANARY_STAGE:String(process.env.CANARY_STAGE||'BASELINE').toUpperCase(),TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const ciEnv={...scrub(env),CI:'true'};
const before=gitStatus();

if(chainMode==='FULL') run('verify:e77',['npm','run','-s','verify:e77'],ciEnv);
else if(chainMode==='FAST_PLUS'){for(const s of ['E66','E67','E68','E69','E70','E71','E72','E73','E74','E75','E76','E77']) run(`verify:${s}:pack-static`,['bash','-lc',`grep -E 'canonical_fingerprint' reports/evidence/${s}/CLOSEOUT.md reports/evidence/${s}/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/${s}/SHA256SUMS.md | sha256sum -c - >/dev/null`],ciEnv);}
else {for(const s of ['E77']) run(`verify:${s}:pack-static`,['bash','-lc',`grep -E 'canonical_fingerprint' reports/evidence/${s}/CLOSEOUT.md reports/evidence/${s}/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/${s}/SHA256SUMS.md | sha256sum -c - >/dev/null`],ciEnv);}

run('verify:wow',['npm','run','-s','verify:wow'],env);
run('verify:wow:usage',['npm','run','-s','verify:wow:usage'],{...env,WOW_USED:'W-0003,W-0015,W-0016'});
run('recon-ingest',['node','core/edge/e78_recon_coverage.mjs'],env);
run('verify:e78:calibration:court',['node','scripts/verify/e78_calibration_court.mjs'],env);
run('verify:edge:profit:search:x2',['node','scripts/verify/e78_edge_profit_search_x2.mjs'],env);
run('verify:edge:canary:x2:e78',['node','scripts/verify/e78_edge_canary_x2.mjs'],env);
run('verify:e78:evidence',['node','scripts/verify/e78_evidence.mjs'],env);

const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
if(!quiet) console.log(`verify:e78 PASSED chain_mode=${chainMode}`); else console.log(`verify:e78 PASSED`);
