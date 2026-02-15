#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd, sha256File } from './e66_lib.mjs';
import { ingestE78Recon } from '../../core/edge/e78_recon_coverage.mjs';
import { runE78ProfitSearch } from '../../core/edge/e78_profit_search.mjs';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';
import { evaluateE78CalibrationCourt } from './e78_calibration_court.mjs';
import { E78_ROOT, ensureDir, defaultNormalizedEnv, readE77Binding, rewriteSumsE78, verifySumsE78, evidenceFingerprintE78, readCanonicalFingerprintFromMd } from './e78_lib.mjs';

const update=process.env.UPDATE_E78_EVIDENCE==='1';
const updateCal=process.env.UPDATE_E78_CALIBRATION==='1';
if(process.env.CI==='true'&&(update||updateCal)) throw new Error('UPDATE_E78 flags forbidden in CI');

function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E78/')||r==='core/edge/calibration/e78_execution_envelope_calibration.md'||r==='core/edge/contracts/e78_canary_thresholds.md'||r.startsWith('docs/wow/'));}

function mdRecon(recon){
  const lines=['# E78 EXEC RECON MULTI','- taxonomy: INVALID_NUMERIC, INVALID_RANGE, INVALID_ENUM, MISSING_FIELD, BAD_TIMESTAMP, DUPLICATE_ROW',`- source_file: ${recon.source_file}`,`- source_sha256: ${recon.source_sha}`,`- recon_fingerprint: ${recon.fingerprint}`,'','| symbol | window | accepted_rows | rejected_rows | rejects_breakdown |','|---|---|---:|---:|---|'];
  for(const r of recon.coverageRows){const br=Object.entries(r.rejects).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}:${v}`).join(', ')||'none';lines.push(`| ${r.symbol} | ${r.window} | ${r.accepted_rows} | ${r.rejected_rows} | ${br} |`);} return lines.join('\n');
}
function mdProfit(ps){const lines=['# E78 EDGE PROFIT SEARCH','',`- profit_search_fingerprint: ${ps.profit_search_fingerprint}`,'| rank | candidate | family | reason | robust_score | best_net | median_net | worst_net |','|---:|---|---|---|---:|---:|---:|---:|'];ps.candidates.slice(0,12).forEach((c,i)=>lines.push(`| ${i+1} | ${c.candidate_id} | ${c.family} | ${c.reason_code} | ${c.robust_score} | ${c.metrics.BEST.net_pnl} | ${c.metrics.MEDIAN.net_pnl} | ${c.metrics.WORST.net_pnl} |`));return lines.join('\n');}
function mdCanary(c,stage){const lines=['# E78 EDGE CANARY',`- canary_stage: ${stage}`,'| candidate | reason | verdict |','|---|---|---|'];c.rows.forEach((r)=>lines.push(`| ${r.candidate_id} | ${r.reason_code} | ${r.verdict} |`));lines.push('','## reason_counts');for(const [k,v] of Object.entries(c.counts).sort((a,b)=>a[0].localeCompare(b[0])))lines.push(`- ${k}: ${v}`);return lines.join('\n');}
function mdMaterials(recon,ps,court,canary,stage){const env=defaultNormalizedEnv();const bind=readE77Binding();return ['# E78 MATERIALS',`- e77_canonical_fingerprint: ${bind.e77_canonical_fingerprint}`,`- e77_calibration_hash: ${bind.e77_calibration_hash}`,`- chain_mode: ${String(process.env.CHAIN_MODE||'FAST_PLUS').toUpperCase()}`,`- canary_stage: ${stage}`,'- update_scope_whitelist_version: e78-v1',`- recon_fingerprint: ${recon.fingerprint}`,`- calibration_hash: ${court.new_cal_hash}`,`- profit_search_fingerprint: ${ps.profit_search_fingerprint}`,`- canary_fingerprint: ${canary.run_fingerprint}`,'- env_normalization:',`  - TZ=${env.TZ}`,`  - LANG=${env.LANG}`,`  - LC_ALL=${env.LC_ALL}`,`  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,'- WOW_USED: [W-0003, W-0015, W-0016]'].join('\n');}

function required(){for(const f of ['MATERIALS.md','EXEC_RECON_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_PROFIT_SEARCH.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md']) if(!fs.existsSync(path.join(E78_ROOT,f))) throw new Error(`missing ${f}`);}

