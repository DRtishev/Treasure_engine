#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E83_ROOT = path.resolve('reports/evidence/E83');
export const E83_LOCK_PATH = path.resolve('.foundation-seal/E83_KILL_LOCK.md');
export const E83_POLICY = path.resolve('core/edge/contracts/e83_canary_stage_policy.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function quietLog(msg){if(!isQuiet()) console.log(msg);}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}

export function readSumsCoreTextE83(){
  const p=path.join(E83_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    return !line.endsWith(' reports/evidence/E83/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E83/VERDICT.md')&&!line.endsWith(' reports/evidence/E83/SHA256SUMS.md');
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function readE82Binding(){
  const close=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E82/CLOSEOUT.md'));
  const verdict=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E82/VERDICT.md'));
  if(!close||!verdict||close!==verdict) throw new Error('E82 canonical mismatch');
  return {e82_canonical_fingerprint:close};
}

export function demoDailySentinel(){
  const p=path.join(E83_ROOT,'EXEC_RECON_DEMO_DAILY.md');
  if(!fs.existsSync(p)) return 'DEMO_DAILY=ABSENT';
  return `DEMO_DAILY=SHA256:${sha256File(p)}`;
}

export function evidenceFingerprintE83(){
  const req=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','THRESHOLD_COURT.md','THRESHOLD_DIFF.md','THRESHOLD_CHANGELOG.md','READINESS_TREND.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E83_ROOT,f)))) return '';
  const chunks=[`## E82_BINDING\n${JSON.stringify(readE82Binding())}\n`,`## POLICY_HASH\n${sha256File(E83_POLICY)}\n`,`## DEMO_DAILY_SENTINEL\n${demoDailySentinel()}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E83_ROOT,f),'utf8')}`);
  if(fs.existsSync(path.join(E83_ROOT,'EXEC_RECON_DEMO_DAILY.md'))) chunks.push(`## EXEC_RECON_DEMO_DAILY.md\n${fs.readFileSync(path.join(E83_ROOT,'EXEC_RECON_DEMO_DAILY.md'),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE83()}`);
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE83(){
  const lines=fs.readdirSync(E83_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E83_ROOT,f))}  reports/evidence/E83/${f}`);
  writeMd(path.join(E83_ROOT,'SHA256SUMS.md'),`# E83 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE83(){
  const raw=fs.readFileSync(path.join(E83_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E83\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E83_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E83/${f}`);
  for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);
  for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}
}
