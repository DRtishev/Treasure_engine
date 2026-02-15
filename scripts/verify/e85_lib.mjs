#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E85_ROOT = path.resolve('reports/evidence/E85');
export const E85_LOCK_PATH = path.resolve('.foundation-seal/E85_KILL_LOCK.md');
export const E85_THRESHOLD_POLICY = path.resolve('core/edge/contracts/e85_threshold_policy.md');
export const E84_POLICY = path.resolve('core/edge/contracts/e84_canary_stage_policy.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function quietLog(msg){if(!isQuiet()) console.log(msg);}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}

export function readSumsCoreTextE85(){
  const p=path.join(E85_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    return !line.endsWith(' reports/evidence/E85/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E85/VERDICT.md')&&!line.endsWith(' reports/evidence/E85/SHA256SUMS.md');
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function readE84Binding(){
  const close=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E84/CLOSEOUT.md'));
  const verdict=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E84/VERDICT.md'));
  if(!close||!verdict||close!==verdict) throw new Error('E84 canonical mismatch');
  return {e84_canonical_fingerprint:close};
}

export function demoDailySentinel(){
  const p=path.join(E85_ROOT,'EXEC_RECON_DEMO_DAILY.md');
  if(!fs.existsSync(p)) return 'DEMO_DAILY=ABSENT';
  return `DEMO_DAILY=SHA256:${sha256File(p)}`;
}

export function evidenceFingerprintE85(){
  const req=['MATERIALS.md','THRESHOLD_APPLY.md','THRESHOLD_APPLY_DIFF.md','THRESHOLD_APPLY_CHANGELOG.md','RUNS_THRESHOLD_APPLY_X2.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E85_ROOT,f)))) return '';
  const court=fs.readFileSync(path.resolve('reports/evidence/E84/THRESHOLD_COURT.md'),'utf8');
  const courtHash=(court.match(/threshold_court_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const shortlistHash=fs.existsSync(path.resolve('reports/evidence/E80/EDGE_SHORTLIST.md'))?sha256File(path.resolve('reports/evidence/E80/EDGE_SHORTLIST.md')):'';
  const calHash=(fs.readFileSync(path.resolve('reports/evidence/E82/CALIBRATION_COURT.md'),'utf8').match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const chunks=[`## E84_BINDING\n${JSON.stringify(readE84Binding())}\n`,`## THRESHOLD_POLICY_HASH\n${sha256File(E85_THRESHOLD_POLICY)}\n`,`## THRESHOLD_COURT_HASH\n${courtHash}\n`,`## DEMO_DAILY_SENTINEL\n${demoDailySentinel()}\n`,`## SHORTLIST_HASH\n${shortlistHash}\n`,`## CALIBRATION_HASH\n${calHash}\n`,`## CANARY_STAGE_POLICY_HASH\n${sha256File(E84_POLICY)}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E85_ROOT,f),'utf8')}`);
  if(fs.existsSync(path.join(E85_ROOT,'EXEC_RECON_DEMO_DAILY.md'))) chunks.push(`## EXEC_RECON_DEMO_DAILY.md\n${fs.readFileSync(path.join(E85_ROOT,'EXEC_RECON_DEMO_DAILY.md'),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE85()}`);
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE85(){const lines=fs.readdirSync(E85_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E85_ROOT,f))}  reports/evidence/E85/${f}`);writeMd(path.join(E85_ROOT,'SHA256SUMS.md'),`# E85 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE85(){const raw=fs.readFileSync(path.join(E85_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E85\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E85_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E85/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}}
