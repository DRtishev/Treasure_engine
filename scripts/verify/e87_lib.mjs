#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E87_ROOT = path.resolve('reports/evidence/E87');
export const E87_LOCK_PATH = path.resolve('.foundation-seal/E87_KILL_LOCK.md');
export const E87_MITIGATION_POLICY = path.resolve('core/edge/contracts/e87_mitigation_policy.md');
export const E87_DISABLELIST_POLICY = path.resolve('core/edge/contracts/e87_disablelist_policy.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function quietLog(msg){if(!isQuiet()) console.log(msg);}
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);return m?m[1]:'';}
export function readSumsCoreTextE87(){const p=path.join(E87_ROOT,'SHA256SUMS.md');if(!fs.existsSync(p)) return '';const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');const lines=raw.split('\n').filter((line)=>{if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;return !line.endsWith(' reports/evidence/E87/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E87/VERDICT.md')&&!line.endsWith(' reports/evidence/E87/SHA256SUMS.md');});return `${lines.join('\n').replace(/\s+$/g,'')}\n`;}
export function demoDailySentinel(){const p=path.resolve('reports/evidence/E86/EXEC_RECON_DEMO_DAILY.md');if(!fs.existsSync(p)) return 'DEMO_DAILY=ABSENT';return `DEMO_DAILY=SHA256:${sha256File(p)}`;}
export function rewriteSumsE87(){const lines=fs.readdirSync(E87_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E87_ROOT,f))}  reports/evidence/E87/${f}`);writeMd(path.join(E87_ROOT,'SHA256SUMS.md'),`# E87 SHA256SUMS\n\n${lines.join('\n')}`);}
export function verifySumsE87(){const raw=fs.readFileSync(path.join(E87_ROOT,'SHA256SUMS.md'),'utf8');if(/\sreports\/evidence\/E87\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));const mdFiles=fs.readdirSync(E87_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E87/${f}`);for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);}}
export function evidenceFingerprintE87(){
  const req=['PREFLIGHT.md','EXEC_RECON_MICROFILL.md','MICROFILL_LEDGER.md','MITIGATION_COURT.md','MITIGATION_DIFF.md','DISABLELIST_COURT.md','APPLY_RECEIPT.md','RUNS_APPLY_X2.md','PERF_NOTES.md','TIGHTENING_DIFF.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E87_ROOT,f)))) return '';
  const chunks=[];
  const anchors={
    recon_fingerprint:(fs.readFileSync(path.resolve('reports/evidence/E84/EXEC_RECON_OBSERVED_MULTI.md'),'utf8').match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',
    profit_ledger_fingerprint:(fs.readFileSync(path.resolve('reports/evidence/E84/PROFIT_LEDGER.md'),'utf8').match(/ledger_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',
    shortlist_fingerprint:(fs.readFileSync(path.resolve('reports/evidence/E80/EDGE_SHORTLIST.md'),'utf8').match(/shortlist_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',
    calibration_hash:(fs.readFileSync(path.resolve('reports/evidence/E82/CALIBRATION_COURT.md'),'utf8').match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'',
    threshold_policy_hash:sha256File(path.resolve('core/edge/contracts/e86_threshold_policy.md')),
    demo_daily_sentinel:demoDailySentinel(),
    mitigation_policy_hash:sha256File(E87_MITIGATION_POLICY),
    disablelist_policy_hash:sha256File(E87_DISABLELIST_POLICY)
  };
  chunks.push(`## ANCHORS\n${JSON.stringify(anchors)}\n`);
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E87_ROOT,f),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE87()}`);
  return sha256Text(chunks.join('\n'));
}
