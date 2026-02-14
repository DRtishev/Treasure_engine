#!/usr/bin/env node
// core/exec/adapters/live_adapter.mjs
// LiveAdapter - Bridge to real trading with MAXIMUM SAFETY
// ⚠️ CRITICAL: This adapter can place REAL ORDERS with REAL MONEY

import { IExecutionAdapter, validateIntent as baseValidateIntent, validateContext, generateOrderId } from './iexecution_adapter.mjs';
import { validateIntent, checkPositionCap, checkDailyLossCap, requireConfirmation, auditLog, validateEnvironment, sanitize, emergencyStop, checkEmergencyStop } from './safety_gates.mjs';
import { BinanceClient } from './binance_client.mjs';
import { MockExchange } from './mock_exchange.mjs';

export class LiveAdapter extends IExecutionAdapter {
  constructor(options = {}) {
    super();
    
    // CRITICAL: Dry-run by default
    this.dryRun = options.dryRun !== false; // Default TRUE
    
    // Confirmation gate
    this.confirmationGiven = options.confirmationGiven || false;
    
    // Safety caps
    this.maxPositionSizeUsd = options.maxPositionSizeUsd || 1000;
    this.maxDailyLossUsd = options.maxDailyLossUsd || 100;
    
    // Exchange client
    if (this.dryRun) {
      this.exchange = new MockExchange();
    } else {
      // Validate environment before creating live client
      validateEnvironment(
        process.env.BINANCE_API_KEY,
        process.env.BINANCE_API_SECRET
      );
      this.exchange = new BinanceClient({
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET,
        testnet: options.testnet || false
      });
    }
    
    // Event logging
    this.eventLog = options.eventLog || null;
    
    // State tracking
    this.orders = new Map();
    this.currentPositionSize = 0;
    this.dailyPnL = 0;
    this.dailyStartTime = Date.now();
    this.emergencyStop = false;
    this.emergencyReason = null;
    
    // CRITICAL: Order placement lock (prevents race conditions)
    this.orderPlacementLock = Promise.resolve();
    
    // Statistics
    this.stats = {
      orders_placed: 0,
      orders_filled: 0,
      orders_canceled: 0,
      orders_rejected: 0,
      safety_blocks: 0
    };
    
    // Log adapter creation
    if (this.eventLog) {
      this.eventLog.sys('adapter_created', {
        adapter: 'LiveAdapter',
        dry_run: this.dryRun,
        max_position_usd: this.maxPositionSizeUsd,
        max_daily_loss_usd: this.maxDailyLossUsd,
        warning: this.dryRun ? 'DRY RUN MODE' : '⚠️ LIVE MODE - REAL MONEY'
      });
    }
  }

  getName() {
    return this.dryRun ? 'LiveAdapter (DRY-RUN)' : 'LiveAdapter (LIVE)';
  }

  /**
   * Place order with MAXIMUM SAFETY
   * CRITICAL: Orders are SERIALIZED to prevent race conditions
   */
  async placeOrder(intent, ctx) {
    // CRITICAL: Acquire lock to serialize order placement
    // This prevents race conditions where multiple concurrent orders
    // could bypass position/loss caps
    return this.orderPlacementLock = this.orderPlacementLock.then(async () => {
      return this._placeOrderInternal(intent, ctx);
    });
  }

  /**
   * Internal order placement (executed with lock held)
   * @private
   */
  async _placeOrderInternal(intent, ctx) {
    const timestamp = ctx.bar?.t_ms || Date.now();
    
    try {
      // GATE 0: Check emergency stop
      checkEmergencyStop(this);
      
      // GATE 1: Validate intent
      validateIntent(intent);
      baseValidateIntent(intent);
      validateContext(ctx);
      
      // GATE 2: Check position cap
      const orderSize = intent.side === 'BUY' ? intent.size : -intent.size;
      checkPositionCap(this.currentPositionSize, orderSize, this.maxPositionSizeUsd);
      
      // CRITICAL: Reserve position immediately to prevent race conditions
      // Even before order is filled, we count it against cap
      this.currentPositionSize += orderSize;
      
      // GATE 3: Check daily loss cap
      checkDailyLossCap(this.dailyPnL, this.maxDailyLossUsd);
      
      // GATE 4: Require confirmation for live mode
      requireConfirmation(!this.dryRun, this.confirmationGiven);
      
      // GATE 5: Audit log for live mode
      if (!this.dryRun && this.eventLog) {
        auditLog(intent, ctx, this.eventLog);
      }
      
      // Generate deterministic order ID
      const order_id = generateOrderId(ctx);
      
      // DRY-RUN MODE: Simulate order
      if (this.dryRun) {
        return this._simulateOrder(intent, ctx, order_id, timestamp);
      }
      
      // LIVE MODE: Place real order
      return this._placeRealOrder(intent, ctx, order_id, timestamp);
      
    } catch (err) {
      this.stats.safety_blocks++;
      
      // Log safety block
      if (this.eventLog) {
        this.eventLog.risk('safety_block', {
          reason: sanitize(err.message),
          intent: {
            side: intent.side,
            size: intent.size,
            type: intent.type
          },
          context: {
            run_id: ctx.run_id,
            hack_id: ctx.hack_id,
            mode: ctx.mode
          }
        }, timestamp);
      }
      
      // Re-throw error (fail-safe)
      throw err;
    }
  }

