/**
 * regression_lane01_registry_present.mjs — RG_LANE01_REGISTRY_PRESENT
 *
 * Gate: specs/data_lanes.json must exist, be valid against data_lanes.schema.json
 *       (structural checks without AJV), and have sorted unique lane_ids.
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

const NEXT_ACTION = 'npm run -s verify:fast';
const REGISTRY_PATH = path.join(ROOT, 'specs/data_lanes.json');
const SCHEMA_PATH = path.join(ROOT, 'specs/data_lanes.schema.json');
const checks = [];

// Required lane fields (mirrors schema required list)
const LANE_REQUIRED = ['lane_id', 'lane_kind', 'truth_level', 'providers', 'schema_version', 'required_artifacts', 'required_lock_fields', 'replay_command', 'readiness_rules'];
const VALID_LANE_KINDS = ['WS', 'REST', 'FIXTURE', 'DERIVED'];
const VALID_TRUTH_LEVELS = ['TRUTH', 'HINT', 'RISK_ONLY'];

checks.push({ check: 'registry_file_exists', pass: fs.existsSync(REGISTRY_PATH), detail: REGISTRY_PATH });
checks.push({ check: 'schema_file_exists', pass: fs.existsSync(SCHEMA_PATH), detail: SCHEMA_PATH });

if (fs.existsSync(REGISTRY_PATH)) {
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    checks.push({ check: 'registry_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    checks.push({ check: 'registry_parseable', pass: false, detail: `JSON parse error: ${e.message}` });
    reg = null;
  }

  if (reg) {
    // Check root fields
    checks.push({ check: 'has_registry_schema_version', pass: typeof reg.registry_schema_version === 'string', detail: `registry_schema_version=${reg.registry_schema_version}` });
    checks.push({ check: 'has_lanes_array', pass: Array.isArray(reg.lanes), detail: Array.isArray(reg.lanes) ? `lanes_n=${reg.lanes.length}` : 'lanes is not array' });

    if (Array.isArray(reg.lanes)) {
      // Unique lane_ids
      const ids = reg.lanes.map((l) => l.lane_id);
      const uniqueIds = [...new Set(ids)];
      checks.push({ check: 'lane_ids_unique', pass: uniqueIds.length === ids.length, detail: uniqueIds.length === ids.length ? `${ids.length} unique ids — OK` : `DUPLICATE: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(',')}` });

      // Sorted by lane_id
      const sorted = [...ids].sort((a, b) => a.localeCompare(b));
      checks.push({ check: 'lanes_sorted_by_lane_id', pass: JSON.stringify(ids) === JSON.stringify(sorted), detail: JSON.stringify(ids) === JSON.stringify(sorted) ? 'sorted — OK' : `UNSORTED: expected [${sorted.join(',')}]` });

      // Each lane has required fields + valid enum values
      let allLanesValid = true;
      const laneErrors = [];
      for (const lane of reg.lanes) {
        const missing = LANE_REQUIRED.filter((f) => !(f in lane));
        if (missing.length) { allLanesValid = false; laneErrors.push(`${lane.lane_id || '?'}: missing ${missing.join(',')}`); }
        if (!VALID_LANE_KINDS.includes(lane.lane_kind)) { allLanesValid = false; laneErrors.push(`${lane.lane_id}: invalid lane_kind=${lane.lane_kind}`); }
        if (!VALID_TRUTH_LEVELS.includes(lane.truth_level)) { allLanesValid = false; laneErrors.push(`${lane.lane_id}: invalid truth_level=${lane.truth_level}`); }
        if (!Array.isArray(lane.providers) || lane.providers.length === 0) { allLanesValid = false; laneErrors.push(`${lane.lane_id}: providers must be non-empty array`); }
        if (lane.readiness_rules && !('RDY01' in lane.readiness_rules && 'RDY02' in lane.readiness_rules && 'PASS' in lane.readiness_rules)) {
          allLanesValid = false; laneErrors.push(`${lane.lane_id}: readiness_rules missing RDY01/RDY02/PASS`);
        }
      }
      checks.push({ check: 'all_lanes_structurally_valid', pass: allLanesValid, detail: allLanesValid ? `all ${reg.lanes.length} lanes valid — OK` : `INVALID: ${laneErrors.slice(0, 3).join('; ')}` });

      // At least one TRUTH lane
      const truthLanes = reg.lanes.filter((l) => l.truth_level === 'TRUTH');
      checks.push({ check: 'at_least_one_truth_lane', pass: truthLanes.length > 0, detail: `truth_lanes_n=${truthLanes.length}` });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LANE01_REGISTRY_INVALID';

writeMd(path.join(EXEC, 'REGRESSION_LANE01.md'), [
  '# REGRESSION_LANE01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_lane01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LANE01_REGISTRY_PRESENT',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_lane01_registry_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
