#!/usr/bin/env node
// scripts/data/fetch_binance_history.mjs
// CLI tool for operators to fetch historical klines from Binance
// Usage: node scripts/data/fetch_binance_history.mjs BTCUSDT 5m 1000 [output.json]

import fs from 'fs';
import path from 'path';
import { BinanceFetcher } from './binance_fetcher.mjs';
import { assertNetworkAllowed } from '../../core/net/network_guard.mjs';

function die(msg) {
  console.error('[fetch:binance] ERROR: ' + msg);
  process.exit(1);
}

function usage() {
  console.log(`
Usage: node scripts/data/fetch_binance_history.mjs <symbol> <interval> <bars> [output]

Arguments:
  symbol      Trading pair (e.g., BTCUSDT, ETHUSDT)
  interval    Timeframe: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
  bars        Number of bars to fetch (1-10000)
  output      Output file path (default: data/<symbol>_<interval>_<bars>.json)

Examples:
  npm run data:fetch:binance BTCUSDT 5m 1000
  npm run data:fetch:binance ETHUSDT 1h 2000 data/eth_1h_2000.json

Environment:
  BINANCE_API_KEY     Optional API key (not required for public klines)
  BINANCE_VERBOSE     Set to '1' for detailed logging
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage();
  }

  try {
    assertNetworkAllowed('binance');
  } catch (err) {
    die(`network blocked by policy flags (${err.code || err.message})`);
  }

  const symbol = args[0];
  const interval = args[1];
  const barsCount = parseInt(args[2], 10);
  const outputPath = args[3] || `data/${symbol.toLowerCase()}_${interval}_${barsCount}.json`;

  // Validation
  if (!symbol || !interval || !barsCount) {
    die('Missing required arguments. Use --help for usage.');
  }

  if (!Number.isFinite(barsCount) || barsCount < 1 || barsCount > 10000) {
    die('Bars count must be between 1 and 10000');
  }

  const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  if (!validIntervals.includes(interval)) {
    die(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    console.log(`[fetch:binance] Creating directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[fetch:binance] BINANCE HISTORICAL DATA FETCH`);
  console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[fetch:binance] Symbol:   ${symbol}`);
  console.log(`[fetch:binance] Interval: ${interval}`);
  console.log(`[fetch:binance] Bars:     ${barsCount}`);
  console.log(`[fetch:binance] Output:   ${outputPath}`);
  console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const startTime = Date.now();

  try {
    // Create fetcher instance
    const fetcher = new BinanceFetcher({
      apiKey: process.env.BINANCE_API_KEY,
      verbose: process.env.BINANCE_VERBOSE === '1'
    });

    // Test connection first
    console.log(`[fetch:binance] Testing connection...`);
    const serverTime = await fetcher.getServerTime();
    const serverDate = new Date(serverTime).toISOString();
    console.log(`[fetch:binance] ✓ Connected to Binance (server time: ${serverDate})`);

    // Fetch klines
    console.log(`[fetch:binance] Fetching ${barsCount} bars...`);
    const klines = await fetcher.fetchKlinesBatched(symbol, interval, barsCount);

    if (klines.length === 0) {
      die('No klines returned from Binance');
    }

    console.log(`[fetch:binance] ✓ Fetched ${klines.length} bars`);

    // Convert to Treasure Engine format
    const bars = [];
    for (let i = 0; i < klines.length; i++) {
      const k = klines[i];
      const t_ms = Number(k[0]); // openTime
      const o = Number(k[1]);
      const h = Number(k[2]);
      const l = Number(k[3]);
      const c = Number(k[4]);
      const v = Number(k[5]);

      if (!Number.isFinite(t_ms) || !Number.isFinite(o) || !Number.isFinite(h) || 
          !Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(v)) {
        console.warn(`[fetch:binance] WARNING: Invalid bar at index ${i}, skipping`);
        continue;
      }

      bars.push({ t_ms, o, h, l, c, v });
    }

    if (bars.length < 10) {
      die(`Too few valid bars: ${bars.length} (expected ~${barsCount})`);
    }

    // Create dataset with metadata
    const dataset = {
      meta: {
        source: 'REAL',
        provider: 'BINANCE',
        symbol,
        timeframe: interval,
        fetched_at: new Date().toISOString(),
        fetched_by: 'scripts/data/fetch_binance_history.mjs',
        server_time: serverDate,
        requested_bars: barsCount,
        actual_bars: bars.length,
        disclaimer: 'REAL DATA: Historical klines from Binance. Validate fees, latency, slippage, and orderbook behavior separately. Past performance does not guarantee future results.',
        seed: 0
      },
      bars
    };

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const firstBar = new Date(bars[0].t_ms).toISOString();
    const lastBar = new Date(bars[bars.length - 1].t_ms).toISOString();

    console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[fetch:binance] ✓ SUCCESS`);
    console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[fetch:binance] Output:      ${outputPath}`);
    console.log(`[fetch:binance] Bars saved:  ${bars.length}`);
    console.log(`[fetch:binance] Time range:  ${firstBar} → ${lastBar}`);
    console.log(`[fetch:binance] Elapsed:     ${elapsed}s`);
    console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[fetch:binance] Next steps:`);
    console.log(`[fetch:binance]   1. Validate: npm run verify:dataset -- ${outputPath}`);
    console.log(`[fetch:binance]   2. Run sim:  DATASET_PATH=${outputPath} npm run verify:e2`);
    console.log(`[fetch:binance]   3. View UI:  open ui/panel.html`);
    console.log(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Show fetcher status
    const status = fetcher.getStatus();
    console.log(`[fetch:binance] Fetcher status: circuit=${status.circuitState}, requests=${status.requestsInLastMinute}, weight=${status.totalWeight}`);

  } catch (err) {
    console.error(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`[fetch:binance] ✗ FAILED`);
    console.error(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`[fetch:binance] Error: ${err.message}`);
    console.error(`[fetch:binance] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (err.stack) {
      console.error(err.stack);
    }
    
    process.exit(1);
  }
}

main();
