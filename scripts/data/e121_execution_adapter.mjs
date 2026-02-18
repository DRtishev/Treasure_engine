#!/usr/bin/env node
import { createBybitExchange } from '../../core/live/exchanges/bybit_rest_testnet.mjs';
import { modeE121, writeMdAtomic } from '../verify/e121_lib.mjs';

const mode = modeE121();
const venue = 'BYBIT_TESTNET';
const dryRun = process.env.DRY_RUN === '0' ? false : true;
const canLive = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1' && process.env.LIVE_PLACE_ORDER === '1' && mode === 'ONLINE_REQUIRED';

let reason = 'DRY_RUN_DEFAULT';
let normalized = {
  status: 'SKIP', symbol: process.env.E121_SYMBOL || 'BTCUSDT', side: 'BUY', qty: Number(process.env.E121_QTY || 0.001),
  price: Number(process.env.E121_PRICE || 0), order_type: 'LIMIT', ts_bucket: new Date('2026-01-01T00:00:00Z').toISOString(), venue,
  reason_codes: ['E121_DRY_RUN']
};

if (mode === 'ONLINE_REQUIRED' && !canLive) reason = 'E121_ONLINE_REQUIRED_GATES_MISSING';
if (mode !== 'ONLINE_REQUIRED' && process.env.LIVE_PLACE_ORDER === '1') reason = 'E121_LIVE_FORBIDDEN_IN_OPTIONAL_OR_OFFLINE';
if (process.env.FORCE_NET_DOWN === '1') reason = 'E121_PROVIDER_UNAVAILABLE';

if (canLive && !dryRun && process.env.FORCE_NET_DOWN !== '1') {
  try {
    const adapter = createBybitExchange({ mode: 'testnet', dryRun: false });
    const symbol = process.env.E121_SYMBOL || 'BTCUSDT';
    const qty = Number(process.env.E121_QTY || 0.001);
    const price = Number(process.env.E121_PRICE || await adapter.getPrice(symbol));
    const r = await adapter.placeOrder({ symbol, side: 'BUY', type: 'LIMIT', qty, price });
    normalized = {
      status: /fill/i.test(String(r.status || '')) ? 'filled' : (r.status || 'submitted').toLowerCase(),
      symbol,
      side: 'BUY',
      qty,
      price,
      order_type: 'LIMIT',
      ts_bucket: new Date(Math.floor(Number(r.ts || Date.now()) / 60000) * 60000).toISOString(),
      venue,
      reason_codes: ['LIVE_ORDER_ATTEMPTED']
    };
    reason = 'E121_TESTNET_ORDER_ATTEMPTED';
  } catch {
    reason = 'E121_PROVIDER_UNAVAILABLE';
    normalized.reason_codes = [reason];
  }
}

writeMdAtomic('reports/evidence/E121/EXECUTION_ADAPTER.md', [
  '# E121 EXECUTION ADAPTER',
  `- mode: ${mode}`,
  `- venue: ${venue}`,
  `- dry_run: ${dryRun}`,
  `- live_allowed: ${canLive}`,
  `- reason_code: ${reason}`,
  `- status: ${normalized.status}`,
  `- symbol: ${normalized.symbol}`,
  `- side: ${normalized.side}`,
  `- qty: ${normalized.qty}`,
  `- price: ${normalized.price}`,
  `- order_type: ${normalized.order_type}`,
  `- ts_bucket: ${normalized.ts_bucket}`,
  `- reason_codes: ${normalized.reason_codes.join(',')}`
].join('\n'));

if (mode === 'ONLINE_REQUIRED' && (reason === 'E121_ONLINE_REQUIRED_GATES_MISSING' || reason === 'E121_PROVIDER_UNAVAILABLE')) process.exit(1);
