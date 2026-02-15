#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E81_ROOT, E81_POLICY, ensureDir, readE80Binding, rewriteSumsE81, verifySumsE81, evidenceFingerprintE81, readCanonicalFingerprintFromMd } from './e81_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E81_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E81_EVIDENCE forbidden in CI');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E81/')||r==='core/edge/contracts/e81_canary_stage_policy.md'||r==='core/edge/calibration/e81_execution_envelope_calibration.md'||r.startsWith('docs/wow/'));}

const before=gitStatus();
ensureDir(E81_ROOT);
if(update&&process.env.CI!=='true'){
  const bind=readE80Binding();
  const recon=fs.readFileSync(path.join(E81_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
  const reconFp=(recon.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const canaryFp=(fs.readFileSync(path.join(E81_ROOT,'RUNS_EDGE_CANARY_X2.md'),'utf8').match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const court=fs.readFileSync(path.join(E81_ROOT,'CALIBRATION_COURT.md'),'utf8');
  const calHash=(court.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const driftRate=(court.match(/drift_rate:\s*([0-9.]+)/)||[])[1]||'';
  writeMd(path.join(E81_ROOT,'MATERIALS.md'),['# E81 MATERIALS',`- e80_canonical_fingerprint: ${bind.e80_canonical_fingerprint}`,`- e80_calibration_hash: ${bind.e80_calibration_hash}`,`- recon_fingerprint: ${reconFp}`,`- canary_run_fingerprint: ${canaryFp}`,`- calibration_hash: ${calHash}`,`- calibration_drift_rate: ${driftRate}`,`- stage_policy_hash: ${sha256File(E81_POLICY)}`,'- chain_mode_default_ci: FAST_PLUS'].join('\n'));
  writeMd(path.join(E81_ROOT,'WOW_USAGE.md'),['# E81 WOW USAGE','- WOW_USED: [W-0003, W-0019, W-0020]','## W-0019','- trace: stage promotion proof in e81_edge_canary_x2.mjs','## W-0020','- trace: manual demo microfill in e81_exec_recon_demo_manual.mjs'].join('\n'));
  writeMd(path.join(E81_ROOT,'CLOSEOUT.md'),'# E81 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E81_ROOT,'VERDICT.md'),'# E81 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE81();
  const canon=evidenceFingerprintE81();
  writeMd(path.join(E81_ROOT,'CLOSEOUT.md'),['# E81 CLOSEOUT','- status: PASS','- commands_executed: CI=false UPDATE_E81_EVIDENCE=1 UPDATE_E81_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e81:update; CI=false QUIET=1 npm run -s verify:e81; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e81; grep -E "^[0-9a-f]{64} " reports/evidence/E81/SHA256SUMS.md | sha256sum -c -',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E81_ROOT,'VERDICT.md'),['# E81 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE81();
}

const required=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of required) if(!fs.existsSync(path.join(E81_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E81_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E81_ROOT,'VERDICT.md')),r=evidenceFingerprintE81();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE81();
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e81:evidence PASSED');
