#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E80_ROOT = path.resolve('reports/evidence/E80');
export const E80_LOCK_PATH = path.resolve('.foundation-seal/E80_KILL_LOCK.md');
export const E80_POLICY = path.resolve('core/edge/contracts/e80_canary_stage_policy.md');
export const E80_CAL = path.resolve('core/edge/calibration/e80_execution_envelope_calibration.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function quietLog(msg){if(!isQuiet()) console.log(msg);}
export function minimalLog(msg){console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath))return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}
export function readSumsCoreTextE80(){const p=path.join(E80_ROOT,'SHA256SUMS.md');if(!fs.existsSync(p)) return '';const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true; return !line.endsWith(' reports/evidence/E80/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E80/VERDICT.md')&&!line.endsWith(' reports/evidence/E80/SHA256SUMS.md');});return `${lines.join('\n').replace(/\s+$/g,'')}\n`;}

export function readE79Binding(){
  const close=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E79/CLOSEOUT.md'));
  const verdict=readCanonicalFingerprintFromMd(path.resolve('reports/evidence/E79/VERDICT.md'));
  if(!close||!verdict||close!==verdict) throw new Error('E79 canonical mismatch');
  const e79Mat=fs.readFileSync(path.resolve('reports/evidence/E79/MATERIALS.md'),'utf8');
  const calHash=(e79Mat.match(/e78_calibration_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!calHash) throw new Error('missing E79 baseline calibration hash');
  return {e79_canonical_fingerprint:close,e79_baseline_calibration_hash:calHash};
}

export function evidenceFingerprintE80(){
  const req=['MATERIALS.md','EXEC_RECON_OBSERVED_MULTI.md','CALIBRATION_COURT.md','CALIBRATION_DIFF.md','CALIBRATION_CHANGELOG.md','EDGE_SHORTLIST.md','EDGE_CANARY.md','RUNS_EDGE_CANARY_X2.md','WOW_USAGE.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E80_ROOT,f)))) return '';
  const chunks=[`## E79_BINDING\n${JSON.stringify(readE79Binding())}\n`,`## POLICY_HASH\n${sha256File(E80_POLICY)}\n`,`## CAL_HASH\n${sha256File(E80_CAL)}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E80_ROOT,f),'utf8')}`);
  if(fs.existsSync(path.join(E80_ROOT,'EXEC_RECON_MICROFILL.md'))) chunks.push(`## EXEC_RECON_MICROFILL.md\n${fs.readFileSync(path.join(E80_ROOT,'EXEC_RECON_MICROFILL.md'),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE80()}`);
  return sha256Text(chunks.join('\n'));
}

export function rewriteSumsE80(){const lines=fs.readdirSync(E80_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E80_ROOT,f))}  reports/evidence/E80/${f}`);writeMd(path.join(E80_ROOT,'SHA256SUMS.md'),`# E80 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE80(){const raw=fs.readFileSync(path.join(E80_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E80\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');for(const line of raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x))){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}}
