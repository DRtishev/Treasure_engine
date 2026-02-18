#!/usr/bin/env node
import { modeE115, assertNetGateE115, writeMdAtomic } from '../verify/e115_lib.mjs';
import { providerBybitLive } from '../../core/data/provider_bybit_live.mjs';
import { providerBinanceLive } from '../../core/data/provider_binance_live.mjs';
import { providerKrakenLive } from '../../core/data/provider_kraken_live.mjs';
import { providerCoingeckoLive } from '../../core/data/provider_coingecko_live.mjs';

const mode=modeE115(); const force=process.env.FORCE_NET_DOWN==='1';
const providers=[providerBybitLive,providerBinanceLive,providerKrakenLive,providerCoingeckoLive];
if (mode!=='OFFLINE_ONLY') assertNetGateE115();
if (mode==='OFFLINE_ONLY') {
  writeMdAtomic('reports/evidence/E115/NET_FULLNESS.md','# E115 NET FULLNESS\n- mode: OFFLINE_ONLY\n- status: OFFLINE\n- provider_success_count: 0\n- endpoint_attempts: 0');
  process.exit(0);
}
async function probe(url){ if(force) return {pass:false,code:'FORCED_NET_DOWN'}; try{ const r=await fetch(url); return r.ok?{pass:true,code:'OK'}:{pass:false,code:`HTTP_${r.status}`}; }catch{return {pass:false,code:'E_FETCH_FAIL'};} }
const rows=[]; let attempts=0; for(const p of providers){ let ok=0; const eps=[]; for(const e of p.endpoints.slice(0,2)){ attempts++; const r=await probe(e); if(r.pass) ok++; eps.push({e,...r}); } rows.push({name:p.name,ok,total:2,eps}); }
const success=rows.filter(r=>r.ok>0).length; const pass=success>=1&&attempts>=2; const status=mode==='ONLINE_REQUIRED'?(pass?'FULL':'FAIL'):(pass?'PASS':'WARN');
writeMdAtomic('reports/evidence/E115/NET_FULLNESS.md',['# E115 NET FULLNESS',`- mode: ${mode}`,`- endpoint_attempts: ${attempts}`,`- provider_success_count: ${success}`,`- status: ${status}`,'## Providers',...rows.map(r=>`- ${r.name}: success=${r.ok}/${r.total}`),'## Endpoint Reason Codes',...rows.flatMap(r=>r.eps.map(x=>`- ${r.name}|${x.e}: ${x.pass?'PASS':'FAIL'} (${x.code})`))].join('\n'));
if(mode==='ONLINE_REQUIRED'&&!pass) throw new Error('E115_ONLINE_REQUIRED_FAIL_CLOSED');
console.log(`e115_net_fullness: ${status}`);
