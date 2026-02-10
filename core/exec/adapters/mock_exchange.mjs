#!/usr/bin/env node
// core/exec/adapters/mock_exchange.mjs
// Mock exchange for testing - NO real API calls
// Simulates Binance API responses deterministically

import crypto from 'crypto';

export class MockExchange {
  constructor(options = {}) {
    this.orders = new Map();
    this.orderSequence = 1;
    
    // Configurable behavior
    this.failureRate = options.failureRate || 0; // 0-1 probability of failure
    this.fillDelay = options.fillDelay || 100; // ms to simulate fill
    this.rateLimitRemaining = options.rateLimitStart || 1200;
    this.rateLimitWindow = 60000; // 1 minute
    
    // Statistics
    this.stats = {
      ordersCreated: 0,
      ordersQueried: 0,
      ordersCanceled: 0,
      rateLimitHits: 0,
      errors: 0
    };
  }

  /**
   * Create order (mock Binance POST /api/v3/order)
   * @param {Object} params - Order parameters
   * @returns {Object} Mock order response
   */
  async createOrder(params) {
    this.stats.ordersCreated++;
    
    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      this.stats.rateLimitHits++;
      throw new Error('Rate limit exceeded');
    }
    this.rateLimitRemaining--;
    
    // Simulate random failure
    if (Math.random() < this.failureRate) {
      this.stats.errors++;
      throw new Error('Order rejected by exchange');
    }
    
    // Validate required parameters
    if (!params.symbol) {
      throw new Error('Missing required parameter: symbol');
    }
    if (!params.side) {
      throw new Error('Missing required parameter: side');
    }
    if (!params.type) {
      throw new Error('Missing required parameter: type');
    }
    
    // Generate order ID
    const orderId = this.orderSequence++;
    const timestamp = Date.now();
    
    // Create order record
    const order = {
      orderId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity || 0,
      price: params.price || null,
      status: 'NEW',
      createdAt: timestamp,
      updatedAt: timestamp,
      fills: []
    };
    
    // Store order
    this.orders.set(orderId, order);
    
    // Simulate async fill after delay
    if (params.type === 'MARKET') {
      setTimeout(() => {
        this._fillOrder(orderId, params);
      }, this.fillDelay);
    }
    
    // Return mock response
    return {
      orderId,
      symbol: params.symbol,
      status: 'NEW',
      side: params.side,
      type: params.type,
      origQty: params.quantity,
      executedQty: 0,
      transactTime: timestamp
    };
  }

  /**
   * Query order status (mock Binance GET /api/v3/order)
   * @param {Object} params - Query parameters
   * @returns {Object} Mock order status
   */
  async queryOrder(params) {
    this.stats.ordersQueried++;
    
    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      this.stats.rateLimitHits++;
      throw new Error('Rate limit exceeded');
    }
    this.rateLimitRemaining--;
    
    // Validate parameters
    if (!params.symbol) {
      throw new Error('Missing required parameter: symbol');
    }
    if (!params.orderId) {
      throw new Error('Missing required parameter: orderId');
    }
    
    // Find order
    const order = this.orders.get(params.orderId);
    if (!order) {
      throw new Error(`Order not found: ${params.orderId}`);
    }
    
    // Return order status
    return {
      orderId: order.orderId,
      symbol: order.symbol,
      status: order.status,
      side: order.side,
      type: order.type,
      origQty: order.quantity,
      executedQty: order.status === 'FILLED' ? order.quantity : 0,
      price: order.price,
      time: order.createdAt,
      updateTime: order.updatedAt,
      fills: order.fills
    };
  }

  /**
   * Cancel order (mock Binance DELETE /api/v3/order)
   * @param {Object} params - Cancel parameters
   * @returns {Object} Mock cancel response
   */
  async cancelOrder(params) {
    this.stats.ordersCanceled++;
    
    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      this.stats.rateLimitHits++;
      throw new Error('Rate limit exceeded');
    }
    this.rateLimitRemaining--;
    
    // Validate parameters
    if (!params.symbol) {
      throw new Error('Missing required parameter: symbol');
    }
    if (!params.orderId) {
      throw new Error('Missing required parameter: orderId');
    }
    
    // Find order
    const order = this.orders.get(params.orderId);
    if (!order) {
      throw new Error(`Order not found: ${params.orderId}`);
    }
    
    // Check if already filled
    if (order.status === 'FILLED') {
      throw new Error('Cannot cancel filled order');
    }
    
    // Cancel order
    order.status = 'CANCELED';
    order.updatedAt = Date.now();
    
    // Return cancel response
    return {
      orderId: order.orderId,
      symbol: order.symbol,
      status: 'CANCELED',
      side: order.side,
      type: order.type,
      origQty: order.quantity,
      executedQty: 0
    };
  }

  /**
   * Internal: Fill order after delay
   * @private
   */
  _fillOrder(orderId, params) {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'NEW') {
      return; // Already filled or canceled
    }
    
    // Simulate fill
    const fillPrice = params.price || this._getMockPrice(params.symbol);
    const fillQty = params.quantity || 0;
    
    order.status = 'FILLED';
    order.price = fillPrice;
    order.updatedAt = Date.now();
    order.fills = [{
      price: fillPrice,
      qty: fillQty,
      commission: fillQty * fillPrice * 0.001, // 0.1% fee
      commissionAsset: params.symbol.replace('USDT', '')
    }];
  }

  /**
   * Get mock price for symbol
   * @private
   */
  _getMockPrice(symbol) {
    // Simple mock prices
    const prices = {
      'BTCUSDT': 50000,
      'ETHUSDT': 3000,
      'BNBUSDT': 400
    };
    return prices[symbol] || 100;
  }

  /**
   * Reset rate limit (simulates time window passing)
   */
  resetRateLimit() {
    this.rateLimitRemaining = 1200;
  }

  /**
   * Get exchange statistics
   */
  getStats() {
    return {
      ...this.stats,
      rateLimitRemaining: this.rateLimitRemaining,
      activeOrders: this.orders.size
    };
  }

  /**
   * Reset exchange state
   */
  reset() {
    this.orders.clear();
    this.orderSequence = 1;
    this.rateLimitRemaining = 1200;
    this.stats = {
      ordersCreated: 0,
      ordersQueried: 0,
      ordersCanceled: 0,
      rateLimitHits: 0,
      errors: 0
    };
  }
}

/**
 * Create mock Binance API responses for testing
 */
export class MockBinanceAPI {
  constructor(exchange) {
    this.exchange = exchange || new MockExchange();
  }

  /**
   * Mock order creation
   */
  async createOrder(params) {
    return this.exchange.createOrder(params);
  }

  /**
   * Mock order query
   */
  async queryOrder(params) {
    return this.exchange.queryOrder(params);
  }

  /**
   * Mock order cancellation
   */
  async cancelOrder(params) {
    return this.exchange.cancelOrder(params);
  }

  /**
   * Mock account info
   */
  async getAccountInfo() {
    return {
      makerCommission: 10, // 0.1%
      takerCommission: 10,
      buyerCommission: 0,
      sellerCommission: 0,
      canTrade: true,
      canWithdraw: true,
      canDeposit: true,
      balances: [
        { asset: 'BTC', free: 1.0, locked: 0.0 },
        { asset: 'USDT', free: 10000.0, locked: 0.0 }
      ]
    };
  }

  /**
   * Get mock statistics
   */
  getStats() {
    return this.exchange.getStats();
  }

  /**
   * Reset mock state
   */
  reset() {
    this.exchange.reset();
  }
}

export default MockExchange;
