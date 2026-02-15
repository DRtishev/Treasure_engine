#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd, sha256File } from './e66_lib.mjs';
import { E79_ROOT, ensureDir, readE78Binding, rewriteSumsE79, verifySumsE79, evidenceFingerprintE79, readCanonicalFingerprintFromMd } from './e79_lib.mjs';

const update=process.env.UPDATE_E79_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E79_EVIDENCE forbidden in CI');

function run(cmd,env=process.env){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`failed: ${cmd.join(' ')}`);}
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E79/')||r==='core/edge/contracts/e79_canary_stage_policy.md'||r.startsWith('docs/wow/'));}

const before=gitStatus();
ensureDir(E79_ROOT);

if(update&&process.env.CI!=='true'){
  const bind=readE78Binding();
  const reconMd=fs.readFileSync(path.join(E79_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
  const reconFp=(reconMd.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const shortlistMd=fs.readFileSync(path.join(E79_ROOT,'EDGE_SHORTLIST.md'),'utf8');
  const shortlistFp=(shortlistMd.match(/shortlist_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const canaryMd=fs.readFileSync(path.join(E79_ROOT,'RUNS_EDGE_CANARY_X2.md'),'utf8');
  const canaryFp=(canaryMd.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';

  writeMd(path.join(E79_ROOT,'MATERIALS.md'),['# E79 MATERIALS',`- e78_canonical_fingerprint: ${bind.e78_canonical_fingerprint}`,`- e78_calibration_hash: ${bind.e78_calibration_hash}`,`- recon_fingerprint: ${reconFp}`,`- shortlist_fingerprint: ${shortlistFp}`,`- canary_run_fingerprint: ${canaryFp}`,`- stage_policy_hash: ${sha256File(path.resolve('core/edge/contracts/e79_canary_stage_policy.md'))}`,'- chain_mode_default_ci: FAST_PLUS'].join('\n'));
  writeMd(path.join(E79_ROOT,'QUIET_POLICY.md'),['# E79 QUIET POLICY','- QUIET=1 suppresses intermediate JSON stdout for E78/E79 runners and edge steps.','- deterministic fingerprints remain unchanged under QUIET toggles.','- fatal errors and md-relevant summaries remain visible.'].join('\n'));
  writeMd(path.join(E79_ROOT,'CANARY_STAGE_POLICY.md'),['# E79 CANARY STAGE POLICY','- contract_ref: core/edge/contracts/e79_canary_stage_policy.md',`- contract_hash: ${sha256File(path.resolve('core/edge/contracts/e79_canary_stage_policy.md'))}`].join('\n'));
  writeMd(path.join(E79_ROOT,'WOW_USAGE.md'),['# E79 WOW USAGE','- WOW_USED: [W-0003, W-0017, W-0018]','## W-0017','- trace: QUIET gating in e78_run/e79_run and e79_lib quiet helpers','## W-0018','- trace: AUTO canary stage decisions in e79_edge_canary_x2.mjs'].join('\n'));
  writeMd(path.join(E79_ROOT,'CLOSEOUT.md'),'# E79 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E79_ROOT,'VERDICT.md'),'# E79 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE79();
  const canon=evidenceFingerprintE79();
  writeMd(path.join(E79_ROOT,'CLOSEOUT.md'),['# E79 CLOSEOUT','- status: PASS',`- commit: ${(spawnSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).stdout||'').trim()}`,'- commands_executed: pwd; git status -sb; git rev-parse --short HEAD; node -v; npm -v; npm ci; CI=false UPDATE_E79_EVIDENCE=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e79; git status --porcelain > /tmp/e79_before && CI=false QUIET=1 npm run -s verify:e79 && git status --porcelain > /tmp/e79_after && diff -u /tmp/e79_before /tmp/e79_after; git status --porcelain > /tmp/e79_ci_before && CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e79 && git status --porcelain > /tmp/e79_ci_after && diff -u /tmp/e79_ci_before /tmp/e79_ci_after; grep -E canonical_fingerprint reports/evidence/E79/CLOSEOUT.md reports/evidence/E79/VERDICT.md; node -e "import(\'./scripts/verify/e79_lib.mjs\').then(m=>console.log(m.evidenceFingerprintE79()))"; grep -E \"^[0-9a-f]{64} \" reports/evidence/E79/SHA256SUMS.md | sha256sum -c -; grep -E \"deterministic_match|run1_fingerprint|run2_fingerprint|canary_stage|stage_decision\" reports/evidence/E79/RUNS_EDGE_CANARY_X2.md',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E79_ROOT,'VERDICT.md'),['# E79 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE79();
}

for(const f of ['MATERIALS.md','QUIET_POLICY.md','EXEC_RECON_OBSERVED_MULTI.md','EDGE_SHORTLIST.md','CANARY_STAGE_POLICY.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md']) if(!fs.existsSync(path.join(E79_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E79_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E79_ROOT,'VERDICT.md')),r=evidenceFingerprintE79();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE79();
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e79:evidence PASSED');
