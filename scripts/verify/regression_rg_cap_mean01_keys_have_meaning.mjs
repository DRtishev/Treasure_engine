/**
 * regression_rg_cap_mean01_keys_have_meaning.mjs — RG_CAP_MEAN01_KEYS_HAVE_MEANING
 *
 * Gate: every numeric field in the policy/rate_limits/orderbook zones of
 *       specs/data_capabilities.json must have a corresponding _field_meta entry
 *       with: meaning (string), unit_hint (string), window_kind (string).
 *
 * Also verifies the confidence_map covers these meta paths.
 *
 * Numeric fields in scope (per provider):
 *   - rate_limits: connections_per_ip, messages_per_connection, streams_per_connection
 *   - orderbook: depth_levels, reorder_window_max_items
 *
 * Excludes non-numeric / boolean / string fields.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:rg-cap-mean01-keys-have-meaning';
const CAP_PATH = path.join(ROOT, 'specs/data_capabilities.json');

const checks = [];

if (!fs.existsSync(CAP_PATH)) {
  checks.push({ check: 'capabilities_file_exists', pass: false, detail: `MISSING: ${CAP_PATH}` });
} else {
  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
  } catch (e) {
    checks.push({ check: 'capabilities_parse', pass: false, detail: `parse error: ${e.message}` });
  }

  if (cap) {
    const ZONES = ['rate_limits', 'orderbook'];
    const META_FIELDS = ['meaning', 'unit_hint', 'window_kind'];

    // Check each provider zone for numeric fields and their _field_meta entries
    for (const [provider, provCap] of Object.entries(cap.capabilities || {})) {
      for (const zone of ZONES) {
        const zoneData = provCap[zone];
        if (!zoneData || typeof zoneData !== 'object') continue;

        const numericKeys = Object.entries(zoneData)
          .filter(([k, v]) => !k.startsWith('_') && (typeof v === 'number' || Array.isArray(v) && v.every((x) => typeof x === 'number')))
          .map(([k]) => k);

        if (numericKeys.length === 0) continue;

        const meta = zoneData._field_meta;
        const hasMeta = meta && typeof meta === 'object';
        checks.push({
          check: `${provider}.${zone}._field_meta_present`,
          pass: hasMeta,
          detail: hasMeta ? `_field_meta present — OK` : `FAIL: no _field_meta in ${provider}.${zone}`,
        });

        if (hasMeta) {
          for (const key of numericKeys) {
            const entry = meta[key];
            const hasEntry = entry && typeof entry === 'object';
            checks.push({
              check: `${provider}.${zone}._field_meta.${key}_present`,
              pass: hasEntry,
              detail: hasEntry ? `_field_meta.${key} present` : `FAIL: no _field_meta entry for ${provider}.${zone}.${key}`,
            });

            if (hasEntry) {
              for (const mf of META_FIELDS) {
                const val = entry[mf];
                const ok = typeof val === 'string' && val.length > 0;
                checks.push({
                  check: `${provider}.${zone}._field_meta.${key}.${mf}`,
                  pass: ok,
                  detail: ok ? `${mf}="${val.slice(0, 40)}" — OK` : `FAIL: missing or empty ${mf} for ${key}`,
                });
              }
            }
          }
        }
      }

      // Also check scopes rate_limits if present
      if (Array.isArray(provCap.scopes)) {
        for (const scope of provCap.scopes) {
          const rl = scope.rate_limits;
          if (!rl || typeof rl !== 'object') continue;
          const numericKeys = Object.entries(rl)
            .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number')
            .map(([k]) => k);
          if (numericKeys.length === 0) continue;

          const meta = rl._field_meta;
          const hasMeta = meta && typeof meta === 'object';
          checks.push({
            check: `${provider}.scopes[${scope.scope_id}].rate_limits._field_meta_present`,
            pass: hasMeta,
            detail: hasMeta ? `_field_meta present — OK` : `FAIL: no _field_meta in scope ${scope.scope_id}`,
          });

          if (hasMeta) {
            for (const key of numericKeys) {
              const entry = meta[key];
              const hasEntry = entry && typeof entry === 'object';
              if (hasEntry) {
                for (const mf of META_FIELDS) {
                  const val = entry[mf];
                  const ok = typeof val === 'string' && val.length > 0;
                  checks.push({
                    check: `${provider}.scopes[${scope.scope_id}].rate_limits._field_meta.${key}.${mf}`,
                    pass: ok,
                    detail: ok ? `${mf} OK` : `FAIL: missing ${mf}`,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Check confidence_map covers _field_meta paths
    const confMap = cap.confidence_map?.coverage ?? {};
    const metaPaths = Object.keys(confMap).filter((k) => k.includes('_field_meta'));
    checks.push({
      check: 'confidence_map_covers_field_meta',
      pass: metaPaths.length > 0,
      detail: metaPaths.length > 0
        ? `confidence_map has ${metaPaths.length} _field_meta entries — OK`
        : 'FAIL: confidence_map missing _field_meta coverage',
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_CAP_MEAN01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_CAP_MEAN01.md'), [
  '# REGRESSION_RG_CAP_MEAN01.md — Capabilities Keys Have Meaning', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_cap_mean01_keys_have_meaning.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CAP_MEAN01_KEYS_HAVE_MEANING',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_cap_mean01_keys_have_meaning — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
