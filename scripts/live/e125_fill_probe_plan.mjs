#!/usr/bin/env node
import crypto from 'node:crypto'; import { runDirE125, writeMdAtomic } from '../verify/e125_lib.mjs';
const N=Number(process.env.N_ATTEMPTS||3); const stop=process.env.STOP_ON_FIRST_FILL==='0'?0:1; const salt=crypto.createHash('sha256').update(runDirE125()).digest('hex').slice(0,16);
const lines=['# E125 FILL PROBE PLAN',`- N_ATTEMPTS: ${N}`,`- STOP_ON_FIRST_FILL: ${stop}`,`- MAX_NOTIONAL_USD: ${Number(process.env.MAX_NOTIONAL_USD||3)}`,'| index | attempt_id | provider | symbol | side | order_type | qty | caps |','|---:|---|---|---|---|---|---:|---|'];
for(let i=0;i<N;i++){const id=crypto.createHash('sha256').update(`${salt}|${i}|BYBIT|BTCUSDT|1m`).digest('hex').slice(0,16); lines.push(`| ${i} | ${id} | BYBIT_TESTNET | BTCUSDT | BUY | MARKET | 0.0001 | max_notional<=${Number(process.env.MAX_NOTIONAL_USD||3)} |`);} 
writeMdAtomic('reports/evidence/E125/FILL_PROBE_PLAN.md',lines.join('\n'));
