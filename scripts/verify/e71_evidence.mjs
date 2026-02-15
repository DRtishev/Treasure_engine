#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { computeWowFingerprint } from './e71_wow_verify.mjs';
import { E71_ROOT, ensureDir, defaultNormalizedEnv, readE70Bindings, materialsHashesE71, rewriteSumsE71, verifySumsRowsE71, evidenceFingerprintE71, readCanonicalFingerprintFromMd } from './e71_lib.mjs';
import { buildChainBundle } from './e70_chain_bundle.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E71_EVIDENCE==='1';
const chainMode=String(process.env.CHAIN_MODE||'FAST_PLUS').toUpperCase();
if(!['FULL','FAST_PLUS','FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E71_EVIDENCE=1 forbidden when CI=true');

function gitStatus(){ return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim(); }
function parseMap(text){ const m=new Map(); for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean)) m.set(row.slice(3).trim(),row.slice(0,2)); return m; }
function driftOnlyAllowed(before,after){ const b=parseMap(before),a=parseMap(after),c=[]; for(const [r,s] of a.entries()) if(!b.has(r)||b.get(r)!==s) c.push(r); for(const r of b.keys()) if(!a.has(r)) c.push(r); return c.every((r)=>r.startsWith('reports/evidence/E71/')||r.startsWith('docs/wow/')||r.startsWith('core/edge/fixtures/')); }

function buildMaterials(bundle,wowFp,edgeFp){
  const env=defaultNormalizedEnv(); const e70=readE70Bindings(); const hashes=materialsHashesE71().map((x)=>`- ${x.file}: ${x.sha256}`);
  return [
    '# E71 MATERIALS',`- chain_mode: ${chainMode}`,`- e70_canonical_fingerprint: ${e70.e70_canonical_fingerprint}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    `- wow_fingerprint: ${wowFp}`,
    `- edge_meta_fingerprint: ${edgeFp}`,
    '- chain_bundle_entries:',...bundle.entries.map((e)=>`  - ${e.epoch}: canonical=${e.canonical_fingerprint} sums_core=${e.sums_core_hash}`),
    `- node_version: ${process.version}`,
    `- npm_version: ${(spawnSync('npm',['-v'],{encoding:'utf8'}).stdout||'').trim()}`,
    '- env_normalization:',`  - TZ=${env.TZ}`,`  - LANG=${env.LANG}`,`  - LC_ALL=${env.LC_ALL}`,`  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,...hashes
  ].join('\n');
}

function buildWowLibrary(wowFp){
  const ledger=fs.readFileSync(path.resolve('docs/wow/WOW_LEDGER.md'),'utf8').replace(/\r\n/g,'\n');
  const ids=ledger.split('\n').filter((l)=>/^\|\sW-\d{4}\s\|/.test(l)).map((l)=>l.split('|')[1].trim()).sort();
  return ['# E71 WOW LIBRARY',`- wow_fingerprint: ${wowFp}`,`- cards_count: ${ids.length}`,'- ids: '+ids.join(', ')].join('\n');
}

