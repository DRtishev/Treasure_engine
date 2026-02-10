/**
 * TREASURE ENGINE: Live Adapter Dry-Run (EPOCH-14)
 * 
 * Purpose: Fixture-driven live adapter for offline testing
 * Mode: 100% OFFLINE - zero network calls
 * 
 * CRITICAL RULES:
 * - NO network libraries (axios, fetch, http, https, net)
 * - All responses from fixtures (data/fixtures/live/*.json)
 * - Deterministic behavior
 * - Used in verify gates ONLY
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { IExecutionAdapter, generateOrderId, validateIntent, validateContext } from './iexecution_adapter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class LiveAdapterDryRun extends IExecutionAdapter {
  constructor(options = {}) {
    super();
    
    this.options = {
      fixtures_dir: options.fixtures_dir || join(__dirname, '../../../data/fixtures/live'),
      ...options
    };

    this.stats = {
      orders_placed: 0,
      orders_filled: 0,
      orders_canceled: 0,
      orders_partial: 0
    };

    // Order state storage
    this.orders = new Map();
    
    // Fixture cache
    this.fixtures = new Map();
    
    // Load fixtures if dir exists
    this._loadFixtures();
  }

  getName() {
    return 'LiveAdapterDryRun';
  }

  /**
   * Load fixtures from directory
   * @private
   */
  _loadFixtures() {
    try {
      // Check if fixtures directory exists
      if (!existsSync(this.options.fixtures_dir)) {
        console.warn('[LiveAdapterDryRun] Fixtures directory not found, will use synthetic fixtures');
        return;
      }
      
      const files = readdirSync(this.options.fixtures_dir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const fixturePath = join(this.options.fixtures_dir, file);
            const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
            this.fixtures.set(fixture.fixture_id, fixture);
          } catch (err) {
            console.warn(`Failed to load fixture ${file}:`, err.message);
          }
        }
      }
      
      console.log(`[LiveAdapterDryRun] Loaded ${this.fixtures.size} fixtures`);
    } catch (err) {
      console.warn('[LiveAdapterDryRun] Error loading fixtures:', err.message);
    }
  }

  /**
   * Find matching fixture for intent
   * @private
   */
  _findFixture(intent, ctx) {
    // Try to find exact match by symbol and side
    for (const [id, fixture] of this.fixtures) {
      const req = fixture.request;
      
      if (req.intent.symbol === intent.symbol &&
          req.intent.side === intent.side &&
          req.intent.type === intent.type) {
        return fixture;
      }
    }

    // Fallback: generate synthetic fixture
    return this._generateSyntheticFixture(intent, ctx);
  }

  /**
   * Generate synthetic fixture if no match found
   * @private
   */
  _generateSyntheticFixture(intent, ctx) {
    const order_id = generateOrderId(ctx);
    const timestamp = ctx.bar?.t_ms || Date.now();

    // LIMIT orders → PARTIAL_FILL scenario (60% filled)
    if (intent.type === 'LIMIT') {
      const fillRatio = 0.6; // 60% filled
      const filledQty = intent.size * fillRatio;
      const remainingQty = intent.size * (1 - fillRatio);

      return {
        fixture_id: 'synthetic_partial',
        scenario: 'PARTIAL_FILL',
        response: {
          placeOrder: {
            order_id,
            status: 'PENDING',
            timestamp
          },
          pollOrder: {
            status: 'PARTIALLY_FILLED',
            filled: false,
            filled_qty: filledQty,
            remaining_qty: remainingQty,
            timestamp: timestamp + 100,
            fills: [
              {
                fill_id: `${order_id}_fill_0`,
                price: intent.price,
                qty: filledQty,
                fee: intent.price * filledQty * 0.001, // 0.1% fee
                timestamp: timestamp + 100
              }
            ]
          }
        }
      };
    }

    // MARKET orders → INSTANT_FILL scenario (100% filled)
    return {
      fixture_id: 'synthetic_instant',
      scenario: 'INSTANT_FILL',
      response: {
        placeOrder: {
          order_id,
          status: 'PENDING',
          timestamp
        },
        pollOrder: {
          status: 'FILLED',
          filled: true,
          filled_price: intent.price,
          filled_qty: intent.size,
          fee: intent.price * intent.size * 0.001, // 0.1% fee
          fee_asset: 'USDT',
          slippage_bps: 0,
          timestamp: timestamp + 100,
          fills: [
            {
              fill_id: `${order_id}_fill_0`,
              price: intent.price,
              qty: intent.size,
              fee: intent.price * intent.size * 0.001,
              timestamp: timestamp + 100
            }
          ]
        }
      }
    };
  }

  /**
   * Place order (fixture-driven)
   */
  async placeOrder(intent, ctx) {
    // Validate inputs
    validateIntent(intent);
    validateContext(ctx);

    // Generate deterministic order ID
    const order_id = generateOrderId(ctx);

    // Find matching fixture
    const fixture = this._findFixture(intent, ctx);
    const response = fixture.response.placeOrder;

    // Store order state
    this.orders.set(order_id, {
      order_id,
      intent,
      ctx,
      fixture,
      status: response.status,
      timestamp: response.timestamp,
      fills: []
    });

    this.stats.orders_placed++;

    return {
      order_id,
      status: response.status,
      timestamp: response.timestamp
    };
  }

  /**
   * Poll order status (fixture-driven)
   */
  async pollOrder(order_id, ctx) {
    const order = this.orders.get(order_id);

    if (!order) {
      throw new Error(`Order not found: ${order_id}`);
    }

    // Get fixture response
    const fixture = order.fixture;
    const response = fixture.response.pollOrder;

    // Update order state
    order.status = response.status;
    order.fills = response.fills || [];

    // Update stats
    if (response.status === 'FILLED') {
      this.stats.orders_filled++;
    } else if (response.status === 'PARTIALLY_FILLED') {
      this.stats.orders_partial++;
    }

    return {
      order_id,
      status: response.status,
      filled: response.filled || false,
      filled_price: response.filled_price,
      filled_qty: response.filled_qty,
      remaining_qty: response.remaining_qty,
      fee: response.fee,
      fee_asset: response.fee_asset,
      slippage_bps: response.slippage_bps,
      fills: response.fills || [],
      timestamp: response.timestamp
    };
  }

  /**
   * Cancel order (fixture-driven)
   */
  async cancelOrder(order_id, ctx) {
    const order = this.orders.get(order_id);

    if (!order) {
      throw new Error(`Order not found: ${order_id}`);
    }

    // Update order state
    order.status = 'CANCELED';

    this.stats.orders_canceled++;

    return {
      order_id,
      canceled: true,
      reason: 'User requested cancellation',
      timestamp: ctx.bar?.t_ms || Date.now()
    };
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      adapter: this.getName(),
      ...this.stats,
      fixtures_loaded: this.fixtures.size,
      orders_in_memory: this.orders.size
    };
  }

  /**
   * Get order by ID (for testing)
   */
  getOrder(order_id) {
    return this.orders.get(order_id);
  }

  /**
   * Get all orders (for testing)
   */
  getAllOrders() {
    return Array.from(this.orders.values());
  }

  /**
   * Reset adapter state (for testing)
   */
  reset() {
    this.orders.clear();
    this.stats = {
      orders_placed: 0,
      orders_filled: 0,
      orders_canceled: 0,
      orders_partial: 0
    };
  }
}

/**
 * Create dry-run live adapter
 */
export function createLiveAdapterDryRun(options = {}) {
  return new LiveAdapterDryRun(options);
}
