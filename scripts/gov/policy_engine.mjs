/**
 * policy_engine.mjs — Policy Kernel validator + helpers
 *
 * Loads and validates specs/policy_kernel.json.
 * No side effects. No I/O beyond initial kernel read.
 *
 * Exports: loadKernel, validateKernel, getModePolicy, getZoneForFile,
 *          isLegacyExempt, getScoreboardWeights
 */

import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'node:fs';

const ROOT = process.cwd();
const KERNEL_PATH = path.join(ROOT, 'specs/policy_kernel.json');
let _cached = null;

export function validateKernel(kernel) {
  const errors = [];
  if (!kernel || typeof kernel !== 'object') { errors.push('kernel must be object'); return { valid: false, errors }; }
  if (kernel.schema_version !== '1.0.0') errors.push(`schema_version must be "1.0.0", got "${kernel.schema_version}"`);
  if (!kernel.modes || typeof kernel.modes !== 'object') errors.push('modes must be object');
  const EXPECTED = ['ACCEL', 'AUDIT', 'CERT', 'CLOSE', 'LIFE', 'RESEARCH'];
  const got = Object.keys(kernel.modes || {}).sort();
  if (JSON.stringify(got) !== JSON.stringify(EXPECTED)) errors.push(`modes keys must be [${EXPECTED}], got [${got}]`);
  if (!kernel.zone_map || typeof kernel.zone_map !== 'object') errors.push('zone_map must be object');
  for (const [zid, z] of Object.entries(kernel.zone_map || {})) {
    if (!z.include_globs || !Array.isArray(z.include_globs)) errors.push(`zone_map.${zid}.include_globs must be array`);
  }
  if (!kernel.write_scope || typeof kernel.write_scope !== 'object') errors.push('write_scope must be object');
  if (kernel.scoreboard_weights) {
    const sum = Object.values(kernel.scoreboard_weights).reduce((a, b) => a + b, 0);
    if (sum !== 100) errors.push(`scoreboard_weights must sum to 100, got ${sum}`);
  }
  return { valid: errors.length === 0, errors };
}

export function loadKernel() {
  if (_cached) return _cached;
  const kernel = JSON.parse(fs.readFileSync(KERNEL_PATH, 'utf8'));
  const r = validateKernel(kernel);
  if (!r.valid) throw new Error(`POLICY_KERNEL_INVALID: ${r.errors.join('; ')}`);
  _cached = kernel;
  return kernel;
}

export function getModePolicy(mode) {
  return loadKernel().modes[mode] ?? null;
}

export function getZoneForFile(relPath) {
  const kernel = loadKernel();
  for (const [zid, z] of Object.entries(kernel.zone_map)) {
    let matched = false;
    for (const g of z.include_globs || []) {
      if (globSync(g, { cwd: ROOT }).includes(relPath)) { matched = true; break; }
    }
    if (!matched) continue;
    let excluded = false;
    for (const g of z.exclude_globs || []) {
      if (globSync(g, { cwd: ROOT }).includes(relPath)) { excluded = true; break; }
    }
    if (!excluded) return zid;
  }
  return null;
}

export function isLegacyExempt(dirName) {
  const patterns = loadKernel().write_scope?.legacy_exemptions?.patterns || [];
  for (const pat of patterns) {
    if (new RegExp(pat).test(dirName)) return true;
  }
  return false;
}

export function getScoreboardWeights() {
  return loadKernel().scoreboard_weights ?? {};
}
