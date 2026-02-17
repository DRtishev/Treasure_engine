// E109 Track B2: Fixture Exchange Adapter
// Deterministic exchange driven by replayed price stream.
// Used in all tests and acceptance ritual. No network.

import { createExchangeLogger } from '../exchange_interface.mjs';

/**
 * Create a fixture exchange that replays a deterministic price stream.
 * @param {Object} opts
 * @param {number} opts.initial_balance - Starting balance in USDT (default 10000)
 * @param {number} opts.fee_bps - Fee in basis points (default 4)
 * @param {number} opts.slip_bps - Slippage in basis points (default 2)
 * @returns {Object} Exchange adapter + feed control
 */
export function createFixtureExchange(opts = {}) {
  const initial_balance = opts.initial_balance || 10000;
  const fee_bps = opts.fee_bps || 4;
  const slip_bps = opts.slip_bps || 2;

  const logger = createExchangeLogger();
  let balance = initial_balance;
  let available = initial_balance;
  const positions = {}; // symbol -> { qty, avg_price }
  const fills = [];
  const orders = [];
  let orderSeq = 0;
  let currentTime = 0;
  const prices = {}; // symbol -> latest price
  let peakEquity = initial_balance;
  let maxDrawdown = 0;

  function computeEquity() {
    let eq = balance;
    for (const [sym, pos] of Object.entries(positions)) {
      if (pos.qty !== 0 && prices[sym]) {
        eq += pos.qty * prices[sym];
      }
    }
    return eq;
  }

  function updateDrawdown() {
    const eq = computeEquity();
    if (eq > peakEquity) peakEquity = eq;
    const dd = peakEquity > 0 ? (peakEquity - eq) / peakEquity : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const adapter = {
    // Feed a bar to update current price state
    feedBar(bar) {
      currentTime = bar.ts_close || bar.ts_open;
      prices[bar.symbol || 'BTCUSDT'] = bar.close;
      updateDrawdown();
    },

    getTime() {
      return currentTime;
    },

    getBalance() {
      return { total: computeEquity(), available, currency: 'USDT' };
    },

    getPrice(symbol) {
      if (!prices[symbol]) throw new Error(`No price for ${symbol}`);
      return prices[symbol];
    },

    placeOrder({ symbol, side, type, qty, price }) {
      const currentPrice = prices[symbol];
      if (!currentPrice) throw new Error(`No price for ${symbol}`);

      orderSeq++;
      const orderId = `FIX${String(orderSeq).padStart(6, '0')}`;

      // Deterministic fill model: immediate fill at market
      const slippage = currentPrice * (slip_bps / 10000);
      const execPrice = side === 'BUY' ? currentPrice + slippage : currentPrice - slippage;
      const fee = qty * execPrice * (fee_bps / 10000);
      const cost = qty * execPrice;

      if (side === 'BUY') {
        if (cost + fee > available) {
          logger.log('ORDER_REJECTED', { orderId, reason: 'INSUFFICIENT_BALANCE', needed: cost + fee, available });
          return { orderId, symbol, side, type, qty, price: currentPrice, status: 'REJECTED', ts: currentTime };
        }
        balance -= (cost + fee);
        available -= (cost + fee);
        if (!positions[symbol]) positions[symbol] = { qty: 0, avg_price: 0 };
        const pos = positions[symbol];
        const totalQty = pos.qty + qty;
        pos.avg_price = totalQty > 0 ? (pos.avg_price * pos.qty + execPrice * qty) / totalQty : 0;
        pos.qty = totalQty;
      } else {
        // SELL
        if (!positions[symbol] || positions[symbol].qty < qty) {
          logger.log('ORDER_REJECTED', { orderId, reason: 'INSUFFICIENT_POSITION', needed: qty, held: positions[symbol]?.qty || 0 });
          return { orderId, symbol, side, type, qty, price: currentPrice, status: 'REJECTED', ts: currentTime };
        }
        const revenue = cost - fee;
        balance += revenue;
        available += revenue;
        positions[symbol].qty -= qty;
        if (positions[symbol].qty === 0) positions[symbol].avg_price = 0;
      }

      const fill = {
        fillId: orderId,
        orderId,
        symbol,
        side,
        qty,
        price: execPrice,
        fee,
        ts: currentTime
      };
      fills.push(fill);
      orders.push({ orderId, symbol, side, type, qty, price: currentPrice, execPrice, fee, status: 'FILLED', ts: currentTime });

      logger.log('FILL', fill);
      updateDrawdown();

      return { orderId, symbol, side, type, qty, price: execPrice, status: 'FILLED', ts: currentTime };
    },

    cancelAll(symbol) {
      // Fixture exchange fills immediately, so nothing to cancel
      logger.log('CANCEL_ALL', { symbol, cancelled: 0 });
      return { cancelled: 0 };
    },

    fetchFills(since = 0) {
      return fills.filter(f => f.ts >= since);
    },

    mode() {
      return 'fixture';
    },

    // Extra methods for reporting
    getPositions() { return { ...positions }; },
    getMaxDrawdown() { return maxDrawdown; },
    getLogger() { return logger; },
    getFills() { return [...fills]; },
    getInitialBalance() { return initial_balance; },
    getPeakEquity() { return peakEquity; }
  };

  return adapter;
}
