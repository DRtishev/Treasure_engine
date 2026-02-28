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
fs.mkdirSync(MANUAL, { recursive: true });

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
  // Determine base artifact directory from first required_artifact path
  // Pattern: artifacts/incoming/<category>/<provider_id>/<RUN_ID>/...
  const firstArtifact = lane.required_artifacts[0] || '';
  const baseDirRel = firstArtifact.split('/<RUN_ID>/')[0];
  if (!baseDirRel) {
    return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: 'NONE', detail: 'no artifact template' };
  }
  const baseDir = path.join(ROOT, baseDirRel);
  const run = findLatestRunDir(baseDir);

  if (!run) {
    return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: 'NONE', detail: `no run in ${path.relative(ROOT, baseDir)}` };
  }

  // Check required artifacts exist
  for (const artifact of lane.required_artifacts) {
    const resolved = artifact.replace('/<RUN_ID>/', `/${run.runId}/`);
    if (!fs.existsSync(path.join(ROOT, resolved))) {
      return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'NEEDS_DATA', reason_code: 'RDY01', replay_ec: 2, run_id: run.runId, detail: `missing: ${resolved}` };
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
        return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'FAIL', reason_code: 'RDY02', replay_ec: 1, run_id: run.runId, detail: `lock missing fields: ${missingFields.join(',')}` };
      }
    } catch (e) {
      return { lane_id: lane.lane_id, truth_level: lane.truth_level, status: 'FAIL', reason_code: 'RDY02', replay_ec: 1, run_id: run.runId, detail: `lock parse error: ${e.message}` };
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
