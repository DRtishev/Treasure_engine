#!/usr/bin/env node
// core/exec/adapters/paper_adapter.mjs
// Paper trading adapter - wraps existing simulation logic
// NO new mathematics, just adapter pattern over simulateOrder()

import { IExecutionAdapter, validateIntent, validateContext, generateOrderId } from './iexecution_adapter.mjs';
import { simulateOrder } from '../../sim/order_lifecycle.mjs';

export class PaperAdapter extends IExecutionAdapter {
  constructor(options = {}) {
    super();
    
    // Dependencies from simulation environment
    this.bars = options.bars || [];
    this.rng = options.rng || null;
    this.ssot = options.ssot || {};
    this.execPolicy = options.execPolicy || null;
    
    // Stats tracking
    this.orders_placed = 0;
    this.orders_filled = 0;
    this.orders_canceled = 0;
    
    // Order storage (for polling)
    this.orders = new Map();
  }

  getName() {
    return 'PaperAdapter';
  }

  /**
   * Place order in paper trading environment
   * Wraps existing simulateOrder() logic
   */
  async placeOrder(intent, ctx) {
    // Validate inputs
    validateIntent(intent);
    validateContext(ctx);

    // Generate deterministic order ID
    const order_id = generateOrderId(ctx);

    // Extract context
    const { hack_id, mode, bar_idx, bar } = ctx;

    // Map intent to signal format
    const signal = intent.side === 'BUY' ? 'long' : 'short';

    // Build intent object for simulateOrder
    const simIntent = {
      size_usd: intent.size || 1000,
      quality_score: intent.quality_score || 1.0,
      ttl_ms: intent.ttl_ms || 5000,
      tip_bps: intent.tip_bps || 0
    };

    // Execute simulation (existing logic)
    const result = simulateOrder(
      signal,
      this.bars,
      bar_idx,
      mode,
      this.rng,
      this.ssot,
      this.execPolicy,
      simIntent
    );

    // Store order for polling
    this.orders.set(order_id, {
      intent,
      ctx,
      result,
      timestamp: bar?.t_ms || Date.now() // Use bar timestamp if available
    });

    this.orders_placed++;
    if (result.filled) {
      this.orders_filled++;
    }

    return {
      order_id,
      status: result.filled ? 'FILLED' : (result.rejected ? 'REJECTED' : 'PENDING'),
      timestamp: bar?.t_ms || Date.now()
    };
  }

  /**
   * Poll order status
   * Returns execution result
   */
  async pollOrder(order_id, ctx) {
    const order = this.orders.get(order_id);
    
    if (!order) {
      return {
        error: true,
        message: `Order ${order_id} not found`
      };
    }

    const { result, timestamp } = order;

    return {
      filled: result.filled,
      filled_price: result.fill_ratio || 0, // Simplified for paper
      fee: 0, // Fees handled in PnL calculation
      slippage: result.slippage_bps || 0,
      timestamp,
      pnl: result.pnl || 0,
      pnl_usd: result.pnl_usd || 0,
      latency_ms: result.latency_ms || 0,
      reason: result.reason || 'unknown'
    };
  }

  /**
   * Cancel order
   * In paper trading, this is mostly for tracking
   */
  async cancelOrder(order_id, ctx) {
    const order = this.orders.get(order_id);
    
    if (!order) {
      return {
        canceled: false,
        reason: 'Order not found',
        timestamp: Date.now()
      };
    }

    // Can only cancel unfilled orders
    if (order.result.filled) {
      return {
        canceled: false,
        reason: 'Order already filled',
        timestamp: Date.now()
      };
    }

    // Mark as canceled
    order.result.canceled = true;
    this.orders_canceled++;

    return {
      canceled: true,
      reason: 'Canceled by request',
      timestamp: Date.now()
    };
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      adapter: this.getName(),
      orders_placed: this.orders_placed,
      orders_filled: this.orders_filled,
      orders_canceled: this.orders_canceled,
      fill_rate: this.orders_placed > 0 
        ? (this.orders_filled / this.orders_placed)
        : 0
    };
  }

  /**
   * Clear orders (for cleanup between runs)
   */
  reset() {
    this.orders.clear();
    this.orders_placed = 0;
    this.orders_filled = 0;
    this.orders_canceled = 0;
  }
}

export default PaperAdapter;
