#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E92_ROOT=path.resolve('reports/evidence/E92');
export const E92_LOCK_PATH=path.resolve('.foundation-seal/E92_KILL_LOCK.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);return m?m[1]:'';}
export function fmt4(n){return Number(n).toFixed(4);} 

export function anchorsE92(){
  const maybe=(p)=>fs.existsSync(path.resolve(p));
  const hashOrAbsent=(p)=>maybe(p)?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{if(!maybe(p)) return 'ABSENT';const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);return m?m[1]:'ABSENT';};
  return {
    reason_history_fingerprint:hashOrAbsent('core/edge/state/reason_history_state.md'),
    profit_ledger_fingerprint:hashOrAbsent('reports/evidence/E84/PROFIT_LEDGER.md'),
    microfill_ledger_fingerprint:hashOrAbsent('reports/evidence/E87/MICROFILL_LEDGER.md'),
    threshold_policy_hash:hashOrAbsent('core/edge/contracts/e86_threshold_policy.md'),
    canary_policy_hash:hashOrAbsent('core/edge/contracts/e86_canary_stage_policy.md'),
    disablelist_policy_hash:hashOrAbsent('core/edge/contracts/e87_disablelist_policy.md'),
    e91_canonical_fingerprint:readCanon('reports/evidence/E91/CLOSEOUT.md')
  };
}

export function readSumsCoreTextE92(){
  const p=path.join(E92_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E92/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E92/VERDICT.md')&&!line.endsWith(' reports/evidence/E92/SHA256SUMS.md');});
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function rewriteSumsE92(){
  const lines=fs.readdirSync(E92_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E92_ROOT,f))}  reports/evidence/E92/${f}`);
  writeMd(path.join(E92_ROOT,'SHA256SUMS.md'),`# E92 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE92(){
  const raw=fs.readFileSync(path.join(E92_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E92\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E92_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E92/${f}`);
  for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);
  for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);} 
}

export function evidenceFingerprintE92(){
  const req=['PREFLIGHT.md','EV_DELTA_COURT.md','EV_DELTA_DIFF.md','EV_DELTA_ASSERTIONS.md','RUNS_EV_DELTA_X2.md','PERF_NOTES.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E92_ROOT,f)))) return '';
  const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE92())}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E92_ROOT,f),'utf8')}`);
  if(fs.existsSync(path.join(E92_ROOT,'APPLY_RECEIPT.md'))) chunks.push(`## APPLY_RECEIPT.md\n${fs.readFileSync(path.join(E92_ROOT,'APPLY_RECEIPT.md'),'utf8')}`);
  if(fs.existsSync(path.join(E92_ROOT,'RUNS_APPLY_X2.md'))) chunks.push(`## RUNS_APPLY_X2.md\n${fs.readFileSync(path.join(E92_ROOT,'RUNS_APPLY_X2.md'),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE92()}`);
  return sha256Text(chunks.join('\n'));
}
