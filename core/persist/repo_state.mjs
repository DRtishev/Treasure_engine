/**
 * TREASURE ENGINE: Repository State Manager (EPOCH-12)
 * 
 * Purpose: High-level interface for state persistence and idempotency
 * Features:
 * - Deterministic intent_id generation
 * - Idempotency checks (prevent duplicate orders on restart)
 * - State recovery
 * 
 * CRITICAL: intent_id must be deterministic hash of:
 * - hack_id
 * - signal fields
 * - bar.t_ms
 * - dataset_sha
 * - run_seed
 */

import { createHash } from 'crypto';
import { DatabaseManager } from './db.mjs';

export class RepoState {
  constructor(dbPath) {
    this.db = new DatabaseManager(dbPath);
    this.currentRunId = null;
  }

  /**
   * Initialize repository state
   */
  initialize() {
    this.db.initialize();
    return this;
  }

  /**
   * Close repository state
   */
  close() {
    this.db.close();
  }

  /**
   * Start a new run
   */
  startRun(config) {
    const run = {
      run_id: config.run_id || this._generateRunId(),
      started_at: config.started_at || Date.now(),
      mode: config.mode || 'sim',
      dataset_sha: config.dataset_sha || null,
      ssot_sha: config.ssot_sha || null,
      status: 'running',
      metadata_json: config.metadata || {}
    };

    this.db.createRun(run);
    this.currentRunId = run.run_id;

    return run;
  }

  /**
   * Complete a run
   */
  completeRun(run_id, status = 'completed') {
    this.db.updateRunStatus(run_id, status);
  }

  /**
   * Generate deterministic intent_id
   * 
   * CRITICAL: This hash MUST be deterministic across restarts
   * Inputs:
   * - hack_id: identifier for the strategy
   * - signal: the trading signal object
   * - bar_t_ms: bar timestamp
   * - dataset_sha: dataset hash
   * - run_seed: run-specific seed
   */
  generateIntentId(params) {
    const {
      hack_id,
      signal,
      bar_t_ms,
      dataset_sha,
      run_seed
    } = params;

    // Create deterministic string representation
    const signalStr = JSON.stringify({
      side: signal.side,
      size: signal.size,
      symbol: signal.symbol,
      price: signal.price,
      // Include only fields that affect intent uniqueness
      confidence: signal.confidence
    });

    const components = [
      hack_id,
      signalStr,
      bar_t_ms,
      dataset_sha || 'NO_DATASET',
      run_seed || 'NO_SEED'
    ];

    const hash = createHash('sha256')
      .update(components.join('::'))
      .digest('hex');

    return `intent_${hash.substring(0, 16)}`;
  }

  /**
   * Create intent (idempotent)
   * 
   * Returns: { created: boolean, intent: object }
   */
  createIntent(intent) {
    const result = this.db.createIntent(intent);
    
    // Check if intent was actually inserted (changes === 1) or already existed (changes === 0)
    const created = result.changes > 0;
    
    // Retrieve the intent (whether newly created or existing)
    const storedIntent = this.db.getIntent(intent.intent_id);
    
    return {
      created,
      intent: storedIntent
    };
  }

  /**
   * Get intent
   */
  getIntent(intent_id) {
    return this.db.getIntent(intent_id);
  }

  /**
   * Check if intent has orders (idempotency check)
   * 
   * Returns: { hasOrders: boolean, orders: array }
   */
  checkIntentOrders(intent_id) {
    const orders = this.db.getOrdersByIntent(intent_id);
    
    return {
      hasOrders: orders.length > 0,
      orders
    };
  }

  /**
   * Create order for intent
   */
  createOrder(order) {
    // Verify intent exists
    const intent = this.db.getIntent(order.intent_id);
    if (!intent) {
      throw new Error(`Intent not found: ${order.intent_id}`);
    }

    // Create order
    this.db.createOrder(order);
    
    // Update intent status
    this.db.updateIntentStatus(order.intent_id, 'submitted');
    
    return order;
  }

  /**
   * Record fill
   */
  recordFill(fill) {
    this.db.createFill(fill);
    
    // Update order status
    this.db.updateOrderStatus(fill.order_id, 'filled');
    
    // Update intent status
    const orders = this.db.getOrdersByIntent(fill.intent_id || 'unknown');
    if (orders.length > 0) {
      this.db.updateIntentStatus(orders[0].intent_id, 'filled');
    }
  }

  /**
   * Update position
   */
  updatePosition(symbol, qty, avg_price) {
    this.db.updatePosition(symbol, qty, avg_price);
  }

  /**
   * Get position
   */
  getPosition(symbol) {
    return this.db.getPosition(symbol);
  }

  /**
   * Get all positions
   */
  getAllPositions() {
    return this.db.getAllPositions();
  }

  /**
   * Update safety status
   */
  updateSafetyStatus(status, reason = null) {
    this.db.updateSafetyStatus(status, reason);
  }

  /**
   * Get safety status
   */
  getSafetyStatus() {
    return this.db.getSafetyStatus();
  }

  /**
   * Save checkpoint
   */
  saveCheckpoint(name, payload) {
    this.db.setCheckpoint(name, payload);
  }

  /**
   * Load checkpoint
   */
  loadCheckpoint(name) {
    return this.db.getCheckpoint(name);
  }

  /**
   * Get database instance (for advanced operations)
   */
  getDatabase() {
    return this.db;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate run ID
   * @private
   */
  _generateRunId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `run_${timestamp}_${random}`;
  }
}
