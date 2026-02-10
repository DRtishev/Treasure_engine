#!/usr/bin/env node
/**
 * TREASURE ENGINE: EventLog v2 (EPOCH-15)
 * 
 * Enhanced features:
 * - Dual sink: JSONL + SQLite (optional)
 * - Schema validation (strict mode)
 * - 6 event categories: SYS, EXEC, RISK, RECON, DATA, ORCH
 * - Monotonic sequence numbers
 * - Size cap + rotation
 * - Severity levels: DEBUG, INFO, WARN, ERROR, CRITICAL
 * 
 * CRITICAL: Deterministic, network-isolated, production-grade
 */

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

// Event categories
export const EventCategory = {
  SYS: 'SYS',       // System lifecycle
  EXEC: 'EXEC',     // Execution/trading
  RISK: 'RISK',     // Risk management
  RECON: 'RECON',   // Reconciliation
  DATA: 'DATA',     // Data pipeline
  ORCH: 'ORCH'      // Orchestration
};

// Severity levels
export const EventLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * EventLog v2 - Enhanced JSONL + optional DB logger
 */
export class EventLogV2 {
  constructor(options = {}) {
    this.run_id = options.run_id || 'unknown';
    this.log_dir = options.log_dir || 'logs/events';
    this.filename = options.filename || `run_${this.run_id}.jsonl`;
    this.filepath = path.join(this.log_dir, this.filename);
    
    // Dual sink: DB support (optional)
    this.db = options.db || null; // DatabaseManager instance from EPOCH-12
    
    // Strict validation mode
    this.strict_validation = options.strict_validation || false;
    
    // Schema validator (lazy loaded)
    this.validator = null;
    if (this.strict_validation) {
      this._initializeValidator();
    }
    
    // Buffering for performance
    this.buffer = [];
    this.buffer_size = options.buffer_size || 100;
    
    // Rotation settings
    this.max_lines = options.max_lines || 100000;
    this.max_bytes = options.max_bytes || 100 * 1024 * 1024; // 100MB
    this.current_lines = 0;
    this.current_bytes = 0;
    
    // Monotonic sequence
    this.seq = 0;
    
    // Auto-flush on exit
    this.auto_flush = options.auto_flush !== false;
    
    // Statistics
    this.stats = {
      total_events: 0,
      by_category: {},
      by_level: {},
      validation_errors: 0,
      db_writes: 0,
      file_writes: 0
    };
    
    // Ensure directory exists
    this.ensureDirectory();
    
    // Initialize file (truncate if exists)
    this.initializeFile();
    
    // Setup auto-flush on process exit
    if (this.auto_flush) {
      process.on('beforeExit', () => this.flush());
      process.on('SIGINT', () => {
        this.flush();
        process.exit(0);
      });
    }
  }

  /**
   * Initialize JSON schema validator
   * @private
   */
  _initializeValidator() {
    try {
      const schemaPath = path.join(process.cwd(), 'truth/event.schema.json');
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      
      const ajv = new Ajv({ allErrors: true });
      this.validator = ajv.compile(schema);
    } catch (err) {
      console.warn('[EventLog] Failed to load schema:', err.message);
      this.strict_validation = false;
    }
  }

  /**
   * Ensure log directory exists
   */
  ensureDirectory() {
    if (!fs.existsSync(this.log_dir)) {
      fs.mkdirSync(this.log_dir, { recursive: true });
    }
  }

  /**
   * Initialize log file (truncate if exists)
   */
  initializeFile() {
    // Create empty file or truncate existing
    fs.writeFileSync(this.filepath, '', 'utf8');
    this.current_lines = 0;
    this.current_bytes = 0;
  }

  /**
   * Rotate log file if needed
   * @private
   */
  _rotateIfNeeded() {
    if (this.current_lines >= this.max_lines || this.current_bytes >= this.max_bytes) {
      const timestamp = Date.now();
      const rotatedPath = `${this.filepath}.${timestamp}`;
      
      // Rename current file
      fs.renameSync(this.filepath, rotatedPath);
      
      // Create new file
      this.initializeFile();
      
      console.log(`[EventLog] Rotated log: ${rotatedPath}`);
    }
  }

  /**
   * Get next sequence number
   */
  nextSeq() {
    return this.seq++;
  }

  /**
   * Validate event against schema
   * @private
   */
  _validateEvent(event) {
    if (!this.strict_validation || !this.validator) {
      return { valid: true };
    }

    const valid = this.validator(event);
    
    if (!valid) {
      return {
        valid: false,
        errors: this.validator.errors
      };
    }

    return { valid: true };
  }

