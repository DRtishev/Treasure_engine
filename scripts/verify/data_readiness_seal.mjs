/**
 * data_readiness_seal.mjs — verify:public:data:readiness
 *
 * Reads specs/data_lanes.json (Lane Registry SSOT) and evaluates each lane
 * deterministically via offline replay. Produces per-lane matrix + aggregated status.
 *
 * PASS only if all TRUTH lanes PASS.
 * HINT lanes produce WARN (never block).
 * RISK_ONLY lanes produce INFO (never block).
 *
 * Phase B: Lane Registry SSOT integration.
 * Gates: RG_LANE01, RG_LANE02, RG_LANE03
 *
 * Phase R1.2: SELECT_RUN_ID operator selector.
 * If artifacts/incoming/SELECT_RUN_ID exists, its first non-empty line is the
 * forced RUN_ID for all artifact resolution. Fail-closed (RDY_SELECT01_INVALID)
 * if the specified run dir does not exist.
 *
 * Phase R1.2: STATIC lane support.
 * If required_artifacts path does NOT include <RUN_ID> placeholder => lane_mode=STATIC,
 * check file existence directly (no run dir enumeration needed).
 */

import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
const SELECT_RUN_ID_PATH = path.join(ROOT, 'artifacts/incoming/SELECT_RUN_ID');
fs.mkdirSync(MANUAL, { recursive: true });

// ---------------------------------------------------------------------------
// Operator selector: read SELECT_RUN_ID if present
// ---------------------------------------------------------------------------
let forcedRunId = null;
if (fs.existsSync(SELECT_RUN_ID_PATH)) {
  const raw = fs.readFileSync(SELECT_RUN_ID_PATH, 'utf8').trim();
  const firstLine = raw.split('\n')[0].trim();
  if (firstLine) forcedRunId = firstLine;
}

// Load lane registry (SSOT)
const REGISTRY_PATH = path.join(ROOT, 'specs/data_lanes.json');
let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
  console.error(`[FAIL] data_readiness_seal — REGISTRY_MISSING: ${e.message}`);
  process.exit(1);
}

const { lanes } = registry;

// ---------------------------------------------------------------------------
// Per-lane evaluation: find latest run dir + run offline replay
// ---------------------------------------------------------------------------
function findLatestRunDir(baseDir) {
  if (!fs.existsSync(baseDir)) return null;
  const runId = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b))
    .at(-1) || '';
  if (!runId) return null;
  return { runId, dir: path.join(baseDir, runId) };
}

function evaluateLane(lane) {
  const firstArtifact = lane.required_artifacts[0] || '';

  // STATIC lane: no <RUN_ID> placeholder in any artifact path
  const isStatic = lane.required_artifacts.every((a) => !a.includes('<RUN_ID>'));
  if (isStatic) {
    for (const artifact of lane.required_artifacts) {
      if (!fs.existsSync(path.join(ROOT, artifact))) {
        return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: 'STATIC', lane_mode: 'STATIC', detail: `static missing: ${artifact}` };
      }
    }
    return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'PASS', reason_code: 'NONE', replay_ec: 0, run_id: 'STATIC', lane_mode: 'STATIC', detail: 'static files present' };
  }

  // Dynamic lane: determine base dir from first artifact
  // Pattern: artifacts/incoming/<category>/<provider_id>/<RUN_ID>/...
  const baseDirRel = firstArtifact.split('/<RUN_ID>/')[0];
  if (!baseDirRel) {
    return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: 'NONE', lane_mode: 'DYNAMIC', detail: 'no artifact template' };
  }
  const baseDir = path.join(ROOT, baseDirRel);

  // SELECT_RUN_ID: operator forces a specific run id
  let run;
  if (forcedRunId) {
    const forcedDir = path.join(baseDir, forcedRunId);
    if (!fs.existsSync(forcedDir)) {
      return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'FAIL', reason_code: 'RDY_SELECT01_INVALID', replay_ec: 1, run_id: forcedRunId, lane_mode: 'DYNAMIC', detail: `SELECT_RUN_ID=${forcedRunId} not found in ${path.relative(ROOT, baseDir)}` };
    }
    run = { runId: forcedRunId, dir: forcedDir };
  } else {
    run = findLatestRunDir(baseDir);
  }

  if (!run) {
    return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: 'NONE', lane_mode: 'DYNAMIC', detail: `no run in ${path.relative(ROOT, baseDir)}` };
  }

  // Check required artifacts exist
  for (const artifact of lane.required_artifacts) {
    const resolved = artifact.replace('/<RUN_ID>/', `/${run.runId}/`);
    if (!fs.existsSync(path.join(ROOT, resolved))) {
      return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: run.runId, lane_mode: 'DYNAMIC', detail: `missing: ${resolved}` };
    }
  }

  // Check required lock fields
  const lockArtifact = lane.required_artifacts.find((a) => a.endsWith('lock.json'));
  if (lockArtifact) {
    const resolvedLock = path.join(ROOT, lockArtifact.replace('/<RUN_ID>/', `/${run.runId}/`));
    try {
      const lock = JSON.parse(fs.readFileSync(resolvedLock, 'utf8'));
      const missingFields = lane.required_lock_fields.filter((f) => !(f in lock));
      if (missingFields.length > 0) {
        return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'FAIL', reason_code: 'RDY02', replay_ec: 1, run_id: run.runId, lane_mode: 'DYNAMIC', detail: `lock missing fields: ${missingFields.join(',')}` };
      }
    } catch (e) {
      return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'FAIL', reason_code: 'RDY02', replay_ec: 1, run_id: run.runId, lane_mode: 'DYNAMIC', detail: `lock parse error: ${e.message}` };
    }
  }

  // Run offline replay (SSOT command from registry)
  const cmd = `${lane.replay_command} --run-id ${JSON.stringify(run.runId)}`;
  const replay = runBounded(cmd, { cwd: ROOT, env: { ...process.env, TREASURE_NET_KILL: '1' }, maxBuffer: 8 * 1024 * 1024 });

  return {
    lane_id: lane.lane_id,
    truth_level: lane.truth_level,
    status: replay.ec === 0 ? 'PASS' : (replay.ec === 2 ? 'NEEDS_DATA' : 'FAIL'),
    reason_code: replay.ec === 0 ? 'NONE' : (replay.ec === 2 ? 'RDY01' : 'RDY02'),
    replay_ec: replay.ec,
    run_id: run.runId,
    lane_mode: 'DYNAMIC',
    detail: replay.ec === 0 ? 'replay PASS' : `replay exit=${replay.ec}`,
    schema_version: lane.schema_version,
  };
}

