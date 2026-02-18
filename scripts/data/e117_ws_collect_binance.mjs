#!/usr/bin/env node
import { mapBinanceWs } from '../../core/data/providers/binance_ws.mjs';
import { collectWsE117 } from './e117_ws_collect_shared.mjs';
import { writeMdAtomic } from '../verify/e117_lib.mjs';

const symbol = (process.env.E117_SYMBOL || 'btcusdt').toLowerCase();
const timeframe = process.env.E117_INTERVAL || '5m';
const url = `${process.env.BINANCE_WS_BASE_URL || 'wss://stream.binance.com:9443/ws'}/${symbol}@kline_${timeframe}`;
const r = await collectWsE117({ provider: 'binance_ws', url, mapper: (j) => mapBinanceWs(j, symbol.toUpperCase(), timeframe) });
writeMdAtomic('reports/evidence/E117/WS_PROVIDERS.md', `# E117 WS PROVIDERS\n- binance_ws: ${r.rows > 0 ? 'PASS' : 'FAIL'} (${r.reason})`);
console.log('e117_ws_collect_binance done');
