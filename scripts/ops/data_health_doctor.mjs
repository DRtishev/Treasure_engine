/**
 * data_health_doctor.mjs — WOW-39: Data Health Doctor
 *
 * Scans all data lanes from specs/data_lanes.json.
 * Per lane: checks artifact presence, verifies lock integrity.
 * Emits EventBus events: DATA_HEALTH_SCAN, DATA_HEALTH_RESULT.
 * Output: reports/evidence/EPOCH-DATA-HEALTH-<RUN_ID>/DATA_HEALTH.json + .md
 *
 * Lane health states:
 *   HEALTHY  — artifacts present + lock valid
 *   MISSING  — no artifacts found
 *   BROKEN   — lock invalid or corrupt
 *
 * Network: FORBIDDEN (offline only)
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createBus } from './eventbus_v1.mjs';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'specs/data_lanes.json');

// Load lane registry
let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
  console.error(`[FAIL] data_health_doctor — REGISTRY_MISSING: ${e.message}`);
  process.exit(1);
}

const { lanes } = registry;

// EventBus
const epochDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-DATA-HEALTH-${RUN_ID}`);
fs.mkdirSync(epochDir, { recursive: true });
const bus = createBus(RUN_ID, epochDir);

bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'DATA_HEALTH_SCAN',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: { lanes_total: String(lanes.length) },
});

// ---------------------------------------------------------------------------
// Find latest run dir for dynamic lanes
// ---------------------------------------------------------------------------
function findLatestRunDir(baseDir) {
  if (!fs.existsSync(baseDir)) return null;
  const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
  const runId = dirs.at(-1) || '';
  if (!runId) return null;
  return { runId, dir: path.join(baseDir, runId) };
}

// ---------------------------------------------------------------------------
// Evaluate lane health
// ---------------------------------------------------------------------------
function evaluateLaneHealth(lane) {
  const isStatic = lane.required_artifacts.every((a) => !a.includes('<RUN_ID>'));

  if (isStatic) {
    // Static lane: check all artifacts exist
    for (const artifact of lane.required_artifacts) {
      const fullPath = path.join(ROOT, artifact);
      if (!fs.existsSync(fullPath)) {
        return { lane_id: lane.lane_id, health: 'MISSING', run_id: 'STATIC', detail: `missing: ${artifact}` };
      }
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && fs.readdirSync(fullPath).length === 0) {
        return { lane_id: lane.lane_id, health: 'MISSING', run_id: 'STATIC', detail: `empty dir: ${artifact}` };
      }
    }

    return { lane_id: lane.lane_id, health: 'HEALTHY', run_id: 'STATIC', detail: 'static files present' };
  }

  // Dynamic lane
  const firstArtifact = lane.required_artifacts[0] || '';
  const baseDirRel = firstArtifact.split('/<RUN_ID>/')[0];
  if (!baseDirRel) {
    return { lane_id: lane.lane_id, health: 'MISSING', run_id: 'NONE', detail: 'no artifact template' };
  }

  const baseDir = path.join(ROOT, baseDirRel);
  const run = findLatestRunDir(baseDir);
  if (!run) {
    return { lane_id: lane.lane_id, health: 'MISSING', run_id: 'NONE', detail: `no runs in ${path.relative(ROOT, baseDir)}` };
  }

  // Check required artifacts
  for (const artifact of lane.required_artifacts) {
    const resolved = artifact.replace('/<RUN_ID>/', `/${run.runId}/`);
    if (!fs.existsSync(path.join(ROOT, resolved))) {
      return { lane_id: lane.lane_id, health: 'MISSING', run_id: run.runId, detail: `missing: ${resolved}` };
    }
  }

  // Check lock integrity
  const lockArtifact = lane.required_artifacts.find((a) => a.endsWith('lock.json'));
  if (lockArtifact && lane.required_lock_fields.length > 0) {
    const resolvedLock = path.join(ROOT, lockArtifact.replace('/<RUN_ID>/', `/${run.runId}/`));
    try {
      const lock = JSON.parse(fs.readFileSync(resolvedLock, 'utf8'));
      const missingFields = lane.required_lock_fields.filter((f) => !(f in lock));
      if (missingFields.length > 0) {
        return { lane_id: lane.lane_id, health: 'BROKEN', run_id: run.runId, detail: `lock missing: ${missingFields.join(',')}` };
      }

      // Verify raw SHA if present
      const rawArtifact = lane.required_artifacts.find((a) => a.endsWith('raw.jsonl'));
      if (rawArtifact && lock.raw_capture_sha256) {
        const resolvedRaw = path.join(ROOT, rawArtifact.replace('/<RUN_ID>/', `/${run.runId}/`));
        if (fs.existsSync(resolvedRaw)) {
          const rawContent = fs.readFileSync(resolvedRaw, 'utf8');
          const rawSha = crypto.createHash('sha256').update(rawContent).digest('hex');
          if (rawSha !== lock.raw_capture_sha256) {
            return { lane_id: lane.lane_id, health: 'BROKEN', run_id: run.runId, detail: 'raw_capture_sha256 mismatch' };
          }
        }
      }
    } catch (e) {
      return { lane_id: lane.lane_id, health: 'BROKEN', run_id: run.runId, detail: `lock parse error: ${e.message}` };
    }
  }

  return { lane_id: lane.lane_id, health: 'HEALTHY', run_id: run.runId, detail: 'artifacts present, lock valid' };
}

// ---------------------------------------------------------------------------
// Evaluate all lanes
// ---------------------------------------------------------------------------
const results = [...lanes]
  .sort((a, b) => a.lane_id.localeCompare(b.lane_id))
  .map((lane) => {
    const health = evaluateLaneHealth(lane);
    return {
      ...health,
      truth_level: lane.truth_level,
      lane_state: lane.lane_state,
      schema_version: lane.schema_version,
    };
  });

// Emit per-lane results
for (const r of results) {
  const reasonMap = { HEALTHY: 'DATA_HEALTH_PASS', MISSING: 'DATA_HEALTH_MISSING', BROKEN: 'DATA_HEALTH_BROKEN' };
  bus.append({
    mode: 'CERT',
    component: 'DATA_ORGAN',
    event: 'DATA_HEALTH_RESULT',
    reason_code: reasonMap[r.health] ?? 'NONE',
    surface: 'DATA',
    evidence_paths: [],
    attrs: {
      lane_id: r.lane_id,
      health: r.health,
      truth_level: r.truth_level,
      lane_state: r.lane_state,
      run_id: r.run_id,
    },
  });
}

bus.flush();

// Summary
const healthy = results.filter((r) => r.health === 'HEALTHY').length;
const missing = results.filter((r) => r.health === 'MISSING').length;
const broken = results.filter((r) => r.health === 'BROKEN').length;
const status = broken > 0 ? 'WARN' : (missing > 0 ? 'PARTIAL' : 'PASS');

// Write JSON
writeJsonDeterministic(path.join(epochDir, 'DATA_HEALTH.json'), {
  schema_version: '1.0.0',
  status,
  run_id: RUN_ID,
  lanes_total: lanes.length,
  healthy,
  missing,
  broken,
  results,
});

// Write MD
writeMd(path.join(epochDir, 'DATA_HEALTH.md'), [
  '# DATA HEALTH DOCTOR', '',
  `STATUS: ${status}`,
  `RUN_ID: ${RUN_ID}`,
  `LANES_TOTAL: ${lanes.length}`,
  `HEALTHY: ${healthy}`,
  `MISSING: ${missing}`,
  `BROKEN: ${broken}`, '',
  '## PER-LANE HEALTH', '',
  '| Lane | Truth | State | Health | Run | Detail |',
  '|------|-------|-------|--------|-----|--------|',
  ...results.map((r) => `| ${r.lane_id} | ${r.truth_level} | ${r.lane_state} | ${r.health} | ${r.run_id} | ${r.detail} |`),
].join('\n'));

// Console
console.log(`[${status}] data_health_doctor — ${healthy}/${lanes.length} HEALTHY, ${missing} MISSING, ${broken} BROKEN`);
for (const r of results) {
  const icon = r.health === 'HEALTHY' ? 'OK' : (r.health === 'MISSING' ? 'MISS' : 'BROKEN');
  console.log(`  [${icon}] ${r.lane_id} (${r.truth_level}/${r.lane_state}) run=${r.run_id}`);
}
