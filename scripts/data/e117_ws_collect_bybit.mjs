#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { mapBybitWs } from '../../core/data/providers/bybit_ws.mjs';
import { collectWsE117 } from './e117_ws_collect_shared.mjs';

const symbol = (process.env.E117_SYMBOL || 'BTCUSDT').toUpperCase();
const timeframe = process.env.E117_INTERVAL || '5';
const url = process.env.BYBIT_WS_BASE_URL || 'wss://stream.bybit.com/v5/public/linear';
const subscribe = { op: 'subscribe', args: [`kline.${timeframe}.${symbol}`] };
const r = await collectWsE117({ provider: 'bybit_ws', url, subscribe, mapper: (j) => mapBybitWs(j, symbol, timeframe) });
const p = 'reports/evidence/E117/WS_PROVIDERS.md';
const prev = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trimEnd() : '# E117 WS PROVIDERS';
fs.writeFileSync(path.resolve(p), `${prev}\n- bybit_ws: ${r.rows > 0 ? 'PASS' : 'FAIL'} (${r.reason})\n`, 'utf8');
console.log('e117_ws_collect_bybit done');
