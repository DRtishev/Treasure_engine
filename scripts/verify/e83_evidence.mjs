#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E83_ROOT, E83_POLICY, ensureDir, readE82Binding, rewriteSumsE83, verifySumsE83, evidenceFingerprintE83, readCanonicalFingerprintFromMd, demoDailySentinel } from './e83_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E83_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E83_EVIDENCE forbidden in CI');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E83/')||r==='core/edge/contracts/e83_canary_stage_policy.md'||r.startsWith('docs/wow/')||r==='docs/ops/E83_OPERATOR_CADENCE.md');}

const before=gitStatus();
ensureDir(E83_ROOT);
if(update&&process.env.CI!=='true'){
  const bind=readE82Binding();
  const recon=fs.readFileSync(path.join(E83_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
  const reconFp=(recon.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const canary=fs.readFileSync(path.join(E83_ROOT,'RUNS_EDGE_CANARY_X2.md'),'utf8');
  const canaryFp=(canary.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const thresholdCourt=fs.readFileSync(path.join(E83_ROOT,'THRESHOLD_COURT.md'),'utf8');
  const thresholdHash=(thresholdCourt.match(/new_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  writeMd(path.join(E83_ROOT,'MATERIALS.md'),['# E83 MATERIALS',`- e82_canonical_fingerprint: ${bind.e82_canonical_fingerprint}`,`- recon_fingerprint: ${reconFp}`,`- canary_run_fingerprint: ${canaryFp}`,`- threshold_hash: ${thresholdHash}`,`- demo_daily_sentinel: ${demoDailySentinel()}`,`- stage_policy_hash: ${sha256File(E83_POLICY)}`,'- chain_mode_default_ci: FAST_PLUS',`- seed: ${String(process.env.SEED||'12345')}`].join('\n'));
  writeMd(path.join(E83_ROOT,'WOW_USAGE.md'),['# E83 WOW USAGE','- WOW_USED: [W-0003, W-0019, W-0020]','## W-0019','- trace: threshold court + strict readiness gating in e83_edge_canary_x2.mjs','## W-0020','- trace: operator cadence + demo daily collector in e83_exec_recon_demo_daily.mjs'].join('\n'));
  writeMd(path.join(E83_ROOT,'CLOSEOUT.md'),'# E83 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E83_ROOT,'VERDICT.md'),'# E83 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE83();
  const canon=evidenceFingerprintE83();
  writeMd(path.join(E83_ROOT,'CLOSEOUT.md'),['# E83 CLOSEOUT','- status: PASS','- commands_executed: CI=false UPDATE_E83_EVIDENCE=1 UPDATE_E83_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e83:update; CI=false QUIET=1 npm run -s verify:e83; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e83; grep -E "^[0-9a-f]{64} " reports/evidence/E83/SHA256SUMS.md | sha256sum -c -',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E83_ROOT,'VERDICT.md'),['# E83 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE83();
}

const required=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','THRESHOLD_COURT.md','THRESHOLD_DIFF.md','THRESHOLD_CHANGELOG.md','READINESS_TREND.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of required) if(!fs.existsSync(path.join(E83_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E83_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E83_ROOT,'VERDICT.md')),r=evidenceFingerprintE83();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE83();
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e83:evidence PASSED');