  /**
   * Write event to log (dual sink: file + DB)
   */
  write(event) {
    // Validate event structure
    if (!event) {
      throw new Error('Event is required');
    }

    // Add sequence number if not present
    if (event.seq === undefined) {
      event.seq = this.nextSeq();
    }

    // Add default level if not present
    if (!event.level) {
      event.level = EventLevel.INFO;
    }

    // Enrich with run_id if not present
    if (!event.run_id) {
      event.run_id = this.run_id;
    }

    // Validate against schema (if strict mode)
    const validation = this._validateEvent(event);
    if (!validation.valid) {
      this.stats.validation_errors++;
      
      if (this.strict_validation) {
        throw new Error(`Event validation failed: ${JSON.stringify(validation.errors)}`);
      } else {
        console.warn('[EventLog] Validation warning:', validation.errors);
      }
    }

    // Update statistics
    this.stats.total_events++;
    this.stats.by_category[event.category] = (this.stats.by_category[event.category] || 0) + 1;
    this.stats.by_level[event.level] = (this.stats.by_level[event.level] || 0) + 1;

    // Write to DB (if available)
    if (this.db) {
      try {
        this.db.insertEvent({
          run_id: event.run_id,
          seq: event.seq,
          ts_ms: event.ts_ms,
          category: event.category,
          event_type: event.event_type,
          level: event.level,
          payload_json: JSON.stringify(event.payload || {}),
          correlation_id: event.correlation_id || null
        });
        this.stats.db_writes++;
      } catch (err) {
        console.error('[EventLog] DB write failed:', err.message);
      }
    }

    // Add to buffer for file write
    this.buffer.push(event);

    // Flush if buffer full
    if (this.buffer.length >= this.buffer_size) {
      this.flush();
    }
  }

  /**
   * Write system event
   */
  sys(event_type, payload = {}, options = {}) {
    this.write({
      ts_ms: options.ts_ms || Date.now(),
      run_id: this.run_id,
      category: EventCategory.SYS,
      event_type,
      level: options.level || EventLevel.INFO,
      payload,
      correlation_id: options.correlation_id
    });
  }

  /**
   * Write execution event
   */
  exec(event_type, payload = {}, options = {}) {
    this.write({
      ts_ms: options.ts_ms || Date.now(),
      run_id: this.run_id,
      category: EventCategory.EXEC,
      event_type,
      level: options.level || EventLevel.INFO,
      payload,
      correlation_id: options.correlation_id
    });
  }

  /**
   * Write risk event
   */
  risk(event_type, payload = {}, options = {}) {
    this.write({
      ts_ms: options.ts_ms || Date.now(),
      run_id: this.run_id,
      category: EventCategory.RISK,
      event_type,
      level: options.level || EventLevel.WARN,
      payload,
      correlation_id: options.correlation_id
    });
  }

  /**
   * Write reconciliation event
   */
  recon(event_type, payload = {}, options = {}) {
    this.write({
      ts_ms: options.ts_ms || Date.now(),
      run_id: this.run_id,
      category: EventCategory.RECON,
      event_type,
      level: options.level || EventLevel.INFO,
      payload,
      correlation_id: options.correlation_id
    });
  }

  /**
   * Write data event
   */
  data(event_type, payload = {}, options = {}) {
    this.write({
      ts_ms: options.ts_ms || Date.now(),
      run_id: this.run_id,
      category: EventCategory.DATA,
      event_type,
      level: options.level || EventLevel.DEBUG,
      payload,
      correlation_id: options.correlation_id
    });
  }

  /**
   * Write orchestration event
   */
  orch(event_type, payload = {}, options = {}) {
    this.write({
      ts_ms: options.ts_ms || Date.now(),
      run_id: this.run_id,
      category: EventCategory.ORCH,
      event_type,
      level: options.level || EventLevel.INFO,
      payload,
      correlation_id: options.correlation_id
    });
  }

  /**
   * Flush buffer to disk
   */
  flush() {
    if (this.buffer.length === 0) {
      return;
    }

    try {
      // Convert each event to JSON line
      const lines = this.buffer.map(event => JSON.stringify(event)).join('\n') + '\n';
      
      // Append to file
      fs.appendFileSync(this.filepath, lines, 'utf8');
      
      // Update counters
      this.current_lines += this.buffer.length;
      this.current_bytes += Buffer.byteLength(lines, 'utf8');
      this.stats.file_writes += this.buffer.length;
      
      // Clear buffer
      this.buffer = [];
      
      // Check if rotation needed
      this._rotateIfNeeded();
    } catch (err) {
      console.error('[EventLog] Flush failed:', err.message);
    }
  }

  /**
   * Close log (flush and cleanup)
   */
  close() {
    this.flush();
  }

  /**
   * Get log file path
   */
  getFilepath() {
    return this.filepath;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      run_id: this.run_id,
      filepath: this.filepath,
      total_events: this.stats.total_events,
      by_category: this.stats.by_category,
      by_level: this.stats.by_level,
      validation_errors: this.stats.validation_errors,
      db_writes: this.stats.db_writes,
      file_writes: this.stats.file_writes,
      buffered_events: this.buffer.length,
      current_lines: this.current_lines,
      current_bytes: this.current_bytes
    };
  }

  /**
   * Get buffer status
   */
  getStatus() {
    return {
      run_id: this.run_id,
      filepath: this.filepath,
      buffered_events: this.buffer.length,
      buffer_size: this.buffer_size,
      seq: this.seq
    };
  }
}

/**
 * Create EventLog v2
 */
export function createEventLog(options = {}) {
  return new EventLogV2(options);
}

export default EventLogV2;
