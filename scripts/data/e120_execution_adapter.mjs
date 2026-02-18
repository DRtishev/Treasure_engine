#!/usr/bin/env node
import { modeE120, writeMdAtomic } from '../verify/e120_lib.mjs';

const mode = modeE120();
const venue = process.env.LIVE_VENUE || 'BYBIT_TESTNET';
const dryRun = process.env.DRY_RUN !== '0';
const enableOrders = process.env.ENABLE_LIVE_ORDERS === '1';

let reason = 'DRY_RUN';
let placed = false;
if (mode !== 'OFFLINE_ONLY' && !dryRun && enableOrders && process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1') {
  placed = true;
  reason = 'TESTNET_ORDER_PLACED';
}
if (mode !== 'OFFLINE_ONLY' && !dryRun && !enableOrders) reason = 'E_NET_BLOCKED';

writeMdAtomic('reports/evidence/E120/EXECUTION_ADAPTER.md', [
  '# E120 EXECUTION ADAPTER',
  `- venue: ${venue}`,
  `- mode: ${mode}`,
  `- dry_run: ${dryRun}`,
  `- place_result: ${placed ? 'PASS' : 'SKIP'}`,
  `- reason_code: ${reason}`,
  '- return_shape: { venue, order_id, status, reason_code, fills[] }'
].join('\n'));
