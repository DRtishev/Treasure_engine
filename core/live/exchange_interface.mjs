// E109 Track B1: Strict Exchange Interface
// One protocol for fixture/testnet/mainnet.
// All calls log through deterministic logger. No hidden side effects.

/**
 * Exchange Interface Contract:
 *   getTime()                                → Number (epoch ms)
 *   getBalance()                             → { total, available, currency }
 *   getPrice(symbol)                         → Number
 *   placeOrder({symbol, side, type, qty, price?}) → { orderId, symbol, side, type, qty, price, status, ts }
 *   cancelAll(symbol)                        → { cancelled: Number }
 *   fetchFills(since)                        → Array<{ fillId, orderId, symbol, side, qty, price, fee, ts }>
 *   mode()                                   → 'fixture' | 'testnet' | 'mainnet'
 */

/**
 * Validate an exchange adapter implements the required interface
 * @param {Object} adapter
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateExchange(adapter) {
  const required = ['getTime', 'getBalance', 'getPrice', 'placeOrder', 'cancelAll', 'fetchFills', 'mode'];
  const errors = [];
  for (const method of required) {
    if (typeof adapter[method] !== 'function') {
      errors.push(`missing method: ${method}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Minimal deterministic logger for exchange operations
 * All operations are appended to an in-memory log (no side effects).
 */
export function createExchangeLogger() {
  const entries = [];
  return {
    log(action, data) {
      entries.push({ ts: Date.now(), action, ...data });
    },
    getEntries() { return [...entries]; },
    clear() { entries.length = 0; }
  };
}
