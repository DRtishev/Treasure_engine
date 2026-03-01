/**
 * regression_cap05_scope_aware_limits.mjs — RG_CAP05_SCOPE_AWARE_LIMITS
 *
 * Gate: Verify data_capabilities.json has scope-aware limit entries for Binance
 *       and dedup/reorder policy fields for OKX orderbook.
 *
 * Checks:
 *   1. capabilities.binance.scopes is an array with >= 2 entries
 *   2. Each binance scope has scope_id and rate_limits.unit === "LOGICAL_TICKS"
 *   3. Specific scope_ids present: binance.academy.stream_limits + binance.delivery_testnet.market_streams
 *   4. capabilities.okx.orderbook.dedup_key === "seqId"
 *   5. capabilities.okx.orderbook.reorder_window_max_items is a positive integer
 *   6. confidence_map covers capabilities.binance.scopes
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

const NEXT_ACTION = 'npm run -s verify:regression:cap05-scope-aware-limits';
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');

const REQUIRED_SCOPE_IDS = [
  'binance.academy.stream_limits',
  'binance.delivery_testnet.market_streams',
];

const checks = [];

if (!fs.existsSync(CAP_PATH)) {
  checks.push({ check: 'capabilities_file_exists', pass: false, detail: `MISSING: ${CAP_PATH}` });
} else {
  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
    checks.push({ check: 'capabilities_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    checks.push({ check: 'capabilities_parseable', pass: false, detail: `parse error: ${e.message}` });
    cap = null;
  }

  if (cap) {
    const binance = cap.capabilities?.binance || {};
    const okx = cap.capabilities?.okx || {};
    const coverage = cap.confidence_map?.coverage || {};

    // ── Binance scopes ──
    const scopes = binance.scopes;
    checks.push({
      check: 'binance_scopes_array_present',
      pass: Array.isArray(scopes),
      detail: Array.isArray(scopes) ? `binance.scopes is array — OK` : `MISSING or non-array: capabilities.binance.scopes`,
    });

    if (Array.isArray(scopes)) {
      checks.push({
        check: 'binance_scopes_min_2_entries',
        pass: scopes.length >= 2,
        detail: scopes.length >= 2
          ? `binance.scopes has ${scopes.length} entries — OK`
          : `FAIL: need >= 2 scope entries, got ${scopes.length}`,
      });

      // Check each scope has scope_id and unit
      for (let i = 0; i < scopes.length; i++) {
        const s = scopes[i];
        checks.push({
          check: `scope_${i}_has_scope_id`,
          pass: typeof s.scope_id === 'string' && s.scope_id.length > 0,
          detail: typeof s.scope_id === 'string'
            ? `scope[${i}].scope_id="${s.scope_id}" — OK`
            : `FAIL: scope[${i}] missing scope_id`,
        });
        const unitOk = s.rate_limits?.unit === 'LOGICAL_TICKS';
        checks.push({
          check: `scope_${i}_unit_logical_ticks`,
          pass: unitOk,
          detail: unitOk
            ? `scope[${i}].rate_limits.unit=LOGICAL_TICKS — OK`
            : `FAIL: scope[${i}] unit=${s.rate_limits?.unit} expected LOGICAL_TICKS`,
        });
      }

      // Check specific scope_ids
      const scopeIds = scopes.map((s) => s.scope_id);
      for (const sid of REQUIRED_SCOPE_IDS) {
        checks.push({
          check: `scope_id_${sid.replace(/\./g, '_')}`,
          pass: scopeIds.includes(sid),
          detail: scopeIds.includes(sid)
            ? `scope_id=${sid} present — OK`
            : `MISSING: scope_id=${sid} not found in [${scopeIds.join(', ')}]`,
        });
      }

      // No wallclock fields in scope rate_limits
      const wallclockFields = ['_sec', '_seconds', '_ms'];
      const wc = scopes.flatMap((s) =>
        Object.keys(s.rate_limits || {}).filter((k) => wallclockFields.some((w) => k.endsWith(w)))
      );
      checks.push({
        check: 'binance_scopes_no_wallclock_fields',
        pass: wc.length === 0,
        detail: wc.length === 0
          ? `no wallclock fields in scope rate_limits — OK`
          : `WALLCLOCK FIELDS: ${wc.join(', ')}`,
      });
    }

    // ── OKX dedup_key ──
    const dedupKey = okx.orderbook?.dedup_key;
    checks.push({
      check: 'okx_orderbook_dedup_key',
      pass: dedupKey === 'seqId',
      detail: dedupKey === 'seqId'
        ? `okx.orderbook.dedup_key=seqId — OK`
        : `FAIL: dedup_key=${dedupKey} expected seqId`,
    });

    // ── OKX reorder_window_max_items ──
    const rw = okx.orderbook?.reorder_window_max_items;
    checks.push({
      check: 'okx_orderbook_reorder_window_max_items',
      pass: Number.isInteger(rw) && rw > 0,
      detail: Number.isInteger(rw) && rw > 0
        ? `okx.orderbook.reorder_window_max_items=${rw} — OK`
        : `FAIL: reorder_window_max_items=${rw} (must be positive integer)`,
    });

    // ── confidence_map covers binance.scopes ──
    const scopesCoverage = coverage['capabilities.binance.scopes'];
    checks.push({
      check: 'confidence_covers_binance_scopes',
      pass: !!scopesCoverage,
      detail: scopesCoverage
        ? `capabilities.binance.scopes coverage=${scopesCoverage} — OK`
        : `MISSING: confidence_map.coverage[capabilities.binance.scopes]`,
    });

    // ── required_path_patterns has scopes entry ──
    const patterns = cap.confidence_map?.required_path_patterns || [];
    const scopePattern = 'capabilities.*.scopes[*].scope_id';
    checks.push({
      check: 'required_pattern_scopes_scope_id',
      pass: patterns.includes(scopePattern),
      detail: patterns.includes(scopePattern)
        ? `${scopePattern} in required_path_patterns — OK`
        : `MISSING: ${scopePattern} not in required_path_patterns`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CAP05_SCOPE_AWARE_LIMITS_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CAP05.md'), [
  '# REGRESSION_CAP05.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- binance.scopes: >= 2 entries, each with scope_id + LOGICAL_TICKS rate_limits',
  `- required scope_ids: ${REQUIRED_SCOPE_IDS.join(', ')}`,
  '- okx.orderbook.dedup_key = "seqId"',
  '- okx.orderbook.reorder_window_max_items: positive integer',
  '- confidence_map covers capabilities.binance.scopes', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cap05.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CAP05_SCOPE_AWARE_LIMITS',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cap05_scope_aware_limits — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
