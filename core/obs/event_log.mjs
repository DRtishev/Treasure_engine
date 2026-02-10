#!/usr/bin/env node
// core/obs/event_log.mjs
// JSONL event logger for observability
// Categories: SYS (system), EXEC (execution), RISK (risk management)

import fs from 'fs';
import path from 'path';

/**
 * EventLog - JSONL logger for system events
 * Each event is a JSON object on a single line
 * Format: {"ts_ms":123,"run_id":"x","category":"SYS","event":"start","payload":{}}
 */
export class EventLog {
  constructor(options = {}) {
    this.run_id = options.run_id || 'unknown';
    this.log_dir = options.log_dir || 'logs/events';
    this.filename = `run_${this.run_id}.jsonl`;
    this.filepath = path.join(this.log_dir, this.filename);
    
    // Buffering for performance
    this.buffer = [];
    this.buffer_size = options.buffer_size || 100;
    
    // Auto-flush on exit
    this.auto_flush = options.auto_flush !== false;
    
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
  }

  /**
   * Write event to log
   * @param {Object} event - Event object
   * @param {number} event.ts_ms - Timestamp in milliseconds
   * @param {string} event.run_id - Run identifier
   * @param {string} event.category - SYS | EXEC | RISK
   * @param {string} event.event - Event name
   * @param {Object} event.payload - Event data
   */
  write(event) {
    // Validate event structure
    if (!event) {
      throw new Error('Event is required');
    }

    if (!['SYS', 'EXEC', 'RISK'].includes(event.category)) {
      throw new Error(`Invalid category: ${event.category}. Must be SYS, EXEC, or RISK`);
    }

    if (!event.event) {
      throw new Error('Event name is required');
    }

    // Enrich with run_id if not present
    if (!event.run_id) {
      event.run_id = this.run_id;
    }

    // Add to buffer
    this.buffer.push(event);

    // Flush if buffer full
    if (this.buffer.length >= this.buffer_size) {
      this.flush();
    }
  }

  /**
   * Write system event
   */
  sys(event, payload = {}, ts_ms = null) {
    this.write({
      ts_ms: ts_ms || Date.now(),
      run_id: this.run_id,
      category: 'SYS',
      event,
      payload
    });
  }

  /**
   * Write execution event
   */
  exec(event, payload = {}, ts_ms = null) {
    this.write({
      ts_ms: ts_ms || Date.now(),
      run_id: this.run_id,
      category: 'EXEC',
      event,
      payload
    });
  }

  /**
   * Write risk event
   */
  risk(event, payload = {}, ts_ms = null) {
    this.write({
      ts_ms: ts_ms || Date.now(),
      run_id: this.run_id,
      category: 'RISK',
      event,
      payload
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
      
      // Clear buffer
      this.buffer = [];
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
   * Get buffer status
   */
  getStatus() {
    return {
      run_id: this.run_id,
      filepath: this.filepath,
      buffered_events: this.buffer.length,
      buffer_size: this.buffer_size
    };
  }
}

/**
 * Validate event log file
 * Returns validation result
 */
export function validateEventLog(filepath) {
  if (!fs.existsSync(filepath)) {
    return {
      valid: false,
      error: 'File does not exist'
    };
  }

  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.trim().split('\n');

    if (lines.length === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }

    const events = {
      SYS: 0,
      EXEC: 0,
      RISK: 0
    };

    let invalid_lines = 0;

    // Validate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const event = JSON.parse(line);
        
        // Count by category
        if (event.category) {
          events[event.category] = (events[event.category] || 0) + 1;
        }
      } catch (err) {
        invalid_lines++;
      }
    }

    if (invalid_lines > 0) {
      return {
        valid: false,
        error: `${invalid_lines} invalid JSON lines`
      };
    }

    return {
      valid: true,
      total_events: lines.length,
      by_category: events
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
}

export default EventLog;