// Evaluate all lanes (sorted by lane_id — deterministic)
const perLane = [...lanes].sort((a, b) => a.lane_id.localeCompare(b.lane_id)).map(evaluateLane);

// Aggregate: TRUTH lanes gate the overall status
const truthLanes = perLane.filter((r) => r.truth_level === 'TRUTH');
const hintLanes = perLane.filter((r) => r.truth_level === 'HINT');
const riskLanes = perLane.filter((r) => r.truth_level === 'RISK_ONLY');
const warnLanes = hintLanes.filter((r) => r.status !== 'PASS' && r.status !== 'NEEDS_DATA');

let status = 'PASS';
let reason_code = 'NONE';
if (truthLanes.some((r) => r.status === 'NEEDS_DATA')) { status = 'NEEDS_DATA'; reason_code = 'RDY01'; }
else if (truthLanes.some((r) => r.status === 'FAIL')) { status = 'FAIL'; reason_code = 'RDY02'; }

// Per-lane matrix table
const matrixRows = perLane.map((r) =>
  `- lane=${r.lane_id} truth=${r.truth_level} status=${r.status} reason=${r.reason_code} ec=${r.replay_ec} run_id=${r.run_id}`
).join('\n');

writeMd(path.join(EXEC_DIR, 'PUBLIC_DATA_READINESS_SEAL.md'), [
  '# PUBLIC_DATA_READINESS_SEAL.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `SELECT_RUN_ID: ${forcedRunId ?? 'NONE'}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `REGISTRY: specs/data_lanes.json (${lanes.length} lanes)`, '',
  '## PER-LANE MATRIX', '',
  matrixRows, '',
  '## TRUTH LANES',
  truthLanes.map((r) => `- ${r.lane_id}: ${r.status}`).join('\n') || '- NONE', '',
  '## HINT LANES',
  hintLanes.map((r) => `- ${r.lane_id}: ${r.status}`).join('\n') || '- NONE', '',
  '## RISK_ONLY LANES',
  riskLanes.map((r) => `- ${r.lane_id}: ${r.status}`).join('\n') || '- NONE',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'public_data_readiness_seal.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  select_run_id: forcedRunId ?? null,
  next_action: NEXT_ACTION,
  registry_schema_version: registry.registry_schema_version,
  lanes_total: lanes.length,
  truth_lanes_n: truthLanes.length,
  hint_lanes_n: hintLanes.length,
  risk_only_lanes_n: riskLanes.length,
  warn_lanes_n: warnLanes.length,
  per_lane: perLane,
});

// Print compact summary
console.log(`[${status}] data_readiness_seal — ${reason_code}`);
for (const r of perLane) {
  const icon = r.status === 'PASS' ? 'PASS' : (r.status === 'NEEDS_DATA' ? 'NEEDS_DATA' : 'FAIL');
  console.log(`  [${icon}] ${r.lane_id} (${r.truth_level}) reason=${r.reason_code} run=${r.run_id}`);
}

process.exit(status === 'PASS' ? 0 : status === 'NEEDS_DATA' ? 2 : 1);
