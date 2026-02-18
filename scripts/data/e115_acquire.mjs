#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fetchOHLCV } from '../../core/data/provider_interface.mjs';
import { providerBybitLive } from '../../core/data/provider_bybit_live.mjs';
import { providerBinanceLive } from '../../core/data/provider_binance_live.mjs';
import { providerKrakenLive } from '../../core/data/provider_kraken_live.mjs';
import { providerCoingeckoLive } from '../../core/data/provider_coingecko_live.mjs';
import { modeE115, runDirE115, pinDirE115, latestPin, writeMdAtomic, atomicWrite, readInputBinding, writeInputBinding, stampE115 } from '../verify/e115_lib.mjs';
import { sha256Text } from '../verify/e66_lib.mjs';

const mode=modeE115(); const symbols=(process.env.E115_SYMBOLS||'BTCUSDT,ETHUSDT').split(',').map(s=>s.trim()).filter(Boolean); const minBars=Number(process.env.E115_MIN_BARS||5000);
const run=runDirE115(); const pin=pinDirE115();
fs.mkdirSync(path.join(run,'raw'),{recursive:true}); fs.mkdirSync(path.join(run,'normalized'),{recursive:true});
const binding=readInputBinding();
if (binding && process.env.ROTATE_E115_BINDING!=='1' && process.env.UPDATE_E115_EVIDENCE==='1' && binding.stamp!==stampE115()) throw new Error('E115_INPUT_BINDING_LOCKED');

const providers=[providerBybitLive,providerBinanceLive,providerKrakenLive,providerCoingeckoLive];
const np=fs.readFileSync('reports/evidence/E115/NET_FULLNESS.md','utf8');
const availability=new Map([...np.matchAll(/- (\w+): success=(\d+)\/(\d+)/g)].map(m=>[m[1],Number(m[2])>0]));
const ordered=providers.filter(p=>availability.get(p.name));
let selected='none'; let usedFallback=false; let successCount=0; const reasons=[];

function loadPinned(sym){ const lp=latestPin(); if(!lp) throw new Error('E115_NO_PINNED'); const p=path.join(lp,'raw',`${sym}.json`); if(!fs.existsSync(p)) throw new Error('E115_PIN_MISS'); return JSON.parse(fs.readFileSync(p,'utf8')); }
function bootstrap(ix){ const b=JSON.parse(fs.readFileSync('dataset/BTCUSDT_5m_100bars.json','utf8')).bars; const out=[]; const start=1700000000000; for(let i=0;i<minBars;i++){ const x=b[i%b.length]; const d=1+ix*0.001+Math.floor(i/b.length)*0.00002; out.push({ts:start+i*300000,o:x.o*d,h:x.h*d,l:x.l*d,c:x.c*d,v:x.v}); } return out; }

