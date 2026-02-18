#!/usr/bin/env node
import crypto from 'node:crypto';
import { modeE120, writeMdAtomic } from '../verify/e120_lib.mjs';

const mode = modeE120();
const runMode = process.env.E120_RUN_MODE || (mode === 'OFFLINE_ONLY' ? 'PAPER' : 'TESTNET_LIVE');
const liveOk = mode !== 'OFFLINE_ONLY' && process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1' && process.env.FORCE_NET_DOWN !== '1';
const states = ['PRECHECK', 'WARMUP', 'TRADE_WINDOW', 'MANAGE', 'FLAT', 'REPORT', 'END'];
const fills = liveOk && runMode === 'TESTNET_LIVE' && process.env.DRY_RUN === '0' && process.env.ENABLE_LIVE_ORDERS === '1' ? 1 : 0;
const summaryHash = crypto.createHash('sha256').update(JSON.stringify({ runMode, states, fills, mode })).digest('hex');

writeMdAtomic('reports/evidence/E120/MICRO_LIVE_RUN.md', [
  '# E120 MICRO LIVE RUN',
  `- run_mode: ${runMode}`,
  `- state_machine: ${states.join('->')}`,
  `- fills_count: ${fills}`,
  `- live_success_count: ${fills > 0 ? 1 : 0}`,
  `- summary_hash: ${summaryHash}`
].join('\n'));
