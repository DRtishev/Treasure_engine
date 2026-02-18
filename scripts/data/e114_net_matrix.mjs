#!/usr/bin/env node
import { modeE114, assertNetGateE114, writeMdAtomic, E114_ROOT } from '../verify/e114_lib.mjs';
import { providerBybitPublic } from '../../core/data/provider_bybit_public.mjs';
import { providerBinancePublic } from '../../core/data/provider_binance_public.mjs';
import { providerKrakenPublic } from '../../core/data/provider_kraken_public.mjs';
import { providerCoingeckoOHLC } from '../../core/data/provider_coingecko_ohlc.mjs';

const mode=modeE114();
const providers=[providerBybitPublic,providerBinancePublic,providerKrakenPublic,providerCoingeckoOHLC];
const force=process.env.FORCE_NET_DOWN==='1';
const timeout=Number(process.env.E114_NET_TIMEOUT_MS||4000);
if (mode!=='OFFLINE_ONLY') assertNetGateE114();

async function ping(url){
  if (force) return {pass:false, code:'FORCED_NET_DOWN'};
  const ac=new AbortController(); const t=setTimeout(()=>ac.abort(),timeout);
  try{ const r=await fetch(url,{signal:ac.signal}); clearTimeout(t); return r.ok?{pass:true,code:'OK'}:{pass:false,code:`HTTP_${r.status}`}; }
  catch(e){ clearTimeout(t); return {pass:false, code:String(e.message||e).includes('aborted')?'E_TIMEOUT':'E_FETCH_FAIL'}; }
}

if (mode==='OFFLINE_ONLY') {
  writeMdAtomic(`${E114_ROOT}/NET_PROOF.md`, '# E114 NET PROOF\n- mode: OFFLINE_ONLY\n- status: OFFLINE\n- endpoint_attempts: 0\n- provider_success_count: 0\n- reason_code: OFFLINE_MODE');
  process.exit(0);
}

const rows=[]; let attempts=0;
for (const p of providers) {
  let ok=0; const eps=[];
  for (const e of p.endpoints.slice(0,2)) { attempts++; const r=await ping(e); if(r.pass) ok++; eps.push({e,...r}); }
  rows.push({name:p.name,ok,total:2,eps});
}
const success=rows.filter(r=>r.ok>0).length;
const quorum=success>=1 && attempts>=2;
const status = mode==='ONLINE_REQUIRED' ? (quorum?'PASS':'FAIL') : (quorum?'PASS':'WARN');
writeMdAtomic(`${E114_ROOT}/NET_PROOF.md`, [
  '# E114 NET PROOF', `- mode: ${mode}`, `- endpoint_attempts: ${attempts}`, `- provider_success_count: ${success}`, `- quorum_pass: ${quorum?'yes':'no'}`, `- status: ${status}`,
  '## Providers', ...rows.map(r=>`- ${r.name}: success=${r.ok}/${r.total}`),
  '## Endpoint Reason Codes', ...rows.flatMap(r=>r.eps.map(x=>`- ${r.name}|${x.e}: ${x.pass?'PASS':'FAIL'} (${x.code})`))
].join('\n'));
if (mode==='ONLINE_REQUIRED' && !quorum) throw new Error('E114_ONLINE_REQUIRED_NET_FAIL');
console.log(`e114_net_matrix: ${status}`);
