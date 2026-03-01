/**
 * write_json_deterministic.mjs — R13 compliant deterministic JSON writer
 *
 * Rules (R13 + R14):
 * - Recursive key sort (ASCII lexicographic)
 * - Stable array policy: preserve order unless array element is plain string/number (naturally stable)
 * - schema_version REQUIRED in root object
 * - timestamps FORBIDDEN in JSON (no ISO date strings, no epoch ms fields named *_at / *_ts / timestamp*)
 * - Written via this helper ONLY — never via JSON.stringify directly for gate outputs
 */

import fs from 'node:fs';
import path from 'node:path';

// Forbidden timestamp field patterns (word-boundary insensitive check)
const TIMESTAMP_FIELD_RE = /(_at|_ts|timestamp|created|updated|generated|date)$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Sort object keys recursively (ASCII lexicographic).
 * Arrays: preserve element order (stable array policy).
 * @param {unknown} value
 * @returns {unknown} sorted copy
 */
export function sortKeysRecursive(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursive);
  }
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysRecursive(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Validate no timestamps are present in a JSON object tree.
 * Throws FP01 error if a forbidden field or ISO timestamp value is detected.
 * @param {unknown} value
 * @param {string} path current path for error messages
 */
function validateNoTimestamps(value, keyPath = '') {
  if (Array.isArray(value)) {
    value.forEach((v, i) => validateNoTimestamps(v, `${keyPath}[${i}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      const fullPath = keyPath ? `${keyPath}.${key}` : key;
      // Check field name
      if (TIMESTAMP_FIELD_RE.test(key)) {
        throw new Error(
          `FP01: Forbidden timestamp field "${fullPath}" in machine JSON. Remove all timestamp fields.`
        );
      }
      // Check string values for ISO date patterns
      if (typeof val === 'string' && ISO_DATE_RE.test(val)) {
        throw new Error(
          `FP01: Forbidden ISO timestamp value at "${fullPath}" = "${val}". Remove all timestamp values.`
        );
      }
      validateNoTimestamps(val, fullPath);
    }
  }
}

/**
 * Validate schema_version is present at root.
 * @param {object} data
 */
function validateSchemaVersion(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('FP01: Machine JSON root must be an object with schema_version field.');
  }
  if (!('schema_version' in data)) {
    throw new Error(
      'FP01: Missing required field "schema_version" in machine JSON. All gate outputs require schema_version.'
    );
  }
  if (typeof data.schema_version !== 'string') {
    throw new Error('FP01: schema_version must be a string (e.g. "1.0.0").');
  }
}

/**
 * Write a deterministic, schema-validated JSON file.
 *
 * @param {string} filePath — absolute or relative path to write
 * @param {object} data — plain object with required schema_version
 * @param {object} [opts]
 * @param {boolean} [opts.skipTimestampCheck] — skip timestamp validation (only for test fixtures)
 */
export function writeJsonDeterministic(filePath, data, opts = {}) {
  validateSchemaVersion(data);
  if (!opts.skipTimestampCheck) {
    validateNoTimestamps(data);
  }
  // PR07: normalize run_id in EXECUTOR receipts to prevent churn
  let toWrite = data;
  if (filePath.includes('reports/evidence/EXECUTOR') && toWrite.run_id) {
    toWrite = { ...toWrite, run_id: 'STABLE' };
  }
  const sorted = sortKeysRecursive(toWrite);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n');
}

/**
 * Read and parse a deterministic JSON file with schema validation.
 * @param {string} filePath
 * @returns {object}
 */
export function readJsonDeterministic(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`FP01: Machine JSON file not found: ${filePath}`);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`FP01: Failed to parse machine JSON at ${filePath}: ${e.message}`);
  }
  validateSchemaVersion(data);
  return data;
}
