#!/usr/bin/env node
// Foundation Lock Module - E101 Track 1
// Kill-lock management

import fs from 'node:fs';
import path from 'node:path';

const LOCK_DIR = '.foundation-seal';

/**
 * Get kill-lock path for epoch
 * @param {string} epoch - Epoch name (e.g., 'E97', 'E101')
 */
export function getKillLockPath(epoch) {
  return path.resolve(LOCK_DIR, `${epoch}_KILL_LOCK.md`);
}

/**
 * Check if kill-lock exists for epoch
 * E101-1E: Centralized kill-lock check
 *
 * @param {string} epoch - Epoch name
 * @returns {boolean}
 */
export function checkKillLock(epoch) {
  const lockPath = getKillLockPath(epoch);
  return fs.existsSync(lockPath);
}

/**
 * Arm kill-lock for epoch with reason
 * E101-1E: Prevents further runs after critical failure
 *
 * @param {string} epoch - Epoch name
 * @param {string} reason - Failure reason
 */
export function armKillLock(epoch, reason) {
  const lockPath = getKillLockPath(epoch);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  const content = [
    `# ${epoch} KILL LOCK`,
    `- reason: ${reason}`,
    `- timestamp: ${new Date().toISOString()}`,
    `- clear_rule: CI=false CLEAR_${epoch}_KILL_LOCK=1`,
    '',
    'This lock prevents further execution after a critical failure.',
    `Run with CLEAR_${epoch}_KILL_LOCK=1 to clear and retry.`
  ].join('\n');

  fs.writeFileSync(lockPath, content, 'utf8');
}

/**
 * Clear kill-lock for epoch (requires explicit flag)
 * E101-1E: Explicit clear prevents accidental rerun
 *
 * @param {string} epoch - Epoch name
 * @param {string} flagName - Environment variable name to check (e.g., 'CLEAR_E101_KILL_LOCK')
 * @returns {boolean} true if cleared, false if flag not set
 */
export function clearKillLock(epoch, flagName) {
  if (process.env[flagName] !== '1') {
    return false;
  }

  const lockPath = getKillLockPath(epoch);
  if (fs.existsSync(lockPath)) {
    fs.rmSync(lockPath, { force: true });
  }

  return true;
}

/**
 * Throw if kill-lock is active
 * @param {string} epoch - Epoch name
 * @throws {Error} if kill-lock exists
 */
export function enforceNoKillLock(epoch) {
  if (checkKillLock(epoch)) {
    const lockPath = getKillLockPath(epoch);
    throw new Error(`kill-lock active: ${lockPath}`);
  }
}
