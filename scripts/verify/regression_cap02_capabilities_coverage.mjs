/**
 * regression_cap02_capabilities_coverage.mjs — RG_CAP02_CAPABILITIES_COVERAGE
 *
 * Gate: specs/data_capabilities.json confidence_map.coverage must contain
 *       entries for all three required path pattern zones:
 *         capabilities.*.policy.*
 *         capabilities.*.rate_limits.*
 *         capabilities.*.orderbook.*
 *       For each active provider in capabilities, all three zones must be covered.
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:cap02-capabilities-coverage';
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');
const REQUIRED_ZONES = ['policy', 'rate_limits', 'orderbook'];
const OPTIONAL_ZONES = ['scopes']; // valid but not required for every provider
const VALID_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
const checks = [];

if (!fs.existsSync(CAP_PATH)) {
  checks.push({ check: 'capabilities_file_exists', pass: false, detail: `missing: ${CAP_PATH}` });
} else {
  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
    checks.push({ check: 'capabilities_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    checks.push({ check: 'capabilities_parseable', pass: false, detail: `parse error: ${e.message}` });
    cap = null;
  }

  if (cap && cap.capabilities && cap.confidence_map && cap.confidence_map.coverage) {
    const providers = Object.keys(cap.capabilities).sort();
    const coverage = cap.confidence_map.coverage;
    checks.push({ check: 'providers_present', pass: providers.length > 0, detail: `providers=${providers.join(',')}` });

    const ALL_VALID_ZONES = [...REQUIRED_ZONES, ...OPTIONAL_ZONES];

    for (const provider of providers) {
      const provCaps = cap.capabilities[provider] || {};
      for (const zone of REQUIRED_ZONES) {
        const key = `capabilities.${provider}.${zone}`;
        const hasEntry = Object.keys(coverage).some((k) => k === key || k.startsWith(`${key}.`));
        const confLevel = coverage[key];
        const validLevel = !confLevel || VALID_CONFIDENCE.includes(confLevel);
        checks.push({
          check: `coverage_${provider}_${zone}`,
          pass: hasEntry && validLevel,
          detail: hasEntry
            ? `key=${key} level=${confLevel} — OK`
            : `MISSING: no coverage entry for ${key}`,
        });
      }
      // Optional zones: only required if the provider has the field
      for (const zone of OPTIONAL_ZONES) {
        if (!(zone in provCaps)) continue; // skip if provider doesn't have this zone
        const key = `capabilities.${provider}.${zone}`;
        const hasEntry = Object.keys(coverage).some((k) => k === key || k.startsWith(`${key}.`));
        const confLevel = coverage[key];
        const validLevel = !confLevel || VALID_CONFIDENCE.includes(confLevel);
        checks.push({
          check: `coverage_${provider}_${zone}`,
          pass: hasEntry && validLevel,
          detail: hasEntry
            ? `key=${key} level=${confLevel} — OK`
            : `MISSING: no coverage entry for ${key} (provider has ${zone} field)`,
        });
      }
    }

    // All coverage keys must reference known providers and zones (required + optional)
    const allKeys = Object.keys(coverage);
    const badKeys = allKeys.filter((k) => {
      const parts = k.split('.');
      // Expected format: capabilities.<provider>.<zone> or capabilities.<provider>.<zone>.<field>
      if (parts.length < 3 || parts[0] !== 'capabilities') return true;
      if (!providers.includes(parts[1])) return true;
      if (!ALL_VALID_ZONES.includes(parts[2])) return true;
      return false;
    });
    checks.push({
      check: 'no_unknown_coverage_keys',
      pass: badKeys.length === 0,
      detail: badKeys.length === 0 ? `all ${allKeys.length} keys valid — OK` : `UNKNOWN_KEYS: ${badKeys.join(',')}`,
    });

    // required_path_patterns must include all three required zones
    const patterns = cap.confidence_map.required_path_patterns || [];
    for (const zone of REQUIRED_ZONES) {
      const pattern = `capabilities.*.${zone}.*`;
      const hasPattern = patterns.includes(pattern);
      checks.push({
        check: `required_pattern_${zone}`,
        pass: hasPattern,
        detail: hasPattern ? `${pattern} — OK` : `MISSING pattern: ${pattern}`,
      });
    }
  } else {
    checks.push({
      check: 'capabilities_structure_valid',
      pass: false,
      detail: 'capabilities or confidence_map.coverage missing',
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CAP02_COVERAGE_INCOMPLETE';

writeMd(path.join(EXEC, 'REGRESSION_CAP02.md'), [
  '# REGRESSION_CAP02.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cap02.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CAP02_CAPABILITIES_COVERAGE',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cap02_capabilities_coverage — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
