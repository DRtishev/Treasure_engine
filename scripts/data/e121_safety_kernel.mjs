#!/usr/bin/env node
import { writeMdAtomic } from '../verify/e121_lib.mjs';

const maxNotional = Number(process.env.MAX_NOTIONAL_USD || 25);
const maxLoss = Number(process.env.MAX_LOSS_USD_PER_DAY || 5);
const maxTrades = Number(process.env.MAX_TRADES_PER_DAY || 1);
const cooldown = Number(process.env.COOLDOWN_SEC || 60);
const maxSlippage = Number(process.env.MAX_SLIPPAGE_BPS || 15);
const maxSpread = Number(process.env.MAX_SPREAD_BPS || 20);
const breaches = [];
if (maxNotional <= 0 || maxLoss <= 0 || maxTrades <= 0) breaches.push('E_BAD_SCHEMA');

writeMdAtomic('reports/evidence/E121/LIVE_SAFETY.md', [
  '# E121 LIVE SAFETY',
  `- MAX_NOTIONAL_USD: ${maxNotional}`,
  `- MAX_LOSS_USD_PER_DAY: ${maxLoss}`,
  `- MAX_TRADES_PER_DAY: ${maxTrades}`,
  `- COOLDOWN_SEC: ${cooldown}`,
  `- MAX_SLIPPAGE_BPS: ${maxSlippage}`,
  `- MAX_SPREAD_BPS: ${maxSpread}`,
  `- status: ${breaches.length ? 'FAIL' : 'PASS'}`,
  `- reason_code: ${breaches.length ? breaches.join(',') : 'SAFE_POLICY_OK'}`
].join('\n'));
if (breaches.length) process.exit(1);
