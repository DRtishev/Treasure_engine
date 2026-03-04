/**
 * capsule_lock.mjs — Data Capsule Lock Utility
 *
 * Creates SHA256-locked data capsules with integrity verification.
 * Used by data acquisition scripts to lock acquired data.
 *
 * Capsule lock format:
 * {
 *   schema_version: "1.0.0",
 *   capsule_id: string,
 *   source: string,
 *   symbol: string,
 *   data_type: string, // "ohlcv" | "funding_rate" | "open_interest"
 *   range_start: string, // ISO 8601
 *   range_end: string,   // ISO 8601
 *   row_count: number,
 *   sha256: string,
 *   format: "jsonl",
 *   status: "LOCKED"
 * }
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

/**
 * Compute SHA256 hash of file contents.
 * @param {string} filePath - Path to file
 * @returns {string} Hex digest
 */
export function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA256 hash of string/buffer.
 * @param {string|Buffer} data
 * @returns {string} Hex digest
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create a capsule lock file for a data file.
 * @param {Object} opts
 * @param {string} opts.dataPath - Path to the data file
 * @param {string} opts.lockPath - Path for the lock file
 * @param {string} opts.capsule_id - Unique capsule identifier
 * @param {string} opts.source - Data source (e.g. "binance_public_api")
 * @param {string} opts.symbol - Trading pair (e.g. "BTCUSDT")
 * @param {string} opts.data_type - Type of data
 * @param {string} opts.range_start - ISO 8601 start of data range
 * @param {string} opts.range_end - ISO 8601 end of data range
 * @param {number} opts.row_count - Number of data rows
 * @returns {Object} The lock object
 */
export function createCapsuleLock(opts) {
  const hash = sha256File(opts.dataPath);

  const lock = {
    schema_version: '1.0.0',
    capsule_id: opts.capsule_id,
    source: opts.source,
    symbol: opts.symbol,
    data_type: opts.data_type,
    range_start: opts.range_start,
    range_end: opts.range_end,
    row_count: opts.row_count,
    sha256: hash,
    format: 'jsonl',
    status: 'LOCKED',
  };

  fs.writeFileSync(opts.lockPath, JSON.stringify(lock, null, 2) + '\n');
  return lock;
}

/**
 * Verify capsule integrity against its lock file.
 * @param {string} dataPath - Path to data file
 * @param {string} lockPath - Path to lock file
 * @returns {{ valid: boolean, expected: string, actual: string, lock: Object }}
 */
export function verifyCapsuleIntegrity(dataPath, lockPath) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const actual = sha256File(dataPath);

  return {
    valid: actual === lock.sha256,
    expected: lock.sha256,
    actual,
    lock,
  };
}

/**
 * List all locked capsules in a directory.
 * @param {string} dir - Capsules directory
 * @returns {Array<Object>} Array of lock objects with paths
 */
export function listLockedCapsules(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.lock.json'));
  return files.map(f => {
    const lockPath = `${dir}/${f}`;
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const dataFile = f.replace('.lock.json', '.jsonl');
    const dataPath = `${dir}/${dataFile}`;
    return {
      ...lock,
      lock_path: lockPath,
      data_path: dataPath,
      data_exists: fs.existsSync(dataPath),
    };
  });
}
