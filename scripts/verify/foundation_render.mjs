#!/usr/bin/env node
// Foundation Render Module - E101 Track 1
// Stable sorting, formatting, and rendering (locale-invariant)

/**
 * Stable sort for objects by key
 * E101-1F: Deterministic ordering regardless of insertion order
 *
 * @param {Object} obj - Object to sort
 * @returns {Object} New object with sorted keys
 */
export function stableSortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

/**
 * Stable sort for array of objects by key
 * @param {Array} arr - Array of objects
 * @param {string} key - Key to sort by
 * @returns {Array} Sorted array
 */
export function stableSortByKey(arr, key) {
  return arr.slice().sort((a, b) => {
    const aVal = String(a[key] || '');
    const bVal = String(b[key] || '');
    return aVal.localeCompare(bVal, 'en', { sensitivity: 'base' });
  });
}

/**
 * Format number with stable precision (no locale surprises)
 * E101-1F: Consistent number formatting
 *
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export function stableFormatNumber(num, decimals = 2) {
  // Use toFixed for stable decimal representation
  return Number(num).toFixed(decimals);
}

/**
 * Format duration in seconds to human-readable (stable)
 * @param {number} seconds - Duration in seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${stableFormatNumber(seconds, 1)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${stableFormatNumber(secs, 0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h${mins}m`;
  }
}

/**
 * Render markdown table with stable column widths
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<string>>} rows - Data rows
 * @returns {string} Markdown table
 */
export function renderMarkdownTable(headers, rows) {
  const lines = [];

  // Header row
  lines.push(`| ${headers.join(' | ')} |`);

  // Separator row
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  // Data rows
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Render key-value pairs as markdown list
 * @param {Object} obj - Object with key-value pairs
 * @param {boolean} sorted - Sort keys alphabetically
 * @returns {string}
 */
export function renderKeyValueList(obj, sorted = true) {
  const keys = sorted ? Object.keys(obj).sort() : Object.keys(obj);
  return keys.map(k => `- ${k}: ${obj[k]}`).join('\n');
}

/**
 * Ensure consistent line endings (LF only, no CRLF)
 * E101-10D: EOL contract enforcement
 *
 * @param {string} text - Text to normalize
 * @returns {string} Text with LF endings
 */
export function normalizeLF(text) {
  return text.replace(/\r\n/g, '\n');
}

/**
 * Detect CRLF line endings
 * @param {string} text - Text to check
 * @returns {boolean} true if CRLF found
 */
export function hasCRLF(text) {
  return /\r\n/.test(text);
}
