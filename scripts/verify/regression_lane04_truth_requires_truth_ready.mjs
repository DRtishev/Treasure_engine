/**
 * regression_lane04_truth_requires_truth_ready.mjs — RG_LANE04_TRUTH_REQUIRES_TRUTH_READY
 *
 * Gate: Any lane with truth_level=TRUTH MUST have lane_state=TRUTH_READY.
 *       If a TRUTH lane has any other lane_state, this gate exits BLOCKED (EC=2).
 *
 * Rationale: Prevents accidental promotion of unready lanes to authoritative truth.
 *            PREFLIGHT/EXPERIMENTAL lanes are non-blocking by design.
 *
 * Also verifies:
 *   - All PREFLIGHT/PLANNED lanes have truth_level != TRUTH (no surprise truths)
 *   - lane_state field is present on every lane (since schema bump)
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

const NEXT_ACTION = 'npm run -s verify:regression:lane04-truth-requires-truth-ready';
const LANES_PATH = path.join(ROOT, 'specs', 'data_lanes.json');

const NON_TRUTH_STATES = new Set(['PLANNED', 'PREFLIGHT', 'EXPERIMENTAL', 'DEPRECATED']);
const checks = [];
let blocked = false;

if (!fs.existsSync(LANES_PATH)) {
  checks.push({ check: 'lanes_file_exists', pass: false, detail: `missing: ${LANES_PATH}` });
} else {
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(LANES_PATH, 'utf8'));
    checks.push({ check: 'lanes_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    reg = null;
    checks.push({ check: 'lanes_parseable', pass: false, detail: `parse error: ${e.message}` });
  }

  if (reg && Array.isArray(reg.lanes)) {
    checks.push({ check: 'lanes_present', pass: reg.lanes.length > 0, detail: `lanes_n=${reg.lanes.length}` });

    // Check 1: every lane has lane_state
    const missingState = reg.lanes.filter((l) => !l.lane_state);
    checks.push({
      check: 'all_lanes_have_lane_state',
      pass: missingState.length === 0,
      detail: missingState.length === 0
        ? `all ${reg.lanes.length} lanes have lane_state — OK`
        : `MISSING lane_state: ${missingState.map((l) => l.lane_id).join(', ')}`,
    });

    // Check 2: TRUTH lanes must be TRUTH_READY (BLOCKED if violated)
    const truthLanes = reg.lanes.filter((l) => l.truth_level === 'TRUTH');
    const badTruthLanes = truthLanes.filter((l) => l.lane_state !== 'TRUTH_READY');
    if (badTruthLanes.length > 0) {
      blocked = true;
    }
    checks.push({
      check: 'truth_lanes_are_truth_ready',
      pass: badTruthLanes.length === 0,
      detail: badTruthLanes.length === 0
        ? `all ${truthLanes.length} TRUTH lane(s) have lane_state=TRUTH_READY — OK`
        : `BLOCKED: ${badTruthLanes.map((l) => `${l.lane_id}(state=${l.lane_state})`).join(', ')}`,
    });

    // Check 3: PREFLIGHT/PLANNED lanes must NOT be TRUTH
    const preTruthLanes = reg.lanes.filter((l) => NON_TRUTH_STATES.has(l.lane_state) && l.truth_level === 'TRUTH');
    checks.push({
      check: 'preflight_planned_not_truth',
      pass: preTruthLanes.length === 0,
      detail: preTruthLanes.length === 0
        ? 'no PREFLIGHT/PLANNED/EXPERIMENTAL/DEPRECATED lane has truth_level=TRUTH — OK'
        : `SURPRISE_TRUTH: ${preTruthLanes.map((l) => l.lane_id).join(', ')}`,
    });

    // Check 4: at least one TRUTH_READY lane exists
    const truthReadyLanes = reg.lanes.filter((l) => l.lane_state === 'TRUTH_READY');
    checks.push({
      check: 'at_least_one_truth_ready_lane',
      pass: truthReadyLanes.length > 0,
      detail: `truth_ready_lanes=${truthReadyLanes.map((l) => l.lane_id).join(',') || 'NONE'}`,
    });

    // Summary per-lane table
    for (const lane of reg.lanes) {
      checks.push({
        check: `lane_${lane.lane_id}_state_ok`,
        pass: !(lane.truth_level === 'TRUTH' && lane.lane_state !== 'TRUTH_READY'),
        detail: `${lane.lane_id}: truth_level=${lane.truth_level} lane_state=${lane.lane_state || 'MISSING'}`,
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
// BLOCKED if truth_level=TRUTH but not TRUTH_READY; FAIL for other issues
const status = blocked ? 'BLOCKED' : (failed.length === 0 ? 'PASS' : 'FAIL');
const reason_code = status === 'PASS' ? 'NONE' : blocked ? 'LANE04_TRUTH_NOT_READY' : 'LANE04_LANE_STATE_INVALID';

writeMd(path.join(EXEC, 'REGRESSION_LANE04.md'), [
  '# REGRESSION_LANE04.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- truth_level=TRUTH requires lane_state=TRUTH_READY',
  '- PREFLIGHT/PLANNED/EXPERIMENTAL lanes must not be TRUTH',
  '- Violation is BLOCKED (EC=2), not merely FAIL', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : (blocked && !c.pass ? 'BLOCKED' : 'FAIL')}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_lane04.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LANE04_TRUTH_REQUIRES_TRUTH_READY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  blocked,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_lane04_truth_requires_truth_ready — ${reason_code}`);
// BLOCKED = EC 2, FAIL = EC 1, PASS = EC 0
process.exit(status === 'PASS' ? 0 : status === 'BLOCKED' ? 2 : 1);
