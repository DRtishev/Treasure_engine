#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E78_ROOT = path.resolve('reports/evidence/E78');
export const E78_LOCK_PATH = path.resolve('.foundation-seal/E78_KILL_LOCK.md');
export const CAL_FILE = path.resolve('core/edge/calibration/e78_execution_envelope_calibration.md');
export const THRESH_FILE = path.resolve('core/edge/contracts/e78_canary_thresholds.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function defaultNormalizedEnv(){return {TZ:'UTC',LANG:'C',LC_ALL:'C',SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',SEED:String(process.env.SEED||'12345')}}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath))return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}

export function readE77Binding(){
  const c=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E77/CLOSEOUT.md'));
  const v=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E77/VERDICT.md'));
  if(!c||!v||c!==v) throw new Error('E77 canonical mismatch');
  const calHash=(fs.readFileSync(path.resolve('reports/evidence/E77/CALIBRATION_COURT.md'),'utf8').match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!calHash) throw new Error('E77 calibration hash missing');
  return {e77_canonical_fingerprint:c,e77_calibration_hash:calHash};
}

export function readSumsCoreTextE78(){
  const p=path.join(E78_ROOT,'SHA256SUMS.md'); if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true; if(line.endsWith(' reports/evidence/E78/CLOSEOUT.md')) return false; if(line.endsWith(' reports/evidence/E78/VERDICT.md')) return false; if(line.endsWith(' reports/evidence/E78/SHA256SUMS.md')) return false; return true;});
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function evidenceFingerprintE78(){
  const bind=readE77Binding();
  const req=['MATERIALS.md','EXEC_RECON_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_PROFIT_SEARCH.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E78_ROOT,f)))) return '';
  const chunks=[`## E77_BINDING\n${JSON.stringify(bind)}\n`,`## CAL_HASH\n${sha256File(CAL_FILE)}\n`,`## THRESH_HASH\n${sha256File(THRESH_FILE)}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E78_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE78()}`);
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE78(){
  const lines=fs.readdirSync(E78_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>{const abs=path.join(E78_ROOT,f);const rel=path.relative(process.cwd(),abs).split(path.sep).join('/');return `${sha256File(abs)}  ${rel}`;});
  writeMd(path.join(E78_ROOT,'SHA256SUMS.md'),`# E78 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE78(){
  const raw=fs.readFileSync(path.join(E78_ROOT,'SHA256SUMS.md'),'utf8');
  if(!/\sreports\/evidence\/E78\/CLOSEOUT\.md$/m.test(raw)||!/\sreports\/evidence\/E78\/VERDICT\.md$/m.test(raw)) throw new Error('sha rows missing closeout/verdict');
  if(/\sreports\/evidence\/E78\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  for(const line of raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x))){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}
}
