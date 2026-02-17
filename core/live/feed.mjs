#!/usr/bin/env node
// E107 Track 3: Live Feed Abstraction
// WebSocket/poll feed for real-time market data
// Network access ONLY behind ENABLE_NET=1

/**
 * Feed modes:
 * - 'fixture': replay from fixture data (no network, for tests)
 * - 'live': real websocket/poll (requires ENABLE_NET=1)
 */

/**
 * Create a fixture feed from pre-loaded candle data
 * @param {Array} candles - Array of candle objects [{ts_open, open, high, low, close, volume, symbol}]
 * @param {Object} opts - { interval_ms: simulated delay between candles }
 * @returns {Object} Feed interface { next(), peek(), hasMore(), reset(), mode }
 */
export function createFixtureFeed(candles, opts = {}) {
  const sorted = candles.slice().sort((a, b) => {
    const ta = typeof a.ts_open === 'string' ? new Date(a.ts_open).getTime() : a.ts_open;
    const tb = typeof b.ts_open === 'string' ? new Date(b.ts_open).getTime() : b.ts_open;
    return ta - tb;
  });

  let cursor = 0;

  return {
    mode: 'fixture',

    next() {
      if (cursor >= sorted.length) return null;
      const candle = sorted[cursor];
      cursor++;
      return {
        type: 'candle',
        symbol: candle.symbol || 'BTCUSDT',
        ts: candle.ts_open,
        price: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      };
    },

    peek() {
      if (cursor >= sorted.length) return null;
      const candle = sorted[cursor];
      return {
        type: 'candle',
        symbol: candle.symbol || 'BTCUSDT',
        ts: candle.ts_open,
        price: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      };
    },

    hasMore() {
      return cursor < sorted.length;
    },

    reset() {
      cursor = 0;
    },

    length() {
      return sorted.length;
    },

    consumed() {
      return cursor;
    }
  };
}

/**
 * Create a live feed (network-dependent)
 * Only allowed behind ENABLE_NET=1
 * @param {Object} opts - { symbol, interval, wsUrl }
 * @returns {Object} Feed interface
 */
export function createLiveFeed(opts = {}) {
  if (process.env.ENABLE_NET !== '1') {
    throw new Error('createLiveFeed requires ENABLE_NET=1');
  }

  const symbol = opts.symbol || 'BTCUSDT';
  const interval = opts.interval || '1m';
  const buffer = [];
  let closed = false;

  return {
    mode: 'live',
    symbol,
    interval,

    /**
     * Push a candle into the buffer (used by websocket callback)
     */
    push(candle) {
      if (closed) return;
      buffer.push({
        type: 'candle',
        symbol: candle.symbol || symbol,
        ts: candle.ts || new Date().toISOString(),
        price: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      });
    },

    next() {
      return buffer.length > 0 ? buffer.shift() : null;
    },

    peek() {
      return buffer.length > 0 ? buffer[0] : null;
    },

    hasMore() {
      return buffer.length > 0 || !closed;
    },

    close() {
      closed = true;
    },

    isClosed() {
      return closed;
    },

    bufferSize() {
      return buffer.length;
    }
  };
}
