#!/usr/bin/env node
// Foundation Git Module - E101 Track 1
// Git operations and porcelain parsing

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Check if .git directory exists
 * E101-9: Bootstrap NO-GIT mode support
 */
export function gitPresent() {
  return fs.existsSync(path.resolve('.git'));
}

/**
 * Get git status --porcelain output
 * @returns {string} Raw porcelain output (trimmed)
 */
export function gitStatusPorcelain() {
  if (!gitPresent()) return '';
  const result = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return (result.stdout || '').trim();
}

/**
 * Parse git status --porcelain output into Map<path, status>
 * E101-1C: Fix for E100 parseMap bug - NO trim() before slice
 *
 * Format: "XY path" where:
 * - X = index status (position 0)
 * - Y = worktree status (position 1)
 * - position 2 = space separator
 * - position 3+ = file path
 *
 * CRITICAL: Do NOT trim rows before slicing, as leading space is part of status format
 *
 * @param {string} text - Raw git status --porcelain output
 * @returns {Map<string, string>} Map of path -> "XY" status
 */
export function parsePorcelainMap(text) {
  const m = new Map();
  for (const row of text.split('\n').filter(Boolean)) {
    if (row.length < 3) continue;
    // CRITICAL: slice(3) on original text (no trim) to preserve format
    // E101-3: Regression test confirmed this fix
    m.set(row.slice(3), row.slice(0, 2));
  }
  return m;
}

/**
 * Get changed files between two git status snapshots
 * @param {string} before - Git status before
 * @param {string} after - Git status after
 * @returns {string[]} List of changed file paths
 */
export function getChangedFiles(before, after) {
  const b = parsePorcelainMap(before);
  const a = parsePorcelainMap(after);
  const changed = [];

  // Files modified or added in after
  for (const [path, status] of a.entries()) {
    if (!b.has(path) || b.get(path) !== status) {
      changed.push(path);
    }
  }

  // Files deleted (in before but not in after)
  for (const path of b.keys()) {
    if (!a.has(path)) {
      changed.push(path);
    }
  }

  return changed;
}

/**
 * Get git branch name
 */
export function gitBranch() {
  if (!gitPresent()) return 'NO_GIT';
  const result = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
  return (result.stdout || '').trim() || 'DETACHED';
}

/**
 * Get git HEAD SHA
 */
export function gitHead() {
  if (!gitPresent()) return 'NO_GIT';
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return (result.stdout || '').trim() || 'UNKNOWN';
}

/**
 * Get git status -sb (short branch format)
 */
export function gitStatusShort() {
  if (!gitPresent()) return 'NO_GIT';
  const result = spawnSync('git', ['status', '-sb'], { encoding: 'utf8' });
  return (result.stdout || '').trim();
}
