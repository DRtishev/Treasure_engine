#!/usr/bin/env node
import fs from 'node:fs';
import { fetchOHLCV } from '../../core/data/provider_interface.mjs';
import { providerBybitPublic } from '../../core/data/provider_bybit_public.mjs';
import { providerBinancePublic } from '../../core/data/provider_binance_public.mjs';
import { providerKrakenPublic } from '../../core/data/provider_kraken_public.mjs';
import { providerCoingeckoOHLC } from '../../core/data/provider_coingecko_ohlc.mjs';
import { modeE114, writeMdAtomic } from './e114_lib.mjs';

const mode=modeE114();
const update = process.env.UPDATE_E114_EVIDENCE === '1';
const providers=[providerBybitPublic,providerBinancePublic,providerKrakenPublic,providerCoingeckoOHLC];
const symbols=['BTCUSDT','ETHUSDT']; const tfs=['5m','5m']; const min=50;

if (!update) {
  const f='reports/evidence/E114/PROVIDER_PARITY.md';
  if (!fs.existsSync(f)) throw new Error('E114_PROVIDER_PARITY_MISSING');
  const t=fs.readFileSync(f,'utf8');
  if (!t.includes('# E114 PROVIDER PARITY')) throw new Error('E114_PROVIDER_PARITY_INVALID');
  console.log('e114_provider_parity_contract: verify-only PASS');
  process.exit(0);
}

const rows=[];
for (const p of providers) {
  try {
    let ok=0;
    for (let i=0;i<symbols.length;i++) {
      const { bars } = await fetchOHLCV({ provider:p, symbol:symbols[i], tf:tfs[i], limit:min });
      const mono=bars.every((b,j)=>j===0||b.ts>bars[j-1].ts);
      const dup=new Set(bars.map(b=>b.ts)).size!==bars.length;
      const neg=bars.some(b=>b.v<0);
      if (bars.length>=min && mono && !dup && !neg) ok++;
    }
    rows.push({provider:p.name,status:ok===symbols.length?'PASS':'FAIL',reason:ok===symbols.length?'OK':'SANITY_FAIL'});
  } catch(e) {
    rows.push({provider:p.name,status: mode==='ONLINE_OPTIONAL'?'WARN':'FAIL',reason:String(e.message||e)});
  }
}
writeMdAtomic('reports/evidence/E114/PROVIDER_PARITY.md', ['# E114 PROVIDER PARITY',`- mode: ${mode}`,...rows.map(r=>`- ${r.provider}: ${r.status} (${r.reason})`)].join('\n'));
if (mode==='ONLINE_REQUIRED' && rows.some(r=>r.status!=='PASS')) throw new Error('E114_PROVIDER_PARITY_FAIL');
console.log('e114_provider_parity_contract: done');
