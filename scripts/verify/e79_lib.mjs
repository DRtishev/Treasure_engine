#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E79_ROOT = path.resolve('reports/evidence/E79');
export const E79_LOCK_PATH = path.resolve('.foundation-seal/E79_KILL_LOCK.md');
export const E79_POLICY = path.resolve('core/edge/contracts/e79_canary_stage_policy.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function quietLog(msg){if(!isQuiet()) console.log(msg);}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath))return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}
export function readSumsCoreTextE79(){
  const p=path.join(E79_ROOT,'SHA256SUMS.md'); if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true; return !line.endsWith(' reports/evidence/E79/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E79/VERDICT.md')&&!line.endsWith(' reports/evidence/E79/SHA256SUMS.md');});
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function readE78Binding(){
  const close=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E78/CLOSEOUT.md'));
  const verdict=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E78/VERDICT.md'));
  if(!close||!verdict||close!==verdict) throw new Error('E78 canonical mismatch');
  const calibrationHash=(fs.readFileSync(path.resolve('reports/evidence/E78/CALIBRATION_COURT.md'),'utf8').match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!calibrationHash) throw new Error('missing E78 calibration hash');
  return {e78_canonical_fingerprint:close,e78_calibration_hash:calibrationHash};
}

export function evidenceFingerprintE79(){
  const req=['MATERIALS.md','QUIET_POLICY.md','EXEC_RECON_OBSERVED_MULTI.md','EDGE_SHORTLIST.md','CANARY_STAGE_POLICY.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E79_ROOT,f)))) return '';
  const bind=readE78Binding();
  const chunks=[`## E78_BINDING\n${JSON.stringify(bind)}\n`,`## STAGE_POLICY\n${sha256File(E79_POLICY)}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E79_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE79()}`);
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE79(){
  const lines=fs.readdirSync(E79_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>{const abs=path.join(E79_ROOT,f);const rel=path.relative(process.cwd(),abs).split(path.sep).join('/');return `${sha256File(abs)}  ${rel}`;});
  writeMd(path.join(E79_ROOT,'SHA256SUMS.md'),`# E79 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE79(){
  const raw=fs.readFileSync(path.join(E79_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E79\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  for(const line of raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x))){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}
}

