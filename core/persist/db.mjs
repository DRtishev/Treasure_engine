/**
 * TREASURE ENGINE: Database Manager (EPOCH-12)
 * 
 * Purpose: SQLite persistence layer for runs, events, intents, orders, fills, positions
 * Mode: Network-isolated, deterministic, ACID-compliant
 * 
 * CRITICAL RULES:
 * - No network I/O
 * - All operations in transactions where appropriate
 * - Idempotency enforced via unique constraints
 * - WAL mode for better concurrency
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const require = createRequire(import.meta.url);

function loadBetterSqlite3() {
  try {
    return require('better-sqlite3');
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`DEP02 better-sqlite3 unavailable. Install optional dependency and set ENABLE_SQLITE_PERSISTENCE=1 when persistence is required. Root cause: ${msg}`);
  }
}

export class DatabaseManager {
  constructor(dbPath = './data/treasure_engine.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database connection and run migrations
   */
  initialize() {
    if (this.db) {
      throw new Error('Database already initialized');
    }

    if (process.env.ENABLE_SQLITE_PERSISTENCE !== '1') {
      throw new Error('SQLite persistence disabled by default. Set ENABLE_SQLITE_PERSISTENCE=1 to initialize DatabaseManager.');
    }

    const Database = loadBetterSqlite3();
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Foreign keys enforcement
    this.db.pragma('foreign_keys = ON');
    
    // Run migrations
    this._runMigrations();
    
    return this;
  }

  /**
   * Run database migrations
   * @private
   */
  _runMigrations() {
    // Check if migrations table exists
    const migrationCheck = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='schema_version'
    `).get();

    if (!migrationCheck) {
      // First time, run initial migration
      const migrationSQL = readFileSync(
        join(__dirname, 'migrations', '0001_init.sql'),
        'utf8'
      );
      
      this.db.exec(migrationSQL);
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ============================================
  // RUNS
  // ============================================

  /**
   * Create a new run
   */
  createRun(run) {
    const stmt = this.db.prepare(`
      INSERT INTO runs (run_id, started_at, mode, dataset_sha, ssot_sha, status, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      run.run_id,
      run.started_at,
      run.mode,
      run.dataset_sha || null,
      run.ssot_sha || null,
      run.status || 'running',
      run.metadata_json ? JSON.stringify(run.metadata_json) : null
    );
  }

  /**
   * Get run by ID
   */
  getRun(run_id) {
    const stmt = this.db.prepare('SELECT * FROM runs WHERE run_id = ?');
    const row = stmt.get(run_id);
    
    if (row && row.metadata_json) {
      row.metadata_json = JSON.parse(row.metadata_json);
    }
    
    return row;
  }

  /**
   * Update run status
   */
  updateRunStatus(run_id, status) {
    const stmt = this.db.prepare('UPDATE runs SET status = ? WHERE run_id = ?');
    return stmt.run(status, run_id);
  }

  // ============================================
  // EVENTS
  // ============================================

  /**
   * Insert event (idempotent via UNIQUE constraint on run_id, seq)
   */
  insertEvent(event) {
    const stmt = this.db.prepare(`
      INSERT INTO events (run_id, seq, ts_ms, category, event_type, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id, seq) DO NOTHING
    `);

    return stmt.run(
      event.run_id,
      event.seq,
      event.ts_ms,
      event.category,
      event.event_type,
      JSON.stringify(event.payload)
    );
  }

  /**
   * Get events for a run
   */
  getEventsByRun(run_id, limit = 1000) {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      WHERE run_id = ? 
      ORDER BY seq ASC
      LIMIT ?
    `);

    const rows = stmt.all(run_id, limit);
    
    return rows.map(row => ({
      ...row,
      payload_json: JSON.parse(row.payload_json)
    }));
  }

  /**
   * Get next sequence number for a run
   */
  getNextSeq(run_id) {
    const stmt = this.db.prepare(`
      SELECT COALESCE(MAX(seq), -1) + 1 AS next_seq 
      FROM events 
      WHERE run_id = ?
    `);

    const row = stmt.get(run_id);
    return row.next_seq;
  }

  // ============================================
  // INTENTS (IDEMPOTENCY KEY)
  // ============================================

  /**
   * Create intent (idempotent via PRIMARY KEY)
   */
  createIntent(intent) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO intents 
      (intent_id, run_id, ts_ms, side, size_usd, symbol, status, hack_id, signal_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      intent.intent_id,
      intent.run_id,
      intent.ts_ms,
      intent.side,
      intent.size_usd,
      intent.symbol,
      intent.status || 'pending',
      intent.hack_id || null,
      intent.signal_hash || null
    );
  }

  /**
   * Get intent by ID
   */
  getIntent(intent_id) {
    const stmt = this.db.prepare('SELECT * FROM intents WHERE intent_id = ?');
    return stmt.get(intent_id);
  }

  /**
   * Update intent status
   */
  updateIntentStatus(intent_id, status) {
    const stmt = this.db.prepare('UPDATE intents SET status = ? WHERE intent_id = ?');
    return stmt.run(status, intent_id);
  }

  // ============================================
  // ORDERS
  // ============================================

  /**
   * Create order
   */
  createOrder(order) {
    const stmt = this.db.prepare(`
      INSERT INTO orders 
      (order_id, intent_id, adapter, status, order_type, side, symbol, size, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      order.order_id,
      order.intent_id,
      order.adapter,
      order.status || 'pending',
      order.order_type || null,
      order.side || null,
      order.symbol || null,
      order.size || null,
      order.price || null
    );
  }

  /**
   * Get orders by intent
   */
  getOrdersByIntent(intent_id) {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE intent_id = ?');
    return stmt.all(intent_id);
  }

  /**
   * Update order status
   */
  updateOrderStatus(order_id, status) {
    const stmt = this.db.prepare(`
      UPDATE orders 
      SET status = ?, updated_at = strftime('%s', 'now') * 1000 
      WHERE order_id = ?
    `);
    return stmt.run(status, order_id);
  }

  // ============================================
  // FILLS
  // ============================================

  /**
   * Create fill
   */
  createFill(fill) {
    const stmt = this.db.prepare(`
      INSERT INTO fills (fill_id, order_id, price, qty, fee_usd, ts_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      fill.fill_id,
      fill.order_id,
      fill.price,
      fill.qty,
      fill.fee_usd || 0.0,
      fill.ts_ms
    );
  }

  /**
   * Get fills by order
   */
  getFillsByOrder(order_id) {
    const stmt = this.db.prepare('SELECT * FROM fills WHERE order_id = ?');
    return stmt.all(order_id);
  }

  // ============================================
  // POSITIONS
  // ============================================

  /**
   * Update position
   */
  updatePosition(symbol, qty, avg_price) {
    const stmt = this.db.prepare(`
      INSERT INTO positions (symbol, qty, avg_price, updated_at)
      VALUES (?, ?, ?, strftime('%s', 'now') * 1000)
      ON CONFLICT(symbol) DO UPDATE SET
        qty = excluded.qty,
        avg_price = excluded.avg_price,
        updated_at = excluded.updated_at
    `);

    return stmt.run(symbol, qty, avg_price);
  }

  /**
   * Get position
   */
  getPosition(symbol) {
    const stmt = this.db.prepare('SELECT * FROM positions WHERE symbol = ?');
    return stmt.get(symbol);
  }

  /**
   * Get all positions
   */
  getAllPositions() {
    const stmt = this.db.prepare('SELECT * FROM positions WHERE qty != 0');
    return stmt.all();
  }

  // ============================================
  // SAFETY
  // ============================================

  /**
   * Update safety status
   */
  updateSafetyStatus(status, reason = null) {
    const stmt = this.db.prepare(`
      UPDATE safety 
      SET status = ?, reason = ?, updated_at = strftime('%s', 'now') * 1000 
      WHERE id = 1
    `);
    return stmt.run(status, reason);
  }

  /**
   * Get safety status
   */
  getSafetyStatus() {
    const stmt = this.db.prepare('SELECT * FROM safety WHERE id = 1');
    return stmt.get();
  }

  // ============================================
  // CHECKPOINTS
  // ============================================

  /**
   * Set checkpoint
   */
  setCheckpoint(name, payload) {
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (name, payload_json, updated_at)
      VALUES (?, ?, strftime('%s', 'now') * 1000)
      ON CONFLICT(name) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `);

    return stmt.run(name, JSON.stringify(payload));
  }

  /**
   * Get checkpoint
   */
  getCheckpoint(name) {
    const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE name = ?');
    const row = stmt.get(name);
    
    if (row) {
      row.payload_json = JSON.parse(row.payload_json);
    }
    
    return row;
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Execute raw SQL (use with caution)
   */
  exec(sql) {
    return this.db.exec(sql);
  }

  /**
   * Prepare statement
   */
  prepare(sql) {
    return this.db.prepare(sql);
  }

  /**
   * Transaction wrapper
   */
  transaction(fn) {
    const tx = this.db.transaction(fn);
    return tx();
  }
}