function buildEdgeMeta(edge){
  const lines=['# E71 EDGE META',`- edge_meta_fingerprint: ${edge.deterministic_fingerprint}`,'','## Metamorphic Laws','| law | dataset | pass | observed_delta |','|---|---|---|---:|'];
  for(const l of edge.laws) lines.push(`| ${l.law} | ${l.dataset} | ${l.pass?'true':'false'} | ${Number(l.observed_delta).toFixed(8)} |`);
  lines.push('','## Adversarial Regimes','| dataset | regime | trades | winrate | pf | maxdd | sharpe | expectancy | worst_run | avg_hold | fee_slippage_impact | net_pnl |','|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for(const row of edge.regimes){const m=row.metrics;lines.push(`| ${row.dataset} | ${row.regime} | ${m.trades} | ${m.winrate.toFixed(8)} | ${m.profit_factor.toFixed(8)} | ${m.max_drawdown.toFixed(8)} | ${m.sharpe_simple.toFixed(8)} | ${m.expectancy.toFixed(8)} | ${m.worst_run} | ${m.avg_hold.toFixed(8)} | ${m.fee_slippage_impact.toFixed(8)} | ${m.net_pnl.toFixed(8)} |`);} 
  return lines.join('\n');
}

function buildCloseout(fp,bundle){ return ['# E71 CLOSEOUT','',`- chain_mode: ${chainMode}`,`- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,'- commands:','  - npm ci',`  - CI=false UPDATE_E71_EVIDENCE=1 CHAIN_MODE=${chainMode} npm run -s verify:e71`,`- canonical_fingerprint: ${fp}`,'- links:','  - MATERIALS.md','  - WOW_LIBRARY.md','  - EDGE_META.md','  - RUNS_EDGE_META_X2.md','  - SHA256SUMS.md'].join('\n'); }
function buildVerdict(fp,bundle){ return ['# E71 VERDICT','','Status: PASS',`- chain_mode: ${chainMode}`,`- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,`- canonical_fingerprint: ${fp}`].join('\n'); }

function verifyAll(){
  const req=['MATERIALS.md','WOW_LIBRARY.md','EDGE_META.md','RUNS_EDGE_META_X2.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
  for(const f of req) if(!fs.existsSync(path.join(E71_ROOT,f))) throw new Error(`Missing ${f}`);
  const fp=evidenceFingerprintE71(); const c=readCanonicalFingerprintFromMd(path.join(E71_ROOT,'CLOSEOUT.md')); const v=readCanonicalFingerprintFromMd(path.join(E71_ROOT,'VERDICT.md'));
  if(!fp||c!==fp||v!==fp) throw new Error(`canonical mismatch closeout=${c} verdict=${v} computed=${fp}`);
  verifySumsRowsE71();
  const check=spawnSync('bash',['-lc',"grep -E '^[0-9a-f]{64} ' reports/evidence/E71/SHA256SUMS.md | sha256sum -c -"],{encoding:'utf8'});
  if((check.status??1)!==0) throw new Error(`sha check failed\n${check.stdout}\n${check.stderr}`);
  return fp;
}

const before=gitStatus();
const wowFp=computeWowFingerprint();
const edge=JSON.parse((spawnSync('node',['-e',"import('./core/edge/alpha/edge_magic_meta_suite_v1.mjs').then(m=>console.log(JSON.stringify(m.runEdgeMetaSuiteV1())))"],{encoding:'utf8'}).stdout||'').trim());
const bundle=buildChainBundle(chainMode);

if(update){
  ensureDir(E71_ROOT);
  if(!fs.existsSync(path.join(E71_ROOT,'RUNS_EDGE_META_X2.md'))) throw new Error('RUNS_EDGE_META_X2.md missing (run x2 first)');
  writeMd(path.join(E71_ROOT,'MATERIALS.md'),buildMaterials(bundle,wowFp,edge.deterministic_fingerprint));
  writeMd(path.join(E71_ROOT,'WOW_LIBRARY.md'),buildWowLibrary(wowFp));
  writeMd(path.join(E71_ROOT,'EDGE_META.md'),buildEdgeMeta(edge));
  writeMd(path.join(E71_ROOT,'CLOSEOUT.md'),buildCloseout('0'.repeat(64),bundle));
  writeMd(path.join(E71_ROOT,'VERDICT.md'),buildVerdict('0'.repeat(64),bundle));
  rewriteSumsE71();
  let fp=evidenceFingerprintE71();
  writeMd(path.join(E71_ROOT,'CLOSEOUT.md'),buildCloseout(fp,bundle));
  writeMd(path.join(E71_ROOT,'VERDICT.md'),buildVerdict(fp,bundle));
  rewriteSumsE71();
  const fp2=evidenceFingerprintE71();
  if(fp2!==fp){ writeMd(path.join(E71_ROOT,'CLOSEOUT.md'),buildCloseout(fp2,bundle)); writeMd(path.join(E71_ROOT,'VERDICT.md'),buildVerdict(fp2,bundle)); rewriteSumsE71(); }
}

const verified=verifyAll();
const after=gitStatus();
if(before!==after){ if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!driftOnlyAllowed(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION'); }
console.log(`verify:e71:evidence PASSED canonical_fingerprint=${verified}`);
