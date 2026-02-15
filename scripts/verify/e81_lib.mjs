#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E81_ROOT = path.resolve('reports/evidence/E81');
export const E81_LOCK_PATH = path.resolve('.foundation-seal/E81_KILL_LOCK.md');
export const E81_POLICY = path.resolve('core/edge/contracts/e81_canary_stage_policy.md');
export const E81_CAL = path.resolve('core/edge/calibration/e81_execution_envelope_calibration.md');
export const E80_CAL = path.resolve('core/edge/calibration/e80_execution_envelope_calibration.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function quietLog(msg){if(!isQuiet()) console.log(msg);}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath))return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}

export function readSumsCoreTextE81(){
  const sumsPath=path.join(E81_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(sumsPath)) return '';
  const raw=fs.readFileSync(sumsPath,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    return !line.endsWith(' reports/evidence/E81/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E81/VERDICT.md')&&!line.endsWith(' reports/evidence/E81/SHA256SUMS.md');
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function readE80Binding(){
  const close=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E80/CLOSEOUT.md'));
  const verdict=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E80/VERDICT.md'));
  if(!close||!verdict||close!==verdict) throw new Error('E80 canonical mismatch');
  const e80Court=fs.readFileSync(path.resolve('reports/evidence/E80/CALIBRATION_COURT.md'),'utf8');
  const prevHash=(e80Court.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!prevHash) throw new Error('missing E80 calibration hash');
  return {e80_canonical_fingerprint:close,e80_calibration_hash:prevHash};
}

export function evidenceFingerprintE81(){
  const req=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E81_ROOT,f)))) return '';
  const chunks=[`## E80_BINDING\n${JSON.stringify(readE80Binding())}\n`,`## POLICY_HASH\n${sha256File(E81_POLICY)}\n`,`## CAL_HASH\n${sha256File(E81_CAL)}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E81_ROOT,f),'utf8')}`);
  if(fs.existsSync(path.join(E81_ROOT,'EXEC_RECON_DEMO_MICROFILL.md'))) chunks.push(`## EXEC_RECON_DEMO_MICROFILL.md\n${fs.readFileSync(path.join(E81_ROOT,'EXEC_RECON_DEMO_MICROFILL.md'),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE81()}`);
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE81(){
  const lines=fs.readdirSync(E81_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E81_ROOT,f))}  reports/evidence/E81/${f}`);
  writeMd(path.join(E81_ROOT,'SHA256SUMS.md'),`# E81 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE81(){
  const raw=fs.readFileSync(path.join(E81_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E81\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E81_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E81/${f}`);
  for(const rel of mdFiles){if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);}
  for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}
}
