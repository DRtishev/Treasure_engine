#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E100_ROOT = path.resolve('reports/evidence/E100');
export const E100_LOCK_PATH = path.resolve('.foundation-seal/E100_KILL_LOCK.md');
export const E100_JOURNAL_PATH = path.resolve('.foundation-seal/E100_APPLY_JOURNAL.json');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}

// E100-1: CI truthiness hardening - treat both "true" and "1" as truthy
export function isCIMode(){
  const ci=String(process.env.CI||'');
  return ci==='true'||ci==='1';
}

export function readCanonicalFingerprintFromMd(filePath){
  if(!fs.existsSync(filePath)) return '';
  const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
  return m?m[1]:'';
}

export function anchorsE100(){
  const hashOrAbsent=(p)=>fs.existsSync(path.resolve(p))?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{
    if(!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m?m[1]:'ABSENT';
  };
  return {
    e99_canonical_fingerprint: readCanon('reports/evidence/E99/CLOSEOUT.md'),
    e98_canonical_fingerprint: readCanon('reports/evidence/E98/CLOSEOUT.md'),
    e97_canonical_fingerprint: readCanon('reports/evidence/E97/CLOSEOUT.md'),
    e97_overlay_hash: hashOrAbsent('core/edge/contracts/e97_envelope_tuning_overlay.md'),
    e97_profit_ledger_hash: hashOrAbsent('core/edge/state/profit_ledger_state.md')
  };
}

export function readSumsCoreTextE100(){
  const p=path.join(E100_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    return !line.endsWith(' reports/evidence/E100/CLOSEOUT.md')&&
           !line.endsWith(' reports/evidence/E100/VERDICT.md')&&
           !line.endsWith(' reports/evidence/E100/SHA256SUMS.md');
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function rewriteSumsE100(){
  const lines=fs.readdirSync(E100_ROOT)
    .filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md')
    .sort()
    .map((f)=>`${sha256File(path.join(E100_ROOT,f))}  reports/evidence/E100/${f}`);
  writeMd(path.join(E100_ROOT,'SHA256SUMS.md'),`# E100 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE100(){
  const raw=fs.readFileSync(path.join(E100_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E100\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E100_ROOT)
    .filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md')
    .map((f)=>`reports/evidence/E100/${f}`);
  for(const rel of mdFiles)
    if(!rows.find((r)=>r.endsWith(`  ${rel}`)))
      throw new Error(`missing sha row ${rel}`);
  for(const line of rows){
    const [h,rel]=line.split(/\s{2}/);
    if(sha256File(path.resolve(rel))!==h)
      throw new Error(`sha mismatch ${rel}`);
  }
}

export function evidenceFingerprintE100(){
  // Core files always required
  const coreReq=[
    'PREFLIGHT.md',
    'BUNDLE_HASH.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md'
  ];

  // Transaction files only required after apply/rollback
  const txnReq=[
    'APPLY_TXN.md',
    'RUNS_APPLY_TXN_X2.md',
    'ROLLBACK_TXN.md',
    'RUNS_ROLLBACK_X2.md'
  ];

  // Check if core files exist
  if(coreReq.some((f)=>!fs.existsSync(path.join(E100_ROOT,f)))) return '';

  // Determine which files to include
  const applyTxnExists=fs.existsSync(path.join(E100_ROOT,'APPLY_TXN.md'));
  const req=applyTxnExists ? [...coreReq,...txnReq] : coreReq;

  // If transaction files are expected but missing, return empty
  if(applyTxnExists&&txnReq.some((f)=>!fs.existsSync(path.join(E100_ROOT,f)))) return '';

  const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE100())}\n`];
  for(const f of req)
    chunks.push(`## ${f}\n${fs.readFileSync(path.join(E100_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE100()}`);
  return sha256Text(chunks.join('\n'));
}
