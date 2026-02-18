#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { mapKrakenWs } from '../../core/data/providers/kraken_ws.mjs';
import { collectWsE117 } from './e117_ws_collect_shared.mjs';

const symbol = (process.env.E117_KRAKEN_SYMBOL || 'BTC/USD').toUpperCase();
const timeframe = process.env.E117_INTERVAL || '5m';
const url = process.env.KRAKEN_WS_BASE_URL || 'wss://ws.kraken.com/v2';
const subscribe = { method: 'subscribe', params: { channel: 'ohlc', symbol: [symbol], interval: 5 } };
const r = await collectWsE117({ provider: 'kraken_ws', url, subscribe, mapper: (j) => mapKrakenWs(j, symbol, timeframe) });
const p = 'reports/evidence/E117/WS_PROVIDERS.md';
const prev = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trimEnd() : '# E117 WS PROVIDERS';
fs.writeFileSync(path.resolve(p), `${prev}\n- kraken_ws: ${r.rows > 0 ? 'PASS' : 'FAIL'} (${r.reason})\n`, 'utf8');
console.log('e117_ws_collect_kraken done');