  /**
   * Simulate order in dry-run mode
   * @private
   */
  async _simulateOrder(intent, ctx, order_id, timestamp) {
    // Use mock exchange
    const exchangeParams = {
      symbol: 'BTCUSDT', // NOTE: derive from intent
      side: intent.side,
      type: intent.type,
      quantity: intent.size / (intent.price || 50000) // Convert USD to BTC
    };
    
    const response = await this.exchange.createOrder(exchangeParams);
    
    // Store order info
    this.orders.set(order_id, {
      intent,
      ctx,
      exchange_order_id: response.orderId,
      timestamp,
      status: 'NEW'
    });
    
    this.stats.orders_placed++;
    
    // Log simulation
    if (this.eventLog) {
      this.eventLog.exec('order_simulated', {
        order_id,
        exchange_order_id: response.orderId,
        side: intent.side,
        size_usd: intent.size,
        type: intent.type,
        dry_run: true
      }, timestamp);
    }
    
    return {
      order_id,
      status: 'SIMULATED',
      timestamp,
      dry_run: true
    };
  }

  /**
   * Place real order on exchange
   * @private
   */
  async _placeRealOrder(intent, ctx, order_id, timestamp) {
    try {
      // Build exchange parameters
      const exchangeParams = {
        symbol: 'BTCUSDT', // NOTE: derive from intent
        side: intent.side,
        quantity: intent.size / (intent.price || 50000) // Convert USD to BTC
      };
      
      // Place order based on type
      let response;
      if (intent.type === 'MARKET') {
        response = await this.exchange.createMarketOrder(exchangeParams);
      } else {
        exchangeParams.price = intent.price;
        response = await this.exchange.createLimitOrder(exchangeParams);
      }
      
      // Store order info
      this.orders.set(order_id, {
        intent,
        ctx,
        exchange_order_id: response.orderId,
        timestamp,
        status: response.status
      });
      
      this.stats.orders_placed++;
      
      // Log real order
      if (this.eventLog) {
        this.eventLog.exec('order_placed_live', {
          order_id,
          exchange_order_id: response.orderId,
          side: intent.side,
          size_usd: intent.size,
          type: intent.type,
          dry_run: false,
          warning: '⚠️ REAL ORDER PLACED'
        }, timestamp);
      }
      
      return {
        order_id,
        status: response.status,
        timestamp,
        dry_run: false,
        exchange_order_id: response.orderId
      };
      
    } catch (err) {
      // FAIL-SAFE: Activate emergency stop on any order error
      emergencyStop(this, `Order placement failed: ${sanitize(err.message)}`, this.eventLog);
      throw err;
    }
  }

  /**
   * Poll order status
   */
  async pollOrder(order_id, ctx) {
    const timestamp = ctx.bar?.t_ms || Date.now();
    
    try {
      // Find order
      const order = this.orders.get(order_id);
      if (!order) {
        throw new Error(`Order not found: ${order_id}`);
      }
      
      // Dry-run: Query mock exchange
      if (this.dryRun) {
        return this._pollSimulatedOrder(order_id, order, timestamp);
      }
      
      // Live: Query real exchange
      return this._pollRealOrder(order_id, order, timestamp);
      
    } catch (err) {
      if (this.eventLog) {
        this.eventLog.exec('poll_error', {
          order_id,
          error: sanitize(err.message)
        }, timestamp);
      }
      throw err;
    }
  }

  /**
   * Poll simulated order
   * @private
   */
  async _pollSimulatedOrder(order_id, order, timestamp) {
    const response = await this.exchange.queryOrder({
      symbol: 'BTCUSDT',
      orderId: order.exchange_order_id
    });
    
    const filled = response.status === 'FILLED';
    const rejected = response.status === 'CANCELED' || response.status === 'REJECTED';
    
    if (filled) {
      this.stats.orders_filled++;
      
      // Update position
      const sizeChange = order.intent.side === 'BUY' ? order.intent.size : -order.intent.size;
      this.currentPositionSize += sizeChange;
      
      // Simulate PnL (very simple)
      const pnl_usd = Math.random() * 10 - 5; // Random -5 to +5
      this.dailyPnL += pnl_usd;
      
      if (this.eventLog) {
        this.eventLog.exec('order_filled_simulated', {
          order_id,
          pnl_usd,
          position_size: this.currentPositionSize,
          daily_pnl: this.dailyPnL
        }, timestamp);
      }
      
      return {
        filled: true,
        filled_price: response.price,
        fee: 0,
        slippage: 0,
        timestamp,
        pnl: pnl_usd / order.intent.size,
        pnl_usd,
        reason: 'filled'
      };
    }
    
    if (rejected) {
      this.stats.orders_rejected++;
      return {
        filled: false,
        rejected: true,
        reason: response.status,
        timestamp
      };
    }
    
    return {
      filled: false,
      pending: true,
      status: response.status,
      timestamp
    };
  }

