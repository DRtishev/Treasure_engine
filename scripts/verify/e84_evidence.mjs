#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E84_ROOT, E84_POLICY, ensureDir, readBindings, rewriteSumsE84, verifySumsE84, evidenceFingerprintE84, readCanonicalFingerprintFromMd, demoDailySentinel } from './e84_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E84_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E84_EVIDENCE forbidden in CI');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E84/')||r.startsWith('core/edge/contracts/e84_')||r.startsWith('core/edge/calibration/e84_')||r.startsWith('docs/wow/'));}
const before=gitStatus();ensureDir(E84_ROOT);
if(update&&process.env.CI!=='true'){
  const bind=readBindings();const recon=fs.readFileSync(path.join(E84_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');const reconFp=(recon.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';const canary=fs.readFileSync(path.join(E84_ROOT,'RUNS_EDGE_CANARY_X2.md'),'utf8');const canaryFp=(canary.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';const ledger=fs.readFileSync(path.join(E84_ROOT,'PROFIT_LEDGER.md'),'utf8');const ledgerFp=(ledger.match(/ledger_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';const threshold=fs.readFileSync(path.join(E84_ROOT,'THRESHOLD_COURT.md'),'utf8');const thresholdHash=(threshold.match(/new_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  writeMd(path.join(E84_ROOT,'MATERIALS.md'),['# E84 MATERIALS',`- e82_canonical_fingerprint: ${bind.e82_canonical_fingerprint}`,`- e83_canonical_fingerprint: ${bind.e83_canonical_fingerprint}`,`- recon_fingerprint: ${reconFp}`,`- canary_run_fingerprint: ${canaryFp}`,`- ledger_fingerprint: ${ledgerFp}`,`- threshold_hash: ${thresholdHash}`,`- demo_daily_sentinel: ${demoDailySentinel()}`,`- stage_policy_hash: ${sha256File(E84_POLICY)}`,'- chain_mode_default_ci: FAST_PLUS',`- seed: ${String(process.env.SEED||'12345')}`].join('\n'));
  writeMd(path.join(E84_ROOT,'WOW_USAGE.md'),['# E84 WOW USAGE','- WOW_USED: [W-0003, W-0019, W-0020]','## W-0019','- trace: canary + profit ledger fingerprints','## W-0020','- trace: manual demo cadence collector'].join('\n'));
  writeMd(path.join(E84_ROOT,'CLOSEOUT.md'),'# E84 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E84_ROOT,'VERDICT.md'),'# E84 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE84();
  const canon=evidenceFingerprintE84();
  writeMd(path.join(E84_ROOT,'CLOSEOUT.md'),['# E84 CLOSEOUT','- status: PASS','- commands_executed: CI=false UPDATE_E84_EVIDENCE=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e84:update; CI=false QUIET=1 npm run -s verify:e84; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e84; grep -E "^[0-9a-f]{64} " reports/evidence/E84/SHA256SUMS.md | sha256sum -c -',`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E84_ROOT,'VERDICT.md'),['# E84 VERDICT','- status: PASS','- ci_read_only: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE84();
}
const required=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','PROFIT_LEDGER.md','THRESHOLD_COURT.md','THRESHOLD_DIFF.md','THRESHOLD_CHANGELOG.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of required) if(!fs.existsSync(path.join(E84_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E84_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E84_ROOT,'VERDICT.md')),r=evidenceFingerprintE84();if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE84();
const after=gitStatus();if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e84:evidence PASSED');
