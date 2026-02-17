#!/usr/bin/env node
// Foundation Paths Module - E101 Track 1
// Path invariance and normalization

import path from 'node:path';

/**
 * Get repo root placeholder for portable evidence
 * E100-4: Path invariance - use <REPO_ROOT> instead of absolute paths
 */
export function repoRootPlaceholder() {
  return '<REPO_ROOT>';
}

/**
 * Normalize absolute paths to use <REPO_ROOT> placeholder
 * E101-1B: Centralized path normalization
 * @param {string} text - Text that may contain absolute paths
 * @returns {string} Text with absolute paths replaced by <REPO_ROOT>
 */
export function normalizeToRepoRoot(text) {
  const cwd = process.cwd();
  // Replace absolute repo root path with placeholder
  return text.replace(new RegExp(cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), repoRootPlaceholder());
}

/**
 * Detect absolute paths in text
 * E101-10B: Path invariance contract
 * @param {string} text - Text to scan
 * @returns {Array<{line: number, text: string, pattern: string}>} Found violations
 */
export function detectAbsolutePaths(text) {
  const violations = [];
  const lines = text.split('\n');

  // Patterns that indicate absolute paths (but allow <REPO_ROOT> placeholder)
  const patterns = [
    { regex: /\/workspace\//g, name: '/workspace/' },
    { regex: /\/home\//g, name: '/home/' },
    { regex: /\/Users\//g, name: '/Users/' },
    { regex: /[A-Z]:\\/g, name: 'C:\\' },
    { regex: /\\\\/g, name: '\\\\' }
  ];

  lines.forEach((line, idx) => {
    // Skip if line contains <REPO_ROOT> placeholder (this is OK)
    if (line.includes(repoRootPlaceholder())) return;

    for (const { regex, name } of patterns) {
      const matches = line.match(regex);
      if (matches) {
        violations.push({
          line: idx + 1,
          text: line.trim().slice(0, 100),
          pattern: name
        });
        break; // One violation per line is enough
      }
    }
  });

  return violations;
}

/**
 * Check if a path is likely absolute
 * @param {string} p - Path to check
 * @returns {boolean}
 */
export function isAbsolutePath(p) {
  return path.isAbsolute(p) || /^[A-Z]:\\/.test(p) || /^\/\//.test(p);
}