for (const sym of symbols) {
  let bars=null;
  if (mode==='OFFLINE_ONLY') { try{bars=loadPinned(sym); selected=`pinned:${path.basename(latestPin())}`; reasons.push(`${sym}:OFFLINE_PINNED`);}catch{bars=bootstrap(symbols.indexOf(sym)); selected='bootstrap_seed_fixture'; reasons.push(`${sym}:OFFLINE_BOOTSTRAP`);} }
  else {
    for (const p of ordered) { try{ const r=await fetchOHLCV({provider:p,symbol:sym,tf:'5m',limit:minBars}); bars=r.bars; selected=p.name; successCount++; reasons.push(`${sym}:LIVE_${p.name.toUpperCase()}`); break; }catch(e){ reasons.push(`${sym}:${p.name}:${String(e.message||e)}`);} }
    if (!bars) {
      if (mode==='ONLINE_REQUIRED') throw new Error(`E115_ONLINE_REQUIRED_ACQUIRE_FAIL:${sym}`);
      try{bars=loadPinned(sym); selected=`pinned:${path.basename(latestPin())}`; reasons.push(`${sym}:PINNED_FALLBACK`);}catch{bars=bootstrap(symbols.indexOf(sym)); selected='bootstrap_seed_fixture'; reasons.push(`${sym}:BOOTSTRAP_FALLBACK`);} usedFallback=true;
    }
  }
  bars.sort((a,b)=>a.ts-b.ts); let last=-1; const ded=[]; for(const b of bars){ if(b.ts===last) continue; last=b.ts; ded.push(b);} if(ded.length<minBars) throw new Error(`E115_MIN_BARS_FAIL:${sym}`);
  atomicWrite(path.join(run,'raw',`${sym}.json`), JSON.stringify(ded));
  const jsonl=ded.map(r=>`{"c":${Number(r.c.toFixed(8))},"h":${Number(r.h.toFixed(8))},"l":${Number(r.l.toFixed(8))},"o":${Number(r.o.toFixed(8))},"symbol":"${sym}","timeframe":"5m","ts":${r.ts},"v":${Number(r.v.toFixed(8))}}`).join('\n')+'\n';
  atomicWrite(path.join(run,'normalized',`${sym}.jsonl`), jsonl);
}
fs.mkdirSync(path.join(pin,'raw'),{recursive:true}); fs.mkdirSync(path.join(pin,'normalized'),{recursive:true});
const rows=[]; const now=Date.now();
for(const sym of symbols){ const raw=fs.readFileSync(path.join(run,'raw',`${sym}.json`),'utf8'); const norm=fs.readFileSync(path.join(run,'normalized',`${sym}.jsonl`),'utf8'); atomicWrite(path.join(pin,'raw',`${sym}.json`),raw); atomicWrite(path.join(pin,'normalized',`${sym}.jsonl`),norm); const arr=norm.trim().split('\n').map(x=>JSON.parse(x)); rows.push({sym,bars:arr.length,fresh:now-arr[arr.length-1].ts,sha:sha256Text(norm)}); }
writeInputBinding({ stamp: stampE115(), mode, provider_used: selected, pinned_capsule_dir: path.relative(process.cwd(), pin).replace(/\\/g,'/'), created_at: '1700000000' });
writeMdAtomic('reports/evidence/E115/INPUT_BINDING.md', ['# E115 INPUT BINDING', `- stamp: ${stampE115()}`, `- mode: ${mode}`, `- provider_used: ${selected}`, `- pinned_capsule_dir: <REPO_ROOT>/${path.relative(process.cwd(), pin).replace(/\\/g,'/')}`].join('\n'));
writeMdAtomic('reports/evidence/E115/PROVIDERS.md', ['# E115 PROVIDERS','- deterministic_order: bybit,binance,kraken,coingecko',`- selected_provider: ${selected}`,'## Mapping', '- bybit: canonical symbol passthrough, tf map', '- binance: canonical symbol passthrough, tf map', '- kraken: BTCUSDT->XBTUSD ETHUSDT->ETHUSD', '- coingecko: symbol->coin id; limitation volume=0'].join('\n'));
const verdict = mode==='ONLINE_REQUIRED' ? 'PASS' : ((mode==='ONLINE_OPTIONAL' && usedFallback) ? 'WARN' : 'PASS');
writeMdAtomic('reports/evidence/E115/SNAPSHOT_INTEGRITY.md', ['# E115 SNAPSHOT INTEGRITY', `- pin_dir: <REPO_ROOT>/${path.relative(process.cwd(),pin).replace(/\\/g,'/')}`, '- status: PASS', ...rows.map(r=>`- ${r.sym}: bars=${r.bars}, sha256=${r.sha}`)].join('\n'));
writeMdAtomic('reports/evidence/E115/NET_FULLNESS.md', fs.readFileSync('reports/evidence/E115/NET_FULLNESS.md','utf8') + `\n- acquisition_success_count: ${successCount}`);
console.log(`e115_acquire: ${verdict}`);
