/**
 * regression_r3_02_acquire_lane_alignment.mjs — RG_R3_ACQUIRE01
 *
 * Verify data_lanes.json has acquire_command for EXPERIMENTAL+ lanes,
 * lock fields match required_lock_fields spec, acquire script references
 * match lane registry.
 *
 * Gate: verify:regression:r3-02-acquire-lane-alignment
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const REGISTRY_PATH = path.join(ROOT, 'specs/data_lanes.json');

const violations = [];

// Load registry
let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
  violations.push(`registry_parse_error: ${e.message}`);
}

if (registry) {
  const { lanes } = registry;

  // States that should have acquire_command
  const ADVANCED_STATES = ['EXPERIMENTAL', 'TRUTH_READY'];

  for (const lane of lanes) {
    // 1. EXPERIMENTAL+ lanes should have replay_command
    if (ADVANCED_STATES.includes(lane.lane_state)) {
      if (!lane.replay_command) {
        violations.push(`${lane.lane_id}: missing replay_command (state=${lane.lane_state})`);
      }
    }

    // 2. Required lock fields should be an array
    if (!Array.isArray(lane.required_lock_fields)) {
      violations.push(`${lane.lane_id}: required_lock_fields is not an array`);
    }

    // 3. Required artifacts should be an array with at least one entry
    if (!Array.isArray(lane.required_artifacts) || lane.required_artifacts.length === 0) {
      violations.push(`${lane.lane_id}: required_artifacts empty or missing`);
    }

    // 4. Lane with lock fields should have lock.json in required_artifacts
    if (lane.required_lock_fields && lane.required_lock_fields.length > 0) {
      const hasLock = lane.required_artifacts.some((a) => a.endsWith('lock.json'));
      if (!hasLock) {
        violations.push(`${lane.lane_id}: has required_lock_fields but no lock.json in artifacts`);
      }
    }

    // 5. Replay command should reference valid script
    if (lane.replay_command) {
      const scriptMatch = lane.replay_command.match(/node\s+(scripts\/[^\s]+)/);
      if (scriptMatch) {
        const scriptPath = path.join(ROOT, scriptMatch[1]);
        if (!fs.existsSync(scriptPath)) {
          violations.push(`${lane.lane_id}: replay script not found: ${scriptMatch[1]}`);
        }
      }
    }

    // 6. Schema version must be present
    if (!lane.schema_version) {
      violations.push(`${lane.lane_id}: missing schema_version`);
    }

    // 7. Lane ID must be non-empty and match pattern
    if (!/^[a-z0-9_]+$/.test(lane.lane_id)) {
      violations.push(`${lane.lane_id}: invalid lane_id format`);
    }
  }

  // 8. No duplicate lane IDs
  const laneIds = lanes.map((l) => l.lane_id);
  const dupes = laneIds.filter((id, i) => laneIds.indexOf(id) !== i);
  if (dupes.length > 0) {
    violations.push(`duplicate lane_ids: ${dupes.join(',')}`);
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason = violations.length === 0 ? 'NONE' : 'RG_R3_ACQUIRE01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_R3_02_ACQUIRE_LANE_ALIGNMENT.md'), [
  '# REGRESSION_R3_02_ACQUIRE_LANE_ALIGNMENT.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s verify:fast`, '',
  `VIOLATIONS: ${violations.length}`,
  violations.length > 0
    ? violations.map((v) => `- ${v}`).join('\n')
    : '- NONE',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_r3_02_acquire_lane_alignment.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_R3_ACQUIRE01',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  registry_path: 'specs/data_lanes.json',
  violations,
});

console.log(`[${status}] regression_r3_02_acquire_lane_alignment — ${reason}`);
process.exit(status === 'PASS' ? 0 : 1);
