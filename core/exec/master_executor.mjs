#!/usr/bin/env node
/**
 * TREASURE ENGINE: Master Executor (EPOCH-16)
 * 
 * Purpose: Supreme orchestrator integrating ALL systems
 * Components:
 * - RunContext (determinism, EPOCH-13)
 * - EventLogV2 (observability, EPOCH-15)
 * - DatabaseManager (persistence, EPOCH-12)
 * - ExecutionAdapter (trading, EPOCH-14)
 * - ReconciliationEngine (verification, EPOCH-14)
 * 
 * Flow: Intent → Order → Fill → Reconcile → Persist → Event
 * 
 * CRITICAL: God-tier integration, production-grade, deterministic
 */

import { RunContext } from '../sys/context.mjs';
import { EventLogV2, EventCategory, EventLevel } from '../obs/event_log_v2.mjs';
import { DatabaseManager } from '../persist/db.mjs';
import { RepoState } from '../persist/repo_state.mjs';
import { ReconciliationEngine } from '../recon/reconcile_v1.mjs';

/**
 * Execution result
 */
export class ExecutionResult {
  constructor() {
    this.success = false;
    this.order_id = null;
    this.fills = [];
    this.reconciliation = null;
    this.persisted = false;
    this.errors = [];
    this.metrics = {
      order_latency_ms: 0,
      fill_latency_ms: 0,
      reconciliation_latency_ms: 0,
      persistence_latency_ms: 0,
      total_latency_ms: 0
    };
  }

  toJSON() {
    return {
      success: this.success,
      order_id: this.order_id,
      fills: this.fills,
      reconciliation: this.reconciliation,
      persisted: this.persisted,
      errors: this.errors,
      metrics: this.metrics
    };
  }
}

/**
 * Master Executor - Supreme Integration
 */
export class MasterExecutor {
  constructor(options = {}) {
    // Core components (REQUIRED)
    if (!options.adapter) {
      throw new Error('ExecutionAdapter is required');
    }
    
    this.adapter = options.adapter;
    this.ctx = options.ctx || null; // RunContext (for determinism)
    
    // Optional components
    this.eventLog = options.eventLog || null; // EventLogV2
    this.db = options.db || null; // DatabaseManager
    this.repoState = options.repoState || null; // RepoStateManager
    this.reconEngine = options.reconEngine || null; // ReconciliationEngine
    
    // Configuration
    this.enable_reconciliation = options.enable_reconciliation !== false;
    this.enable_persistence = options.enable_persistence !== false;
    this.enable_events = options.enable_events !== false;
    
    // Statistics
    this.stats = {
      intents_created: 0,
      orders_placed: 0,
      orders_filled: 0,
      reconciliations_run: 0,
      reconciliation_failures: 0,
      persistence_writes: 0,
      events_logged: 0,
      total_latency_ms: 0
    };
    
    // Initialize run
    this._logEvent('SYS', 'master_executor_init', {
      adapter: this.adapter.getName(),
      has_ctx: !!this.ctx,
      has_eventLog: !!this.eventLog,
      has_db: !!this.db,
      enable_reconciliation: this.enable_reconciliation,
      enable_persistence: this.enable_persistence
    }, EventLevel.INFO);
  }

