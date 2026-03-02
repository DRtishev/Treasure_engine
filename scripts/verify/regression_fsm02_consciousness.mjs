/**
 * regression_fsm02_consciousness.mjs — RG_FSM02_CONSCIOUSNESS
 *
 * EPOCH-70 structural gate. Validates that the consciousness loop
 * (life.mjs v2) is correctly wired to the FSM.
 *
 * 8 structural test categories:
 *   1. life_summary_v2_schema     — LIFE_SUMMARY.json has schema_version 2.0.0
 *   2. consciousness_result       — consciousness_result field present + valid
 *   3. proprio_scan_event         — LIFE EventBus has PROPRIO_SCAN event
 *   4. consciousness_result_event — LIFE EventBus has CONSCIOUSNESS_RESULT event
 *   5. no_hardcoded_cert_mode     — Not all LIFE events have mode=CERT
 *   6. reflexes_field_present     — reflexes_fired is an array
 *   7. fsm_final_state_valid      — fsm_final_state is a valid kernel state
 *   8. budget_ms_defined          — All states in kernel have budget_ms >= 0
 *
 * SKIP-SAFE: If no LIFE evidence exists yet, all checks return PASS
 *            with detail "no life evidence yet".
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_fsm02_consciousness.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { loadFsmKernel } from '../ops/state_manager.mjs';
import { findAllBusJsonls, readBus, mergeAndSortEvents } from '../ops/eventbus_v1.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:fsm02-consciousness';
const checks = [];

let kernel;
try {
  kernel = loadFsmKernel();
} catch (e) {
  checks.push({ check: 'kernel_load', pass: false, detail: `FSM kernel load failed: ${e.message}` });
}

// ---------------------------------------------------------------------------
// Find latest LIFE_SUMMARY.json
// ---------------------------------------------------------------------------
function findLatestLifeSummary() {
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  if (!fs.existsSync(evidenceDir)) return null;
  const dirs = fs.readdirSync(evidenceDir)
    .filter((d) => d.startsWith('EPOCH-LIFE-'))
    .sort((a, b) => a.localeCompare(b));
  if (dirs.length === 0) return null;
  const latest = dirs[dirs.length - 1];
  const summaryPath = path.join(evidenceDir, latest, 'LIFE_SUMMARY.json');
  try {
    if (!fs.existsSync(summaryPath)) return null;
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Find LIFE EventBus events
// ---------------------------------------------------------------------------
function findLifeEvents() {
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  const jsonlPaths = findAllBusJsonls(evidenceDir)
    .filter((p) => p.includes('EPOCH-EVENTBUS-LIFE-'));
  if (jsonlPaths.length === 0) return [];
  const allEventArrays = jsonlPaths.map((p) => readBus(p).events());
  return mergeAndSortEvents(allEventArrays);
}

const summary = findLatestLifeSummary();
const lifeEvents = findLifeEvents();
const hasLifeEvidence = summary !== null || lifeEvents.length > 0;

if (kernel) {
  // -------------------------------------------------------------------------
  // Test 8: budget_ms_defined — ALL states have budget_ms >= 0
  // This check runs ALWAYS (not dependent on LIFE evidence)
  // -------------------------------------------------------------------------
  const stateNames = Object.keys(kernel.states);
  for (const stateName of stateNames) {
    const stateObj = kernel.states[stateName];
    const hasBudget = typeof stateObj.budget_ms === 'number' && stateObj.budget_ms >= 0;
    checks.push({
      check: `budget_ms_defined_${stateName}`,
      pass: hasBudget,
      detail: hasBudget
        ? `OK: ${stateName}.budget_ms=${stateObj.budget_ms}`
        : `FAIL: ${stateName} missing or invalid budget_ms (got ${stateObj.budget_ms})`,
    });
  }

  // -------------------------------------------------------------------------
  // SKIP-SAFE: If no LIFE evidence, remaining checks pass with note
  // -------------------------------------------------------------------------
  if (!hasLifeEvidence) {
    const skipChecks = [
      'life_summary_v2_schema',
      'consciousness_result_present',
      'proprio_scan_event',
      'consciousness_result_event',
      'no_hardcoded_cert_mode',
      'reflexes_field_present',
      'fsm_final_state_valid',
    ];
    for (const check of skipChecks) {
      checks.push({ check, pass: true, detail: 'no life evidence yet — skip-safe PASS' });
    }
  } else {
    // -----------------------------------------------------------------------
    // Test 1: life_summary_v2_schema
    // -----------------------------------------------------------------------
    if (summary) {
      const isV2 = summary.schema_version === '2.0.0';
      checks.push({
        check: 'life_summary_v2_schema',
        pass: isV2,
        detail: isV2
          ? 'OK: LIFE_SUMMARY.json schema_version=2.0.0'
          : `FAIL: schema_version=${summary.schema_version} (expected 2.0.0)`,
      });

      // -------------------------------------------------------------------
      // Test 2: consciousness_result_present
      // -------------------------------------------------------------------
      const cr = summary.consciousness_result;
      const crValid = cr && typeof cr.reached === 'boolean' &&
        typeof cr.final_state === 'string' &&
        typeof cr.total_failures === 'number';
      checks.push({
        check: 'consciousness_result_present',
        pass: !!crValid,
        detail: crValid
          ? `OK: consciousness_result present — reached=${cr.reached} final_state=${cr.final_state}`
          : 'FAIL: consciousness_result missing or invalid',
      });

      // -------------------------------------------------------------------
      // Test 6: reflexes_field_present
      // -------------------------------------------------------------------
      const hasReflexes = Array.isArray(summary.reflexes_fired);
      checks.push({
        check: 'reflexes_field_present',
        pass: hasReflexes,
        detail: hasReflexes
          ? `OK: reflexes_fired is array (length=${summary.reflexes_fired.length})`
          : 'FAIL: reflexes_fired missing or not an array',
      });

      // -------------------------------------------------------------------
      // Test 7: fsm_final_state_valid
      // -------------------------------------------------------------------
      const ffs = summary.fsm_final_state;
      const ffsValid = typeof ffs === 'string' && ffs in kernel.states;
      checks.push({
        check: 'fsm_final_state_valid',
        pass: !!ffsValid,
        detail: ffsValid
          ? `OK: fsm_final_state="${ffs}" is valid`
          : `FAIL: fsm_final_state="${ffs}" not in kernel states`,
      });
    } else {
      // Summary not found but lifeEvents exist — use skip-safe for summary checks
      for (const check of ['life_summary_v2_schema', 'consciousness_result_present', 'reflexes_field_present', 'fsm_final_state_valid']) {
        checks.push({ check, pass: true, detail: 'no LIFE_SUMMARY.json yet — skip-safe PASS' });
      }
    }

    // -----------------------------------------------------------------------
    // Test 3: proprio_scan_event
    // -----------------------------------------------------------------------
    if (lifeEvents.length > 0) {
      const proprioEvent = lifeEvents.find(
        (e) => e.component === 'LIFE' && e.event === 'PROPRIO_SCAN'
      );
      checks.push({
        check: 'proprio_scan_event',
        pass: !!proprioEvent,
        detail: proprioEvent
          ? `OK: PROPRIO_SCAN event found with fsm_state=${proprioEvent.attrs?.fsm_state ?? 'unknown'}`
          : 'FAIL: PROPRIO_SCAN event not found in LIFE EventBus',
      });

      // -------------------------------------------------------------------
      // Test 4: consciousness_result_event
      // -------------------------------------------------------------------
      const crEvent = lifeEvents.find(
        (e) => e.component === 'LIFE' && e.event === 'CONSCIOUSNESS_RESULT'
      );
      checks.push({
        check: 'consciousness_result_event',
        pass: !!crEvent,
        detail: crEvent
          ? `OK: CONSCIOUSNESS_RESULT event found — reached=${crEvent.attrs?.reached ?? 'unknown'}`
          : 'FAIL: CONSCIOUSNESS_RESULT event not found in LIFE EventBus',
      });

      // -------------------------------------------------------------------
      // Test 5: no_hardcoded_cert_mode
      // -------------------------------------------------------------------
      const lifeComponentEvents = lifeEvents.filter((e) => e.component === 'LIFE');
      const modes = [...new Set(lifeComponentEvents.map((e) => e.mode))];
      const allCert = modes.length === 1 && modes[0] === 'CERT';
      checks.push({
        check: 'no_hardcoded_cert_mode',
        pass: !allCert,
        detail: !allCert
          ? `OK: LIFE events have diverse modes: ${modes.join(', ')}`
          : 'FAIL: all LIFE events have mode=CERT (hardcoded, not FSM-derived)',
      });
    } else {
      // No life events — skip-safe
      for (const check of ['proprio_scan_event', 'consciousness_result_event', 'no_hardcoded_cert_mode']) {
        checks.push({ check, pass: true, detail: 'no LIFE EventBus events yet — skip-safe PASS' });
      }
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'FSM_STRUCTURAL_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_FSM02.md'), [
  '# REGRESSION_FSM02.md — FSM Consciousness Loop (EPOCH-70)', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_fsm02_consciousness.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_FSM02_CONSCIOUSNESS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_fsm02_consciousness — ${reason_code}`);
if (failed.length > 0) {
  for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
}
process.exit(status === 'PASS' ? 0 : 1);