  /**
   * Poll real order
   * @private
   */
  async _pollRealOrder(order_id, order, timestamp) {
    const response = await this.exchange.queryOrder({
      symbol: 'BTCUSDT',
      orderId: order.exchange_order_id
    });
    
    const filled = response.status === 'FILLED';
    const rejected = response.status === 'CANCELED' || response.status === 'REJECTED';
    
    if (filled) {
      this.stats.orders_filled++;
      
      // Calculate actual PnL from fills
      const executedQty = response.executedQty || 0;
      const avgPrice = response.price || 0;
      const executedValue = executedQty * avgPrice;
      
      // Update position
      const sizeChange = order.intent.side === 'BUY' ? executedValue : -executedValue;
      this.currentPositionSize += sizeChange;
      
      // NOTE: calculate actual PnL when position tracking is wired
      const pnl_usd = 0; // Placeholder
      this.dailyPnL += pnl_usd;
      
      if (this.eventLog) {
        this.eventLog.exec('order_filled_live', {
          order_id,
          exchange_order_id: order.exchange_order_id,
          executed_qty: executedQty,
          avg_price: avgPrice,
          position_size: this.currentPositionSize,
          daily_pnl: this.dailyPnL,
          warning: '⚠️ REAL ORDER FILLED'
        }, timestamp);
      }
      
      return {
        filled: true,
        filled_price: avgPrice,
        fee: 0, // NOTE: get from exchange response
        slippage: 0, // NOTE: calculate deterministically
        timestamp,
        pnl: 0,
        pnl_usd,
        reason: 'filled'
      };
    }
    
    if (rejected) {
      this.stats.orders_rejected++;
      return {
        filled: false,
        rejected: true,
        reason: response.status,
        timestamp
      };
    }
    
    return {
      filled: false,
      pending: true,
      status: response.status,
      timestamp
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(order_id, ctx) {
    const timestamp = ctx.bar?.t_ms || Date.now();
    
    try {
      const order = this.orders.get(order_id);
      if (!order) {
        throw new Error(`Order not found: ${order_id}`);
      }
      
      // Cancel on exchange
      const response = await this.exchange.cancelOrder({
        symbol: 'BTCUSDT',
        orderId: order.exchange_order_id
      });
      
      this.stats.orders_canceled++;
      
      if (this.eventLog) {
        this.eventLog.exec('order_canceled', {
          order_id,
          exchange_order_id: order.exchange_order_id,
          dry_run: this.dryRun
        }, timestamp);
      }
      
      return {
        canceled: true,
        reason: 'User canceled',
        timestamp
      };
      
    } catch (err) {
      if (this.eventLog) {
        this.eventLog.exec('cancel_error', {
          order_id,
          error: sanitize(err.message)
        }, timestamp);
      }
      throw err;
    }
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      adapter: this.getName(),
      dry_run: this.dryRun,
      ...this.stats,
      current_position_usd: this.currentPositionSize,
      daily_pnl: this.dailyPnL,
      emergency_stop: this.emergencyStop,
      fill_rate: this.stats.orders_placed > 0
        ? (this.stats.orders_filled / this.stats.orders_placed)
        : 0
    };
  }

  /**
   * Reset daily counters
   */
  resetDaily() {
    this.dailyPnL = 0;
    this.dailyStartTime = Date.now();
    
    if (this.eventLog) {
      this.eventLog.sys('daily_reset', {
        adapter: this.getName()
      });
    }
  }

  /**
   * Activate emergency stop
   */
  activateEmergencyStop(reason) {
    emergencyStop(this, reason, this.eventLog);
  }

  /**
   * Reset adapter state
   */
  reset() {
    this.orders.clear();
    this.currentPositionSize = 0;
    this.dailyPnL = 0;
    this.emergencyStop = false;
    this.emergencyReason = null;
    this.stats = {
      orders_placed: 0,
      orders_filled: 0,
      orders_canceled: 0,
      orders_rejected: 0,
      safety_blocks: 0
    };
    
    if (this.exchange && this.exchange.reset) {
      this.exchange.reset();
    }
  }
}

export default LiveAdapter;
