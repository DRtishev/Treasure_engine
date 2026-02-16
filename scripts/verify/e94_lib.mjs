#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E94_ROOT=path.resolve('reports/evidence/E94');
export const E94_LOCK_PATH=path.resolve('.foundation-seal/E94_KILL_LOCK.md');
export const CADENCE_PATH=path.resolve('core/edge/state/cadence_ledger_state.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);} 
export function fmt4(n){return Number(n).toFixed(4);} 
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);return m?m[1]:'';}
export function cadenceFingerprint(){return fs.existsSync(CADENCE_PATH)?sha256File(CADENCE_PATH):'ABSENT';}

export function anchorsE94(){
  const maybe=(p)=>fs.existsSync(path.resolve(p));
  const hashOrAbsent=(p)=>maybe(p)?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{if(!maybe(p)) return 'ABSENT';const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);return m?m[1]:'ABSENT';};
  const sentinel=maybe('reports/evidence/E87/MICROFILL_INPUT.md')?`SHA256:${sha256File(path.resolve('reports/evidence/E87/MICROFILL_INPUT.md'))}`:'ABSENT';
  return {
    e93_canonical_fingerprint:readCanon('reports/evidence/E93/CLOSEOUT.md'),
    reason_history_fingerprint:hashOrAbsent('core/edge/state/reason_history_state.md'),
    cadence_ledger_fingerprint:cadenceFingerprint(),
    demo_sentinel:sentinel,
    threshold_policy_hash:hashOrAbsent('core/edge/contracts/e86_threshold_policy.md'),
    canary_policy_hash:hashOrAbsent('core/edge/contracts/e86_canary_stage_policy.md'),
    disablelist_policy_hash:hashOrAbsent('core/edge/contracts/e87_disablelist_policy.md')
  };
}

export function parseCadenceRows(){
  if(!fs.existsSync(CADENCE_PATH)) return [];
  const text=fs.readFileSync(CADENCE_PATH,'utf8');
  return [...text.matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|\s([a-f0-9]{64})\s\|$/gm)]
    .map((m)=>({date_utc:m[1],symbol:m[2].trim(),sentinel:m[3].trim(),windows:m[4].trim(),notes_digest:m[5],anchors_digest:m[6]}));
}

export function readSumsCoreTextE94(){
  const p=path.join(E94_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E94/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E94/VERDICT.md')&&!line.endsWith(' reports/evidence/E94/SHA256SUMS.md');});
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function rewriteSumsE94(){
  const lines=fs.readdirSync(E94_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E94_ROOT,f))}  reports/evidence/E94/${f}`);
  writeMd(path.join(E94_ROOT,'SHA256SUMS.md'),`# E94 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE94(){
  const raw=fs.readFileSync(path.join(E94_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E94\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E94_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E94/${f}`);
  for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);
  for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);} 
}

export function evidenceFingerprintE94(){
  const req=['PREFLIGHT.md','CADENCE_SNAPSHOT.md','PROMOTION_MULTIWINDOW.md','PROMOTION_MULTIWINDOW_ASSERTIONS.md','RUNS_PROMOTION_MULTIWINDOW_X2.md','PERF_NOTES.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E94_ROOT,f)))) return '';
  const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE94())}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E94_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE94()}`);
  return sha256Text(chunks.join('\n'));
}
