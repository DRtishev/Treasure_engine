#!/usr/bin/env node
import fs from 'node:fs';
import { sha256Text } from '../verify/e66_lib.mjs';
import { writeMdAtomic } from '../verify/e115_lib.mjs';

const fixtures = [
  ['bybit', '.foundation-seal/fixtures/providers/bybit/klines_sample.json', (j) => (j.result?.list||[]).map(x=>({ts:Number(x[0]),o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[5])}))],
  ['binance', '.foundation-seal/fixtures/providers/binance/klines_sample.json', (j) => (Array.isArray(j)?j:[]).map(x=>({ts:Number(x[0]),o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[5])}))],
  ['kraken', '.foundation-seal/fixtures/providers/kraken/ohlc_sample.json', (j) => (j.result?.XXBTZUSD||[]).map(x=>({ts:Number(x[0])*1000,o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[6])}))],
  ['coingecko', '.foundation-seal/fixtures/providers/coingecko/ohlc_sample.json', (j) => (Array.isArray(j)?j:[]).map(x=>({ts:Number(x[0]),o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:0}))]
];
const rows=[];
for (const [name, p, parser] of fixtures) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const bars = parser(j);
  const ok = bars.length>0 && bars.every((b,i)=> i===0 || b.ts>bars[i-1].ts) && bars.every(b=>b.v>=0);
  rows.push({name, ok, count: bars.length, hash: sha256Text(bars.map(b=>JSON.stringify(b)).join('\n'))});
}
writeMdAtomic('reports/evidence/E115/PROVIDER_FIXTURES.md', ['# E115 PROVIDER FIXTURES', ...rows.map(r=>`- ${r.name}: ${r.ok?'PASS':'FAIL'} count=${r.count} hash=${r.hash}`)].join('\n'));
if (rows.some(r=>!r.ok)) throw new Error('E115_FIXTURE_CONFORMANCE_FAIL');
console.log('e115_adapter_fixture_runner: PASS');
