#!/usr/bin/env node
// core/exec/adapters/iexecution_adapter.mjs
// Execution adapter contract - abstraction layer for order execution
// Enables switching between paper trading, live trading, backtesting, etc.

/**
 * IExecutionAdapter - Interface for order execution backends
 * 
 * All implementations must provide deterministic order_id generation
 * and support context-based execution (run_id, hack_id, mode, etc.)
 */
export class IExecutionAdapter {
  /**
   * Get adapter name for logging/debugging
   * @returns {string} Adapter name
   */
  getName() {
    throw new Error('IExecutionAdapter.getName() must be implemented');
  }

  /**
   * Place an order intent
   * @param {Object} intent - Order intent
   * @param {string} intent.side - 'BUY' or 'SELL'
   * @param {number} intent.size - Order size
   * @param {number} intent.price - Target price
   * @param {string} intent.type - 'MARKET' or 'LIMIT'
   * @param {Object} ctx - Execution context
   * @param {string} ctx.run_id - Run identifier
   * @param {string} ctx.hack_id - Hack identifier
   * @param {string} ctx.mode - Trading mode
   * @param {number} ctx.bar_idx - Bar index
   * @param {number} ctx.order_seq - Order sequence number
   * @param {Object} ctx.bar - Current bar data
   * @returns {Promise<Object>} { order_id, status, timestamp }
   */
  async placeOrder(intent, ctx) {
    throw new Error('IExecutionAdapter.placeOrder() must be implemented');
  }

  /**
   * Poll order status
   * @param {string} order_id - Order identifier
   * @param {Object} ctx - Execution context
   * @returns {Promise<Object>} { filled, filled_price, fee, slippage, timestamp }
   */
  async pollOrder(order_id, ctx) {
    throw new Error('IExecutionAdapter.pollOrder() must be implemented');
  }

  /**
   * Cancel an order
   * @param {string} order_id - Order identifier
   * @param {Object} ctx - Execution context
   * @returns {Promise<Object>} { canceled, reason, timestamp }
   */
  async cancelOrder(order_id, ctx) {
    throw new Error('IExecutionAdapter.cancelOrder() must be implemented');
  }

  /**
   * Get adapter statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      adapter: this.getName(),
      orders_placed: 0,
      orders_filled: 0,
      orders_canceled: 0
    };
  }
}

/**
 * Validate execution intent
 * @param {Object} intent - Order intent
 * @throws {Error} If intent is invalid
 */
export function validateIntent(intent) {
  if (!intent) {
    throw new Error('Intent is required');
  }

  // Validate side
  if (!['BUY', 'SELL'].includes(intent.side)) {
    throw new Error(`Invalid side: ${intent.side}. Must be BUY or SELL`);
  }

  // Validate size
  if (!Number.isFinite(intent.size) || intent.size <= 0) {
    throw new Error(`Invalid size: ${intent.size}. Must be positive finite number`);
  }

  // Validate price
  if (!Number.isFinite(intent.price) || intent.price <= 0) {
    throw new Error(`Invalid price: ${intent.price}. Must be positive finite number`);
  }

  // Validate type
  if (!['MARKET', 'LIMIT'].includes(intent.type)) {
    throw new Error(`Invalid type: ${intent.type}. Must be MARKET or LIMIT`);
  }
}

/**
 * Validate execution context
 * @param {Object} ctx - Execution context
 * @throws {Error} If context is invalid
 */
export function validateContext(ctx) {
  if (!ctx) {
    throw new Error('Context is required');
  }

  if (!ctx.run_id) {
    throw new Error('Context must have run_id');
  }

  if (!ctx.hack_id) {
    throw new Error('Context must have hack_id');
  }

  if (!ctx.mode) {
    throw new Error('Context must have mode');
  }

  if (typeof ctx.bar_idx !== 'number' || ctx.bar_idx < 0) {
    throw new Error('Context must have valid bar_idx');
  }

  if (typeof ctx.order_seq !== 'number' || ctx.order_seq < 0) {
    throw new Error('Context must have valid order_seq');
  }
}

/**
 * Generate deterministic order ID
 * CRITICAL: Must be deterministic for reproducibility
 * NO Math.random(), NO Date.now()
 * 
 * @param {Object} ctx - Execution context
 * @returns {string} Deterministic order ID
 */
export function generateOrderId(ctx) {
  // Format: {run_id}_{hack_id}_{mode}_{bar_idx}_{order_seq}
  // Example: run_abc123_hack_001_standard_42_0
  return `${ctx.run_id}_${ctx.hack_id}_${ctx.mode}_${ctx.bar_idx}_${ctx.order_seq}`;
}

export default IExecutionAdapter;
