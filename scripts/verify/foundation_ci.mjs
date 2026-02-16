#!/usr/bin/env node
// Foundation CI Module - E101 Track 1
// CI truthiness and environment validation

/**
 * Check if running in CI mode (truthy = 'true' OR '1')
 * E100-1 security hardening: both CI='true' and CI='1' are truthy
 */
export function isCIMode() {
  const ci = String(process.env.CI || '');
  return ci === 'true' || ci === '1';
}

/**
 * Forbid specific environment variable prefixes when CI is truthy
 * E101-1A: Centralized enforcement for security boundary
 * @param {string[]} prefixes - List of forbidden prefixes (e.g., ['UPDATE_', 'APPLY_'])
 * @throws {Error} if any forbidden var is set and non-empty when CI is truthy
 */
export function forbidEnvInCI(prefixes = [
  'UPDATE_',
  'APPLY_',
  'ROLLBACK_',
  'DEMO_',
  'DRILL_',
  'CLEAR_',
  'BOOTSTRAP_'
]) {
  if (!isCIMode()) return;

  for (const key of Object.keys(process.env)) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        const val = String(process.env[key] || '').trim();
        if (val !== '') {
          throw new Error(`${key} forbidden when CI=${process.env.CI}`);
        }
      }
    }
  }
}

/**
 * Get CI mode as string for evidence
 */
export function getCIModeString() {
  return String(process.env.CI || '');
}
