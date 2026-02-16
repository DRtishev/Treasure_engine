#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E87_ROOT, ensureDir, isQuiet, minimalLog } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
const updPol=process.env.UPDATE_E87_POLICIES==='1';
const chainMode=String(process.env.CHAIN_MODE||(process.env.CI==='true'?'FAST_PLUS':'FAST_PLUS')).toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
for(const k of Object.keys(process.env)) if(process.env.CI==='true'&&/^(UPDATE_|APPLY_|APPROVE_|ENABLE_DEMO_ADAPTER|ALLOW_MANUAL_RECON|ALLOW_NETWORK)/.test(k)&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);
function run(name,cmd,env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`verify:e87 failed at ${name}`);} 
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E87/')||r==='core/edge/contracts/e87_mitigation_policy.md'||r==='core/edge/contracts/e87_disablelist_policy.md'||r==='scripts/verify/e87_edge_canary_x2.mjs'||r==='scripts/verify/e86_run.mjs'||r==='scripts/verify/e86_ordering_contract.mjs'||r==='package.json');}

const env={...process.env,CHAIN_MODE:chainMode,TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')};
const pre=['# E87 PREFLIGHT',`- pwd: ${process.cwd()}`,`- node: ${spawnSync('node',['-v'],{encoding:'utf8'}).stdout.trim()}`,`- npm: ${spawnSync('npm',['-v'],{encoding:'utf8'}).stdout.trim()}`,`- branch: ${spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim()}`,`- head: ${spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()}`,'- git_status_sb:','```',spawnSync('git',['status','-sb'],{encoding:'utf8'}).stdout.trim(),'```',`- env_CI: ${String(process.env.CI||'')}`,`- env_TZ: ${String(process.env.TZ||'')}`,`- env_LANG: ${String(process.env.LANG||'')}`,`- env_LC_ALL: ${String(process.env.LC_ALL||'')}`].join('\n');
ensureDir(E87_ROOT);if(update&&process.env.CI!=='true') writeMd(path.join(E87_ROOT,'PREFLIGHT.md'),pre);

const before=gitStatus();
if(chainMode==='FULL') run('verify:e86',['npm','run','-s','verify:e86'],{...env,CI:'true'});
else run('verify:e86:pack',['bash','-lc',"grep -E 'canonical_fingerprint' reports/evidence/E86/CLOSEOUT.md reports/evidence/E86/VERDICT.md >/dev/null && grep -E '^[0-9a-f]{64} ' reports/evidence/E86/SHA256SUMS.md | sha256sum -c - >/dev/null"],{...env,CI:'true'});
if(update) run('microfill',['node','scripts/verify/e87_microfill_cadence.mjs'],env);
run('mitigation-court',['node','scripts/verify/e87_mitigation_court.mjs'],env);
run('disablelist-court',['node','scripts/verify/e87_disablelist_court.mjs'],env);
run('apply',['node','scripts/verify/e87_apply_extension.mjs'],env);
run('apply-x2',['node','scripts/verify/e87_apply_x2.mjs'],env);
run('ordering-contract',['node','scripts/verify/e87_ordering_contract.mjs'],env);
run('perf-notes',['node','scripts/verify/e87_perf_notes.mjs'],env);
if(update&&process.env.CI!=='true') writeMd(path.join(E87_ROOT,'TIGHTENING_DIFF.md'),'# E87 TIGHTENING DIFF\n- summary: E86 polish + E87 operator cadence hardening with deterministic guards.');
run('no-secrets',['node','scripts/verify/e87_no_secrets_scan.mjs'],env);
run('evidence',['node','scripts/verify/e87_evidence.mjs'],env);
const after=gitStatus();if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
minimalLog(`verify:e87 PASSED chain_mode=${chainMode} quiet=${isQuiet()?'1':'0'}`);
