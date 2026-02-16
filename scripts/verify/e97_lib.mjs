#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E97_ROOT = path.resolve('reports/evidence/E97');
export const E97_LOCK_PATH = path.resolve('.foundation-seal/E97_KILL_LOCK.md');
export const E97_POLICY = path.resolve('core/edge/contracts/e96_risk_envelopes.md');
export const E97_PROFIT = path.resolve('core/edge/state/profit_ledger_state.md');
export const E97_ADVERSE = path.resolve('core/edge/state/fixtures/e97_profit_ledger_adverse_fixture.md');
export const E97_OVERLAY = path.resolve('core/edge/contracts/e97_envelope_tuning_overlay.md');

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
export function isQuiet(){return String(process.env.QUIET||'0')==='1';}
export function minimalLog(msg){console.log(msg);}
export function fmt4(n){return Number(n).toFixed(4);} 
export function readCanonicalFingerprintFromMd(filePath){if(!fs.existsSync(filePath)) return '';const m=fs.readFileSync(filePath,'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);return m?m[1]:'';}

export function parseProfitRows(text){
  return [...text.matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s(-?[0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|$/gm)]
    .map((m)=>({date_utc:m[1],symbol:m[2].trim(),pnl_usd:Number(m[3]),latency_ms:Number(m[4]),spread_bps:Number(m[5]),fill_rate:Number(m[6])}));
}
export function readProfitRows(filePath=E97_PROFIT){if(!fs.existsSync(filePath)) return [];return parseProfitRows(fs.readFileSync(filePath,'utf8'));}

export function writeProfitRows(rows){
  const sorted=[...rows].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
  writeMd(E97_PROFIT,['# E97 Profit Ledger State','', '| date_utc | symbol | pnl_usd | latency_ms | spread_bps | fill_rate |','|---|---|---:|---:|---:|---:|',...sorted.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${fmt4(r.pnl_usd)} | ${fmt4(r.latency_ms)} | ${fmt4(r.spread_bps)} | ${fmt4(r.fill_rate)} |`)].join('\n'));
}

export function parseCadenceSymbols(){
  const p=path.resolve('core/edge/state/cadence_ledger_state.md');
  if(!fs.existsSync(p)) return [];
  return [...new Set([...fs.readFileSync(p,'utf8').matchAll(/^\|\s\d{4}-\d{2}-\d{2}\s\|\s([^|]+)\s\|/gm)].map((m)=>m[1].trim()))].sort();
}
export function parseReasonSymbols(){
  const p=path.resolve('core/edge/state/reason_history_state.md');
  if(!fs.existsSync(p)) return [];
  return [...new Set([...fs.readFileSync(p,'utf8').matchAll(/^\|\s\d{4}-\d{2}-\d{2}\s\|\s([^|]+)\s\|/gm)].map((m)=>m[1].trim()))].sort();
}

export function anchorsE97(){
  const hashOrAbsent=(p)=>fs.existsSync(path.resolve(p))?sha256File(path.resolve(p)):'ABSENT';
  const readCanon=(p)=>{if(!fs.existsSync(path.resolve(p))) return 'ABSENT';const m=fs.readFileSync(path.resolve(p),'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);return m?m[1]:'ABSENT';};
  return {
    e96_canonical_fingerprint: readCanon('reports/evidence/E96/CLOSEOUT.md'),
    e96_risk_envelopes_hash: hashOrAbsent(E97_POLICY),
    profit_ledger_state_hash: hashOrAbsent(E97_PROFIT),
    cadence_ledger_state_hash: hashOrAbsent('core/edge/state/cadence_ledger_state.md'),
    reason_history_state_hash: hashOrAbsent('core/edge/state/reason_history_state.md'),
    e97_overlay_hash: hashOrAbsent(E97_OVERLAY),
    adverse_fixture_hash: hashOrAbsent(E97_ADVERSE)
  };
}

export function readSumsCoreTextE97(){
  const p=path.join(E97_ROOT,'SHA256SUMS.md');
  if(!fs.existsSync(p)) return '';
  const raw=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  const lines=raw.split('\n').filter((line)=>{
    if(!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    return !line.endsWith(' reports/evidence/E97/CLOSEOUT.md')&&!line.endsWith(' reports/evidence/E97/VERDICT.md')&&!line.endsWith(' reports/evidence/E97/SHA256SUMS.md');
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function rewriteSumsE97(){
  const lines=fs.readdirSync(E97_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>`${sha256File(path.join(E97_ROOT,f))}  reports/evidence/E97/${f}`);
  writeMd(path.join(E97_ROOT,'SHA256SUMS.md'),`# E97 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsE97(){
  const raw=fs.readFileSync(path.join(E97_ROOT,'SHA256SUMS.md'),'utf8');
  if(/\sreports\/evidence\/E97\/SHA256SUMS\.md$/m.test(raw)) throw new Error('sha self-row forbidden');
  const rows=raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x));
  const mdFiles=fs.readdirSync(E97_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').map((f)=>`reports/evidence/E97/${f}`);
  for(const rel of mdFiles) if(!rows.find((r)=>r.endsWith(`  ${rel}`))) throw new Error(`missing sha row ${rel}`);
  for(const line of rows){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`sha mismatch ${rel}`);} 
}

export function evidenceFingerprintE97(){
  const req=['PREFLIGHT.md','PROFIT_LEDGER_SNAPSHOT.md','TUNING_COURT.md','TUNING_DIFF.md','TUNING_ASSERTIONS.md','ADVERSE_SUITE.md','ADVERSE_ASSERTIONS.md','RUNS_TUNING_X2.md','PERF_NOTES.md'];
  if(req.some((f)=>!fs.existsSync(path.join(E97_ROOT,f)))) return '';
  const chunks=[`## ANCHORS\n${JSON.stringify(anchorsE97())}\n`];
  for(const f of req) chunks.push(`## ${f}\n${fs.readFileSync(path.join(E97_ROOT,f),'utf8')}`);
  if(fs.existsSync(path.join(E97_ROOT,'APPLY_RECEIPT.md'))) chunks.push(`## APPLY_RECEIPT.md\n${fs.readFileSync(path.join(E97_ROOT,'APPLY_RECEIPT.md'),'utf8')}`);
  if(fs.existsSync(path.join(E97_ROOT,'RUNS_APPLY_X2.md'))) chunks.push(`## RUNS_APPLY_X2.md\n${fs.readFileSync(path.join(E97_ROOT,'RUNS_APPLY_X2.md'),'utf8')}`);
  chunks.push(`## SUMS_CORE\n${readSumsCoreTextE97()}`);
  return sha256Text(chunks.join('\n'));
}


export function decideEnvelopeAction(stats){
  if(stats.days<2) return {action:'OBSERVE',reason:'INSUFFICIENT_DAYS',param:'none',delta:'0.0000',tier_delta:0};
  if(stats.fill_rate<0.85) return {action:'PARK',reason:'INVALID_RATE',param:'max_position_risk',delta:'-0.0100',tier_delta:0};
  if(stats.pnl_usd<0) return {action:'TIGHTEN',reason:'PROFIT_SLIPPAGE',param:'max_position_risk',delta:'-0.0100',tier_delta:-1};
  if(stats.latency_ms>70) return {action:'HOLD',reason:'PROFIT_LATENCY',param:'execution_timeout_ms',delta:'0.0000',tier_delta:0};
  if(stats.spread_bps<1.5&&stats.pnl_usd>40) return {action:'LOOSEN',reason:'PROFIT_SPREAD',param:'max_position_risk',delta:'+0.0100',tier_delta:1};
  return {action:'HOLD',reason:'PROFIT_LATENCY',param:'execution_timeout_ms',delta:'0.0000',tier_delta:0};
}

export function computeTuningCourt(rows){
  const perSymbol=new Map();
  for(const r of rows){
    const s=perSymbol.get(r.symbol)||{days:0,pnl_usd:0,latency_ms:0,spread_bps:0,fill_rate:0};
    s.days+=1;s.pnl_usd+=r.pnl_usd;s.latency_ms+=r.latency_ms;s.spread_bps+=r.spread_bps;s.fill_rate+=r.fill_rate;
    perSymbol.set(r.symbol,s);
  }
  const stats=[...perSymbol.entries()].map(([symbol,s])=>({symbol,days:s.days,pnl_usd:s.pnl_usd/s.days,latency_ms:s.latency_ms/s.days,spread_bps:s.spread_bps/s.days,fill_rate:s.fill_rate/s.days})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  const proposed=[];
  for(const s of stats){const d=decideEnvelopeAction(s);if(d.action!=='OBSERVE') proposed.push({...s,...d});}
  const touched=proposed.filter((p)=>['TIGHTEN','LOOSEN','PARK'].includes(p.action)).slice(0,3);
  return stats.map((s)=>{const found=touched.find((t)=>t.symbol===s.symbol);if(found) return found;return {...s,...decideEnvelopeAction(s),action:'OBSERVE',reason:'INSUFFICIENT_DAYS',param:'none',delta:'0.0000',tier_delta:0};}).sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.param.localeCompare(b.param)||String(a.tier_delta).localeCompare(String(b.tier_delta)));
}
