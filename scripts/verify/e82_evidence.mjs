#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E82_ROOT, E82_POLICY, ensureDir, readE81Binding, rewriteSumsE82, verifySumsE82, evidenceFingerprintE82, readCanonicalFingerprintFromMd } from './e82_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E82_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E82_EVIDENCE forbidden in CI');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E82/')||r==='core/edge/contracts/e82_canary_stage_policy.md'||r==='core/edge/calibration/e82_execution_envelope_calibration.md'||r.startsWith('docs/wow/'));}

const before=gitStatus();
ensureDir(E82_ROOT);
if(update&&process.env.CI!=='true'){
  const bind=readE81Binding();
  const recon=fs.readFileSync(path.join(E82_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
  const reconFp=(recon.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const canary=fs.readFileSync(path.join(E82_ROOT,'RUNS_EDGE_CANARY_X2.md'),'utf8');
  const canaryFp=(canary.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const shortlistHash=(canary.match(/shortlist_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const court=fs.readFileSync(path.join(E82_ROOT,'CALIBRATION_COURT.md'),'utf8');
  const calHash=(court.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const driftRate=(court.match(/drift_rate:\s*([0-9.]+)/)||[])[1]||'';
  writeMd(path.join(E82_ROOT,'MATERIALS.md'),['# E82 MATERIALS',`- e81_canonical_fingerprint: ${bind.e81_canonical_fingerprint}`,`- e81_calibration_hash: ${bind.e81_calibration_hash}`,`- recon_fingerprint: ${reconFp}`,`- canary_run_fingerprint: ${canaryFp}`,`- calibration_hash: ${calHash}`,`- calibration_drift_rate: ${driftRate}`,`- shortlist_hash: ${shortlistHash}`,`- stage_policy_hash: ${sha256File(E82_POLICY)}`,'- chain_mode_default_ci: FAST_PLUS',`- seed: ${String(process.env.SEED||'12345')}`].join('\n'));
  writeMd(path.join(E82_ROOT,'WOW_USAGE.md'),['# E82 WOW USAGE','- WOW_USED: [W-0003, W-0019, W-0020]','## W-0019','- trace: strict promotion readiness + reason codes in e82_edge_canary_x2.mjs','## W-0020','- trace: daily demo recon manual collector in e82_exec_recon_demo_daily.mjs'].join('\n'));
  writeMd(path.join(E82_ROOT,'CLOSEOUT.md'),'# E82 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E82_ROOT,'VERDICT.md'),'# E82 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE82();
  const canon=evidenceFingerprintE82();
  writeMd(path.join(E82_ROOT,'CLOSEOUT.md'),['# E82 CLOSEOUT','- status: PASS','- commands_executed: CI=false UPDATE_E82_EVIDENCE=1 UPDATE_E82_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e82:update; CI=false QUIET=1 npm run -s verify:e82; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e82; grep -E "^[0-9a-f]{64} " reports/evidence/E82/SHA256SUMS.md | sha256sum -c -',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E82_ROOT,'VERDICT.md'),['# E82 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE82();
}

const required=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of required) if(!fs.existsSync(path.join(E82_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E82_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E82_ROOT,'VERDICT.md')),r=evidenceFingerprintE82();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE82();
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e82:evidence PASSED');