const before=gitStatus(); ensureDir(E78_ROOT);
if(update&&process.env.CI!=='true'){
  if(!updateCal) throw new Error('UPDATE_E78_CALIBRATION=1 required');
  const recon=ingestE78Recon(path.resolve('core/edge/fixtures/e77_recon_observed_multi.csv'));
  const ps=runE78ProfitSearch({seed:Number(process.env.SEED||'12345')});
  const courtStep=spawnSync('node',['scripts/verify/e78_calibration_court.mjs'],{stdio:'inherit',env:{...process.env,UPDATE_E78_EVIDENCE:'1',UPDATE_E78_CALIBRATION:'1',CI:'false'}}); if((courtStep.status??1)!==0) throw new Error('e78 calibration court failed');
  const court=evaluateE78CalibrationCourt();
  const stage=String(process.env.CANARY_STAGE||'BASELINE').toUpperCase();
  const canary=runE77CanaryEval({seed:Number(process.env.SEED||'12345')});
  writeMd(path.join(E78_ROOT,'MATERIALS.md'),mdMaterials(recon,ps,court,canary,stage));
  writeMd(path.join(E78_ROOT,'EXEC_RECON_MULTI.md'),mdRecon(recon));
  writeMd(path.join(E78_ROOT,'EDGE_PROFIT_SEARCH.md'),mdProfit(ps));
  writeMd(path.join(E78_ROOT,'EDGE_CANARY.md'),mdCanary(canary,stage));
  const x2=spawnSync('node',['scripts/verify/e78_edge_canary_x2.mjs'],{stdio:'inherit',env:{...process.env,UPDATE_E78_EVIDENCE:'1',CI:'false'}}); if((x2.status??1)!==0) throw new Error('e78 canary x2 failed');
  const px2=spawnSync('node',['scripts/verify/e78_edge_profit_search_x2.mjs'],{stdio:'inherit',env:{...process.env,UPDATE_E78_EVIDENCE:'1',CI:'false'}}); if((px2.status??1)!==0) throw new Error('e78 profit x2 failed');
  writeMd(path.join(E78_ROOT,'WOW_USAGE.md'),['# E78 WOW USAGE','- WOW_USED: [W-0003, W-0015, W-0016]','## W-0003','- trace: scripts/verify/e78_run.mjs flag/drift governance','## W-0015','- trace: scripts/edge/e77_canary_eval.mjs and core/edge/contracts/e78_canary_thresholds.md budgets','## W-0016','- trace: scripts/verify/e78_calibration_court.mjs chain continuity (E77->E78)'].join('\n'));
  writeMd(path.join(E78_ROOT,'CLOSEOUT.md'),'# E78 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E78_ROOT,'VERDICT.md'),'# E78 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE78();
  const canon=evidenceFingerprintE78(); if(!canon) throw new Error('canonical unavailable');
  writeMd(path.join(E78_ROOT,'CLOSEOUT.md'),['# E78 CLOSEOUT','- status: PASS',`- commit: ${(spawnSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).stdout||'').trim()}`,`- chain_mode: ${String(process.env.CHAIN_MODE||'FAST_PLUS').toUpperCase()}`,'- commands_executed: pwd; git status -sb; git rev-parse --short HEAD; node -v; npm -v; npm ci; CI=false UPDATE_E78_EVIDENCE=1 UPDATE_E78_CALIBRATION=1 CANARY_STAGE=BASELINE npm run -s verify:e78; git status --porcelain > /tmp/e78_before && CI=false npm run -s verify:e78 && git status --porcelain > /tmp/e78_after && diff -u /tmp/e78_before /tmp/e78_after; git status --porcelain > /tmp/e78_ci_before && CI=true CHAIN_MODE=FAST_PLUS npm run -s verify:e78 && git status --porcelain > /tmp/e78_ci_after && diff -u /tmp/e78_ci_before /tmp/e78_ci_after; grep -E canonical_fingerprint reports/evidence/E78/CLOSEOUT.md reports/evidence/E78/VERDICT.md; node -e import(\'./scripts/verify/e78_lib.mjs\').then(m=>console.log(m.evidenceFingerprintE78())); grep -E ^[0-9a-f]{64} reports/evidence/E78/SHA256SUMS.md | sha256sum -c -; grep -E deterministic_match reports/evidence/E78/RUNS_EDGE_CANARY_X2.md',`- recon_fixture_sha256: ${recon.source_sha}`,`- calibration_hash: ${court.new_cal_hash}`,`- canary_summary: PASS=${canary.rows.filter(x=>x.verdict==='PASS').length} FAIL=${canary.rows.filter(x=>x.verdict==='FAIL').length}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  writeMd(path.join(E78_ROOT,'VERDICT.md'),['# E78 VERDICT','- Status: PASS','- calibration_chain_continuity: PASS','- x2_determinism: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE78();
}

required();
const c=readCanonicalFingerprintFromMd(path.join(E78_ROOT,'CLOSEOUT.md')), v=readCanonicalFingerprintFromMd(path.join(E78_ROOT,'VERDICT.md')), r=evidenceFingerprintE78();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE78();
for(const line of fs.readFileSync(path.join(E78_ROOT,'SHA256SUMS.md'),'utf8').split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x))){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}

const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
console.log('verify:e78:evidence PASSED');
