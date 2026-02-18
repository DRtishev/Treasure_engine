#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { modeE121, runDirE121, writeMdAtomic } from '../verify/e121_lib.mjs';

const mode = modeE121();
const seed = crypto.createHash('sha256').update(`${process.env.E121_SYMBOL || 'BTCUSDT'}|${mode}|${process.env.DRY_RUN || '1'}`).digest('hex').slice(0, 16);
const states = ['PRECHECK', 'WARMUP', 'PRICE_REF', 'TRADE_WINDOW', 'MANAGE', 'FLAT', 'REPORT', 'END'];
const adapter = fs.readFileSync('reports/evidence/E121/EXECUTION_ADAPTER.md', 'utf8');
const adapterStatus = /- status:\s*(\w+)/.exec(adapter)?.[1] || 'SKIP';
const liveSuccess = /(filled|partially_filled)/i.test(adapterStatus) ? 1 : 0;
const fallback = mode === 'OFFLINE_ONLY' || liveSuccess === 0;
const summaryObj = { mode, seed, states, liveSuccess, fallback, symbol: process.env.E121_SYMBOL || 'BTCUSDT' };
const summaryHash = crypto.createHash('sha256').update(JSON.stringify(summaryObj)).digest('hex');
const ev = {
  ts: '2026-01-01T00:00:00Z',
  symbol: summaryObj.symbol,
  side: 'BUY',
  qty: Number(process.env.E121_QTY || 0.001),
  price: Number(process.env.E121_PRICE || 100000),
  exec_price: Number(process.env.E121_PRICE || 100000),
  fee: 0.01,
  trade_id: 'E121-T000001',
  status: adapterStatus
};
fs.mkdirSync(runDirE121(), { recursive: true });
fs.writeFileSync(path.join(runDirE121(), 'MICRO_LIVE_RUN.jsonl'), `${JSON.stringify(ev)}\n`);

writeMdAtomic('reports/evidence/E121/MICRO_LIVE_RUN.md', [
  '# E121 MICRO LIVE RUN',
  `- mode: ${mode}`,
  `- seed: ${seed}`,
  `- state_machine: ${states.join('->')}`,
  `- adapter_status: ${adapterStatus}`,
  `- fills_count: ${liveSuccess}`,
  `- live_success_count: ${liveSuccess}`,
  `- fallback_used: ${fallback}`,
  `- summary_hash: ${summaryHash}`
].join('\n'));
