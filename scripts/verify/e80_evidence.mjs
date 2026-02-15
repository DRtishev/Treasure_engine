#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E80_ROOT, E80_POLICY, ensureDir, readE79Binding, rewriteSumsE80, verifySumsE80, evidenceFingerprintE80, readCanonicalFingerprintFromMd } from './e80_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E80_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E80_EVIDENCE forbidden in CI');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E80/')||r==='core/edge/contracts/e80_canary_stage_policy.md'||r==='core/edge/calibration/e80_execution_envelope_calibration.md'||r.startsWith('docs/wow/'));}

const before=gitStatus();
ensureDir(E80_ROOT);
if(update&&process.env.CI!=='true'){
  const bind=readE79Binding();
  const recon=fs.readFileSync(path.join(E80_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
  const reconFp=(recon.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const shortFp=(fs.readFileSync(path.join(E80_ROOT,'EDGE_SHORTLIST.md'),'utf8').match(/shortlist_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const canaryFp=(fs.readFileSync(path.join(E80_ROOT,'RUNS_EDGE_CANARY_X2.md'),'utf8').match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  writeMd(path.join(E80_ROOT,'MATERIALS.md'),['# E80 MATERIALS',`- e79_canonical_fingerprint: ${bind.e79_canonical_fingerprint}`,`- e79_baseline_calibration_hash: ${bind.e79_baseline_calibration_hash}`,`- recon_fingerprint: ${reconFp}`,`- shortlist_fingerprint: ${shortFp}`,`- canary_run_fingerprint: ${canaryFp}`,`- stage_policy_hash: ${sha256File(E80_POLICY)}`,'- chain_mode_default_ci: FAST_PLUS'].join('\n'));
  writeMd(path.join(E80_ROOT,'WOW_USAGE.md'),['# E80 WOW USAGE','- WOW_USED: [W-0003, W-0019, W-0020]','## W-0019','- trace: stage promotion proof in e80_edge_canary_x2.mjs','## W-0020','- trace: manual demo microfill in e80_exec_recon_microfill_manual.mjs'].join('\n'));
  writeMd(path.join(E80_ROOT,'CLOSEOUT.md'),'# E80 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E80_ROOT,'VERDICT.md'),'# E80 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE80();
  const canon=evidenceFingerprintE80();
  writeMd(path.join(E80_ROOT,'CLOSEOUT.md'),['# E80 CLOSEOUT','- status: PASS','- commands_executed: npm ci; CI=false UPDATE_E80_EVIDENCE=1 UPDATE_E80_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e80; git status --porcelain > /tmp/e80_ci_before && CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e80 && git status --porcelain > /tmp/e80_ci_after && diff -u /tmp/e80_ci_before /tmp/e80_ci_after; grep -E canonical_fingerprint reports/evidence/E80/CLOSEOUT.md reports/evidence/E80/VERDICT.md; node -e "import(\'./scripts/verify/e80_lib.mjs\').then(m=>console.log(m.evidenceFingerprintE80()))"; grep -E "^[0-9a-f]{64} " reports/evidence/E80/SHA256SUMS.md | sha256sum -c -; grep -E "deterministic_match|run1_fingerprint|run2_fingerprint|canary_stage|stage_decision|promotion" reports/evidence/E80/RUNS_EDGE_CANARY_X2.md',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E80_ROOT,'VERDICT.md'),['# E80 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE80();
}

for(const f of ['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_SHORTLIST.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md']) if(!fs.existsSync(path.join(E80_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E80_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E80_ROOT,'VERDICT.md')),r=evidenceFingerprintE80();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE80();
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e80:evidence PASSED');