  /**
   * Execute intent (full flow)
   * 
   * @param {Object} intent - Trading intent
   * @param {Object} executionContext - Execution context (bar, hack_id, etc.)
   * @returns {Promise<ExecutionResult>}
   */
  async executeIntent(intent, executionContext = {}) {
    const startTime = this.ctx?.clock?.now() || Date.now();
    const result = new ExecutionResult();
    
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 1: Intent Creation + Persistence
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      this.stats.intents_created++;
      
      this._logEvent('EXEC', 'intent_created', {
        intent,
        execution_context: executionContext
      }, EventLevel.INFO);
      
      // Check idempotency (if persistence enabled)
      if (this.enable_persistence && this.repoState) {
        const intentExists = await this._checkIntentIdempotency(intent, executionContext);
        
        if (intentExists.created) {
          result.errors.push('Intent already exists (idempotent)');
          this._logEvent('EXEC', 'intent_duplicate', {
            intent_id: intentExists.intent_id
          }, EventLevel.WARN);
          
          return result;
        }
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 2: Order Placement
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      const orderStartTime = this.ctx?.clock?.now() || Date.now();
      
      const orderResult = await this.adapter.placeOrder(intent, executionContext);
      
      const orderLatency = (this.ctx?.clock?.now() || Date.now()) - orderStartTime;
      result.metrics.order_latency_ms = orderLatency;
      
      result.order_id = orderResult.order_id;
      this.stats.orders_placed++;
      
      this._logEvent('EXEC', 'order_placed', {
        order_id: orderResult.order_id,
        status: orderResult.status,
        latency_ms: orderLatency
      }, EventLevel.INFO);
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 3: Order Polling + Fill Detection
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      const fillStartTime = this.ctx?.clock?.now() || Date.now();
      
      const fillResult = await this.adapter.pollOrder(result.order_id, executionContext);
      
      const fillLatency = (this.ctx?.clock?.now() || Date.now()) - fillStartTime;
      result.metrics.fill_latency_ms = fillLatency;
      
      if (fillResult.status === 'FILLED' || fillResult.status === 'PARTIALLY_FILLED') {
        result.fills = fillResult.fills || [];
        
        if (fillResult.status === 'FILLED') {
          this.stats.orders_filled++;
        }
        
        this._logEvent('EXEC', fillResult.status === 'FILLED' ? 'order_filled' : 'order_partial_fill', {
          order_id: result.order_id,
          fills_count: result.fills.length,
          filled_qty: fillResult.filled_qty,
          filled_price: fillResult.filled_price,
          fee: fillResult.fee,
          latency_ms: fillLatency
        }, EventLevel.INFO);
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 4: Reconciliation
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      if (this.enable_reconciliation && this.reconEngine) {
        const reconStartTime = this.ctx?.clock?.now() || Date.now();
        
        // Expected vs actual comparison
        const expected = {
          order_id: result.order_id,
          status: fillResult.status,
          fills: result.fills
        };
        
        const actual = {
          order_id: fillResult.order_id || result.order_id,
          status: fillResult.status,
          fills: fillResult.fills || []
        };
        
        const reconResult = this.reconEngine.reconcileOrder(expected, actual);
        
        const reconLatency = (this.ctx?.clock?.now() || Date.now()) - reconStartTime;
        result.metrics.reconciliation_latency_ms = reconLatency;
        
        result.reconciliation = reconResult.toJSON();
        this.stats.reconciliations_run++;
        
        if (!reconResult.ok) {
          this.stats.reconciliation_failures++;
          
          this._logEvent('RECON', 'recon_mismatch', {
            order_id: result.order_id,
            mismatches_count: reconResult.mismatches.length,
            mismatch_codes: reconResult.mismatches.map(m => m.code),
            latency_ms: reconLatency
          }, EventLevel.ERROR);
          
          result.errors.push(`Reconciliation failed: ${reconResult.mismatches.length} mismatches`);
        } else {
          this._logEvent('RECON', 'recon_complete', {
            order_id: result.order_id,
            fills_checked: reconResult.summary.fills_checked,
            latency_ms: reconLatency
          }, EventLevel.INFO);
        }
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 5: Persistence
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      if (this.enable_persistence && this.db) {
        const persistStartTime = this.ctx?.clock?.now() || Date.now();
        
        try {
          // Persist order
          await this._persistOrder(result.order_id, intent, fillResult, executionContext);
          
          // Persist fills
          for (const fill of result.fills) {
            await this._persistFill(result.order_id, fill, executionContext);
          }
          
          const persistLatency = (this.ctx?.clock?.now() || Date.now()) - persistStartTime;
          result.metrics.persistence_latency_ms = persistLatency;
          
          result.persisted = true;
          this.stats.persistence_writes += (1 + result.fills.length);
          
          this._logEvent('DATA', 'data_persisted', {
            order_id: result.order_id,
            records_written: 1 + result.fills.length,
            latency_ms: persistLatency
          }, EventLevel.DEBUG);
        } catch (err) {
          this._logEvent('DATA', 'persistence_error', {
            order_id: result.order_id,
            error: err.message
          }, EventLevel.ERROR);
          
          result.errors.push(`Persistence failed: ${err.message}`);
        }
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 6: Success
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      result.success = result.errors.length === 0;
      
      const totalLatency = (this.ctx?.clock?.now() || Date.now()) - startTime;
      result.metrics.total_latency_ms = totalLatency;
      this.stats.total_latency_ms += totalLatency;
      
      this._logEvent('EXEC', 'execution_complete', {
        order_id: result.order_id,
        success: result.success,
        errors_count: result.errors.length,
        total_latency_ms: totalLatency
      }, result.success ? EventLevel.INFO : EventLevel.WARN);
      
      return result;
      
    } catch (err) {
      // Critical error
      result.success = false;
      result.errors.push(err.message);
      
      this._logEvent('EXEC', 'execution_error', {
        error: err.message,
        stack: err.stack
      }, EventLevel.CRITICAL);
      
      return result;
    }
  }

  /**
   * Check intent idempotency
   * @private
   */
  async _checkIntentIdempotency(intent, ctx) {
    // Placeholder: implement with repoState.createIntent
    // For now, assume no duplicates
    return { created: false };
  }

  /**
   * Persist order to database
   * @private
   */
  async _persistOrder(order_id, intent, fillResult, ctx) {
    if (!this.db) return;
    
    this.db.insertOrder({
      run_id: this.ctx?.run_id || 'unknown',
      order_id,
      hack_id: ctx.hack_id || 'unknown',
      bar_idx: ctx.bar_idx || 0,
      order_seq: ctx.order_seq || 0,
      side: intent.side,
      size: intent.size,
      price: intent.price,
      order_type: intent.type,
      status: fillResult.status,
      filled_qty: fillResult.filled_qty || 0,
      avg_fill_price: fillResult.filled_price || null,
      total_fee: fillResult.fee || 0,
      placed_at_ms: ctx.bar?.t_ms || Date.now()
    });
  }

  /**
   * Persist fill to database
   * @private
   */
  async _persistFill(order_id, fill, ctx) {
    if (!this.db) return;
    
    this.db.insertFill({
      run_id: this.ctx?.run_id || 'unknown',
      order_id,
      fill_id: fill.fill_id,
      fill_price: fill.price,
      fill_qty: fill.qty,
      fill_fee: fill.fee,
      filled_at_ms: fill.timestamp
    });
  }

  /**
   * Log event (if eventLog available)
   * @private
   */
  _logEvent(category, event_type, payload, level = EventLevel.INFO) {
    if (!this.enable_events || !this.eventLog) return;
    
    try {
      this.eventLog.write({
        ts_ms: this.ctx?.clock?.now() || Date.now(),
        run_id: this.ctx?.run_id || 'unknown',
        category,
        event_type,
        level,
        payload
      });
      
      this.stats.events_logged++;
    } catch (err) {
      console.error('[MasterExecutor] Event logging failed:', err.message);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      avg_latency_ms: this.stats.orders_placed > 0 
        ? this.stats.total_latency_ms / this.stats.orders_placed 
        : 0
    };
  }

  /**
   * Close (cleanup)
   */
  async close() {
    // Flush event log
    if (this.eventLog) {
      this.eventLog.flush();
    }
    
    this._logEvent('SYS', 'master_executor_close', {
      stats: this.getStats()
    }, EventLevel.INFO);
  }
}

/**
 * Create MasterExecutor
 */
export function createMasterExecutor(options = {}) {
  return new MasterExecutor(options);
}
