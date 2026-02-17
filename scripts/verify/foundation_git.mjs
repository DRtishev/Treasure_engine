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
 * Unquote git porcelain path if quoted
 * E104-B1: Handle quoted paths (spaces, special chars)
 */
function unquotePath(p) {
  if (p.startsWith('"') && p.endsWith('"')) {
    return p.slice(1, -1);
  }
  return p;
}

/**
 * Parse git status --porcelain output into Map<path, status>
 * E101-1C: Fix for E100 parseMap bug - NO trim() before slice
 * E104-B1: Enhanced to handle renames, copies, quoted paths
 *
 * Format: "XY path" or "XY oldpath -> newpath" (for R/C)
 * - X = index status (position 0)
 * - Y = worktree status (position 1)
 * - position 2 = space separator
 * - position 3+ = file path (may be quoted if contains spaces)
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
    const xy = row.slice(0, 2);
    let pathPart = row.slice(3);

    // Handle renames and copies (R/C) with "oldpath -> newpath" format
    if ((xy[0] === 'R' || xy[0] === 'C') && pathPart.includes(' -> ')) {
      const parts = pathPart.split(' -> ');
      if (parts.length === 2) {
        const oldPath = unquotePath(parts[0]);
        const newPath = unquotePath(parts[1]);
        // Track both old and new paths for scope enforcement
        m.set(oldPath, xy);
        m.set(newPath, xy);
        continue;
      }
    }

    // Handle quoted paths (spaces, special chars)
    const cleanPath = unquotePath(pathPart);
    m.set(cleanPath, xy);
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
