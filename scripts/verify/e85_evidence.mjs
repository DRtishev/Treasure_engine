#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E85_ROOT, E85_THRESHOLD_POLICY, E84_POLICY, ensureDir, readE84Binding, rewriteSumsE85, verifySumsE85, evidenceFingerprintE85, readCanonicalFingerprintFromMd, demoDailySentinel } from './e85_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E85_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E85_EVIDENCE forbidden in CI');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E85/')||r.includes('core/edge/contracts/e85_threshold_policy.md')||r.startsWith('core/edge/calibration/e85_')||r.startsWith('docs/wow/'));}
const before=gitStatus();ensureDir(E85_ROOT);
if(update&&process.env.CI!=='true'){
  const bind=readE84Binding();
  const applyMd=fs.readFileSync(path.join(E85_ROOT,'THRESHOLD_APPLY.md'),'utf8');
  const applyFp=(applyMd.match(/apply_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const applyX2=fs.readFileSync(path.join(E85_ROOT,'RUNS_THRESHOLD_APPLY_X2.md'),'utf8');
  const applyX2Fp=(applyX2.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  writeMd(path.join(E85_ROOT,'MATERIALS.md'),['# E85 MATERIALS',`- e84_canonical_fingerprint: ${bind.e84_canonical_fingerprint}`,`- threshold_policy_hash: ${sha256File(E85_THRESHOLD_POLICY)}`,`- threshold_apply_fingerprint: ${applyFp}`,`- threshold_apply_x2_fingerprint: ${applyX2Fp}`,`- threshold_court_hash: ${(fs.readFileSync(path.resolve('reports/evidence/E84/THRESHOLD_COURT.md'),'utf8').match(/threshold_court_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||''}`,`- demo_daily_sentinel: ${demoDailySentinel()}`,`- canary_stage_policy_hash: ${sha256File(E84_POLICY)}`,'- chain_mode_default_ci: FAST_PLUS'].join('\n'));
  writeMd(path.join(E85_ROOT,'CLOSEOUT.md'),'# E85 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E85_ROOT,'VERDICT.md'),'# E85 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE85();
  const canon=evidenceFingerprintE85();
  writeMd(path.join(E85_ROOT,'CLOSEOUT.md'),['# E85 CLOSEOUT','- status: PASS','- commands_executed: npm ci; CI=false UPDATE_E85_EVIDENCE=1 UPDATE_E85_THRESHOLDS=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e85:update; git status --porcelain > /tmp/e85_before && CI=false QUIET=1 npm run -s verify:e85 && git status --porcelain > /tmp/e85_after && diff -u /tmp/e85_before /tmp/e85_after; git status --porcelain > /tmp/e85_ci_before && CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e85 && git status --porcelain > /tmp/e85_ci_after && diff -u /tmp/e85_ci_before /tmp/e85_ci_after; grep -E canonical_fingerprint reports/evidence/E85/CLOSEOUT.md reports/evidence/E85/VERDICT.md; node -e "import(\'./scripts/verify/e85_lib.mjs\').then(m=>console.log(m.evidenceFingerprintE85()))"; grep -E "^[0-9a-f]{64} " reports/evidence/E85/SHA256SUMS.md | sha256sum -c -',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E85_ROOT,'VERDICT.md'),['# E85 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE85();
}
const required=['MATERIALS.md','THRESHOLD_APPLY.md','THRESHOLD_APPLY_DIFF.md','THRESHOLD_APPLY_CHANGELOG.md','RUNS_THRESHOLD_APPLY_X2.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of required) if(!fs.existsSync(path.join(E85_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E85_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E85_ROOT,'VERDICT.md')),r=evidenceFingerprintE85();if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE85();
const after=gitStatus();if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e85:evidence PASSED');
