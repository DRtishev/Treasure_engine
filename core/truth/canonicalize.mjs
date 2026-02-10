/**
 * TREASURE ENGINE: Canonicalization Layer (EPOCH-13)
 * 
 * Purpose: Canonicalize JSON outputs for determinism verification
 * Operations:
 * - Remove volatile fields (run_id, timestamps, etc.)
 * - Sort object keys
 * - Stable array ordering where applicable
 * 
 * CRITICAL: This enables byte-for-byte comparison of outputs
 */

/**
 * Volatile fields that should be removed for determinism checks
 * These fields are expected to change between runs
 */
const VOLATILE_FIELDS = [
  'run_id',
  'timestamp',
  'timestamp_utc',
  'created_at',
  'updated_at',
  'ts_ms', // In logs only, not in reports
  'wall_clock_ms',
  'execution_time_ms'
];

/**
 * Canonicalize a JSON object for determinism verification
 * 
 * @param {Object} obj - Object to canonicalize
 * @param {Object} options - Canonicalization options
 * @returns {Object} - Canonicalized object
 */
export function canonicalize(obj, options = {}) {
  const {
    removeVolatileFields = true,
    sortKeys = true,
    sortArrays = false,
    volatileFields = VOLATILE_FIELDS
  } = options;

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const canonicalArray = obj.map(item => canonicalize(item, options));
    
    if (sortArrays) {
      // Sort arrays by JSON stringification (stable but not always meaningful)
      return canonicalArray.sort((a, b) => {
        const aStr = JSON.stringify(a);
        const bStr = JSON.stringify(b);
        return aStr.localeCompare(bStr);
      });
    }
    
    return canonicalArray;
  }

  // Handle objects
  let result = {};

  // Get all keys
  const keys = Object.keys(obj);

  // Sort keys if requested
  const sortedKeys = sortKeys ? keys.sort() : keys;

  for (const key of sortedKeys) {
    // Skip volatile fields if requested
    if (removeVolatileFields && volatileFields.includes(key)) {
      continue;
    }

    // Recursively canonicalize value
    result[key] = canonicalize(obj[key], options);
  }

  return result;
}

/**
 * Canonicalize a simulation report
 * 
 * @param {Object} report - Simulation report to canonicalize
 * @returns {Object} - Canonicalized report
 */
export function canonicalizeReport(report) {
  return canonicalize(report, {
    removeVolatileFields: true,
    sortKeys: true,
    sortArrays: false
  });
}

/**
 * Canonicalize and stringify for comparison
 * 
 * @param {Object} obj - Object to canonicalize
 * @param {Object} options - Canonicalization options
 * @returns {string} - Canonicalized JSON string
 */
export function canonicalizeString(obj, options = {}) {
  const canonical = canonicalize(obj, options);
  return JSON.stringify(canonical, null, 2);
}

/**
 * Compare two objects after canonicalization
 * 
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @param {Object} options - Canonicalization options
 * @returns {boolean} - True if objects are equivalent after canonicalization
 */
export function areEquivalent(obj1, obj2, options = {}) {
  const canon1 = canonicalizeString(obj1, options);
  const canon2 = canonicalizeString(obj2, options);
  return canon1 === canon2;
}

/**
 * Get diff between two canonicalized objects
 * Returns array of differences
 * 
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @param {string} path - Current path (for recursion)
 * @returns {Array} - Array of difference objects {path, value1, value2}
 */
export function getDiff(obj1, obj2, path = '') {
  const diffs = [];

  // Canonicalize first
  const c1 = canonicalize(obj1);
  const c2 = canonicalize(obj2);

  // Handle primitives
  if (typeof c1 !== 'object' || typeof c2 !== 'object') {
    if (c1 !== c2) {
      diffs.push({ path, value1: c1, value2: c2 });
    }
    return diffs;
  }

  // Handle null
  if (c1 === null || c2 === null) {
    if (c1 !== c2) {
      diffs.push({ path, value1: c1, value2: c2 });
    }
    return diffs;
  }

  // Handle arrays
  if (Array.isArray(c1) && Array.isArray(c2)) {
    if (c1.length !== c2.length) {
      diffs.push({ path: `${path}.length`, value1: c1.length, value2: c2.length });
      return diffs;
    }

    for (let i = 0; i < c1.length; i++) {
      const itemPath = `${path}[${i}]`;
      diffs.push(...getDiff(c1[i], c2[i], itemPath));
    }

    return diffs;
  }

  // Handle objects
  const keys1 = Object.keys(c1).sort();
  const keys2 = Object.keys(c2).sort();

  // Check for missing keys
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    
    if (!(key in c1)) {
      diffs.push({ path: keyPath, value1: undefined, value2: c2[key] });
    } else if (!(key in c2)) {
      diffs.push({ path: keyPath, value1: c1[key], value2: undefined });
    } else {
      diffs.push(...getDiff(c1[key], c2[key], keyPath));
    }
  }

  return diffs;
}

/**
 * Format diff for human reading
 * 
 * @param {Array} diffs - Array of diffs from getDiff()
 * @returns {string} - Formatted diff string
 */
export function formatDiff(diffs) {
  if (diffs.length === 0) {
    return 'No differences found (deterministic).';
  }

  const lines = ['Differences found (non-deterministic):'];
  
  for (const diff of diffs) {
    lines.push(`  Path: ${diff.path}`);
    lines.push(`    Run 1: ${JSON.stringify(diff.value1)}`);
    lines.push(`    Run 2: ${JSON.stringify(diff.value2)}`);
  }

  return lines.join('\n');
}
