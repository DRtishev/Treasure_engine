#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runE122ExecutionAdapterV3 } from '../../core/execution/e122_execution_adapter_v3.mjs';
import { modeE122, runDirE122, writeMdAtomic } from '../verify/e122_lib.mjs';

const mode = modeE122();
const limits = {
  MAX_NOTIONAL_USD: Number(process.env.MAX_NOTIONAL_USD || 25),
  MAX_TRADES_PER_DAY: Number(process.env.MAX_TRADES_PER_DAY || 1),
  COOLDOWN_SEC: Number(process.env.COOLDOWN_SEC || 60),
  MAX_SLIPPAGE_BPS: Number(process.env.MAX_SLIPPAGE_BPS || 15),
  MAX_SPREAD_BPS: Number(process.env.MAX_SPREAD_BPS || 20),
  MAX_LOSS_USD_PER_DAY: Number(process.env.MAX_LOSS_USD_PER_DAY || 5)
};
const res = await runE122ExecutionAdapterV3({ mode, symbol: process.env.E122_SYMBOL || 'BTCUSDT', limits });
fs.mkdirSync(runDirE122(), { recursive: true });
fs.writeFileSync(path.join(runDirE122(), 'E122_EXECUTION_RESULT.json'), JSON.stringify(res));
const event = { status: res.status, reason_code: res.reason_code, symbol: res.intent.symbol, side: res.intent.side, qty: res.fill?.qty || 0, price: res.fill?.price || 0, fee: res.fill?.fee || 0, ts: '2026-01-01T00:00:00Z', trade_id: 'E122-T000001' };
fs.writeFileSync(path.join(runDirE122(), 'E122_EVENTS.jsonl'), `${JSON.stringify(event)}\n`);

writeMdAtomic('reports/evidence/E122/EXECUTION_FLOW.md', [
  '# E122 EXECUTION FLOW',
  `- mode: ${mode}`,
  `- live_attempted: ${res.live_attempted}`,
  `- terminal_status: ${res.status}`,
  `- reason_code: ${res.reason_code}`,
  `- sanitized_order_ref: ${res.sanitized.order_ref}`,
  `- sanitized_client_ref: ${res.sanitized.client_ref}`,
  `- transition_count: ${res.transitions.length}`,
  `- transitions: ${res.transitions.map((x) => x.state).join('->') || 'NONE'}`,
  `- fill_qty: ${res.fill?.qty ?? 0}`,
  `- fill_price: ${res.fill?.price ?? 0}`,
  `- fill_fee: ${res.fill?.fee ?? 0}`,
  `- fill_ref: ${res.fill?.fill_ref ?? 'NONE'}`
].join('\n'));

const proofStatus = res.status === 'FILLED' ? 'PASS' : (mode === 'ONLINE_OPTIONAL' ? 'WARN' : 'FAIL');
writeMdAtomic('reports/evidence/E122/LIVE_FILL_PROOF.md', [
  '# E122 LIVE FILL PROOF',
  `- status: ${proofStatus}`,
  `- mode: ${mode}`,
  `- live_attempted: ${res.live_attempted}`,
  `- terminal_status: ${res.status}`,
  `- reason_code: ${res.reason_code}`,
  `- evidence: ${res.status === 'FILLED' ? 'order+fill+ledger_linkable' : 'ABSENT'}`
].join('\n'));

if (mode === 'ONLINE_REQUIRED' && res.status !== 'FILLED') process.exit(1);
