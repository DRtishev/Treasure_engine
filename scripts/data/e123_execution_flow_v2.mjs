#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runE122ExecutionAdapterV3 } from '../../core/execution/e122_execution_adapter_v3.mjs';
import { modeE123, runDirE123, writeMdAtomic } from '../verify/e123_lib.mjs';

const mode = modeE123();
const pre = fs.readFileSync('reports/evidence/E123/TESTNET_AUTH_PRECHECK.md','utf8');
const arming = /arming_effective:\s*true/.test(pre);
const diag = fs.readFileSync('reports/evidence/E123/CONNECTIVITY_DIAG_V2.md','utf8');
const quorum = /quorum_success:\s*true/.test(diag);
const limits = { MAX_NOTIONAL_USD:Number(process.env.MAX_NOTIONAL_USD||10), MAX_TRADES_PER_DAY:1, COOLDOWN_SEC:Number(process.env.COOLDOWN_SEC||60), MAX_SLIPPAGE_BPS:Number(process.env.MAX_SLIPPAGE_BPS||15), MAX_SPREAD_BPS:Number(process.env.MAX_SPREAD_BPS||20), MAX_LOSS_USD_PER_DAY:Number(process.env.MAX_LOSS_USD_PER_DAY||5) };
let res = { status:'SKIP', reason_code:'E_NOT_ARMED', live_attempted:false, sanitized:{order_ref:'NONE',client_ref:'NONE'}, transitions:[], intent:{symbol:'BTCUSDT',side:'BUY',order_type:'LIMIT',target_notional_usd:5}};
if (quorum && arming) {
  process.env.DRY_RUN='0';
  res = await runE122ExecutionAdapterV3({ mode:'ONLINE_REQUIRED', symbol:'BTCUSDT', limits });
}
if (!quorum) res.reason_code='E_NO_QUORUM';
const salt = crypto.createHash('sha256').update(runDirE123()).digest('hex').slice(0,16);
const hid = (x)=>crypto.createHash('sha256').update(`${x}:${salt}`).digest('hex').slice(0,20);
const flow = {
  terminal: res.status,
  reason: res.reason_code,
  order_hash: res.sanitized?.order_ref ? hid(res.sanitized.order_ref) : 'NONE',
  live_attempted: res.live_attempted,
  qty: res.fill?.qty || 0,
  price: res.fill?.price || 0,
  fee: res.fill?.fee || 0
};
fs.mkdirSync(runDirE123(), { recursive: true });
fs.writeFileSync(path.join(runDirE123(),'E123_EVENTS.jsonl'), `${JSON.stringify({status:flow.terminal,symbol:'BTCUSDT',side:'BUY',qty:flow.qty,price:flow.price,fee:flow.fee,ts:'2026-01-01T00:00:00Z',trade_id:'E123-T000001'})}\n`);
writeMdAtomic('reports/evidence/E123/EXECUTION_FLOW_V2.md',[
 '# E123 EXECUTION FLOW V2',`- terminal_status: ${flow.terminal}`,`- reason_code: ${flow.reason}`,`- live_attempted: ${flow.live_attempted}`,
 `- request_shape: {symbol,side,order_type,qty,price}`,`- response_shape: {status,order_hash,fill_qty,fill_price,fill_fee}`,
 `- order_hash: ${flow.order_hash}`,`- fill_qty: ${flow.qty}`,`- fill_price: ${flow.price}`,`- fill_fee: ${flow.fee}`,
 `- transitions: ${res.transitions.map(x=>x.state).join('->') || 'NONE'}`
].join('\n'));
if(mode==='ONLINE_REQUIRED' && flow.terminal!=='FILLED') process.exit(1);
