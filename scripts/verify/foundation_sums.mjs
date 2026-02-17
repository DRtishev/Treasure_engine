#!/usr/bin/env node
// Foundation Sums Module - E101 Track 1
// SHA256SUMS generation and verification

import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';

/**
 * Rewrite SHA256SUMS.md with deterministic ordering
 * E101-1D: Centralized SHA256SUMS generation
 *
 * @param {string} dir - Evidence directory
 * @param {string[]} excludes - Files to exclude (e.g., ['SHA256SUMS.md', 'BUNDLE_HASH.md'])
 * @param {string} relativeTo - Base path for relative paths in sums
 */
export function rewriteSums(dir, excludes = [], relativeTo = 'reports/evidence') {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !excludes.includes(f))
    .sort(); // Deterministic ordering

  const lines = files.map(f => {
    const fullPath = path.join(dir, f);
    const relPath = path.join(relativeTo, path.basename(dir), f);
    return `${sha256File(fullPath)}  ${relPath}`;
  });

  const sumsPath = path.join(dir, 'SHA256SUMS.md');
  const content = `# ${path.basename(dir)} SHA256SUMS\n\n${lines.join('\n')}`;

  fs.writeFileSync(sumsPath, content, 'utf8');
}

/**
 * Verify SHA256SUMS.md integrity
 * E101-1D: Uses sha256sum -c contract method
 *
 * @param {string} manifestPath - Path to SHA256SUMS.md
 * @param {string[]} forbiddenFiles - Files that should NOT appear in sums
 * @throws {Error} if verification fails
 */
export function verifySums(manifestPath, forbiddenFiles = []) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`SHA256SUMS not found: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');

  // Check forbidden files
  for (const forbidden of forbiddenFiles) {
    const pattern = new RegExp(`\\s${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');
    if (pattern.test(raw)) {
      throw new Error(`Forbidden file in SHA256SUMS: ${forbidden}`);
    }
  }

  // Parse and verify each hash
  const rows = raw.split(/\r?\n/).filter(line => /^[a-f0-9]{64}\s{2}/.test(line));

  for (const line of rows) {
    const [expectedHash, relPath] = line.split(/\s{2}/);
    const absPath = path.resolve(relPath);

    if (!fs.existsSync(absPath)) {
      throw new Error(`SHA256SUMS references missing file: ${relPath}`);
    }

    const actualHash = sha256File(absPath);
    if (actualHash !== expectedHash) {
      throw new Error(`SHA256 mismatch: ${relPath} (expected ${expectedHash}, got ${actualHash})`);
    }
  }

  return rows.length; // Return count of verified files
}

/**
 * Read core sums text (filtered, for fingerprinting)
 * Excludes derived files that cause circular dependencies
 *
 * @param {string} manifestPath - Path to SHA256SUMS.md
 * @param {string[]} excludeSuffixes - File suffixes to exclude
 * @returns {string} Filtered sums text
 */
export function readSumsCoreText(manifestPath, excludeSuffixes = []) {
  if (!fs.existsSync(manifestPath)) return '';

  const raw = fs.readFileSync(manifestPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter(line => {
    // Keep non-hash lines (headers)
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;

    // Exclude lines ending with specified suffixes
    for (const suffix of excludeSuffixes) {
      if (line.endsWith(suffix)) return false;
    }

    return true;
  });

  return `${lines.join('\n').replace(/\s+$/g, '')}\n`;
}
