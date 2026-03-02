/**
 * data_lineage_explain.mjs — WOW-40: Data Lineage Explain
 *
 * For a given lane, traces the full data path:
 *   acquire → raw.jsonl → replay → normalize → evidence
 *
 * Usage:
 *   node scripts/ops/data_lineage_explain.mjs                  # all lanes
 *   node scripts/ops/data_lineage_explain.mjs --lane <lane_id> # specific lane
 *
 * Output: reports/evidence/EPOCH-LINEAGE-<RUN_ID>/LINEAGE_<lane_id>.md
 *
 * Network: FORBIDDEN (offline only)
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createBus } from './eventbus_v1.mjs';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'specs/data_lanes.json');

// Parse args
const argv = process.argv.slice(2);
const laneIdx = argv.indexOf('--lane');
const targetLane = laneIdx >= 0 ? argv[laneIdx + 1] : null;

// Load registry
let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
  console.error(`[FAIL] data_lineage_explain — REGISTRY_MISSING: ${e.message}`);
  process.exit(1);
}

const { lanes } = registry;

// EventBus
const epochDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-LINEAGE-${RUN_ID}`);
fs.mkdirSync(epochDir, { recursive: true });
const bus = createBus(RUN_ID, epochDir);

// ---------------------------------------------------------------------------
// Find latest run dir
// ---------------------------------------------------------------------------
function findLatestRunDir(baseDir) {
  if (!fs.existsSync(baseDir)) return null;
  const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
  return dirs.at(-1) || null;
}

// ---------------------------------------------------------------------------
// Find EventBus entries for a provider
// ---------------------------------------------------------------------------
function findBusEntries(providerId) {
  const evidDir = path.join(ROOT, 'reports', 'evidence');
  if (!fs.existsSync(evidDir)) return [];
  const entries = [];
  try {
    const dirs = fs.readdirSync(evidDir)
      .filter((d) => d.startsWith('EPOCH-EVENTBUS-REPLAY-') || d.startsWith('EPOCH-EVENTBUS-ACQ-'))
      .sort();

    for (const dir of dirs) {
      const jsonlFiles = fs.readdirSync(path.join(evidDir, dir))
        .filter((f) => f.endsWith('.jsonl'));
      for (const jf of jsonlFiles) {
        const content = fs.readFileSync(path.join(evidDir, dir, jf), 'utf8');
        for (const line of content.split('\n').filter(Boolean)) {
          try {
            const evt = JSON.parse(line);
            if (evt.attrs?.provider === providerId || dir.includes(providerId)) {
              entries.push({ dir, event: evt.event, reason_code: evt.reason_code });
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* fail-safe */ }
  return entries;
}

// ---------------------------------------------------------------------------
// Trace lineage for a lane
// ---------------------------------------------------------------------------
function traceLaneLineage(lane) {
  const isStatic = lane.required_artifacts.every((a) => !a.includes('<RUN_ID>'));
  const providerId = lane.providers[0] || 'unknown';

  const lineage = {
    lane_id: lane.lane_id,
    provider: providerId,
    lane_kind: lane.lane_kind,
    truth_level: lane.truth_level,
    lane_state: lane.lane_state,
    stages: [],
  };

  // Stage 1: ACQUIRE
  if (isStatic) {
    const allExist = lane.required_artifacts.every((a) => fs.existsSync(path.join(ROOT, a)));
    lineage.stages.push({
      stage: 'ACQUIRE',
      kind: 'STATIC',
      artifacts: lane.required_artifacts,
      status: allExist ? 'PRESENT' : 'MISSING',
    });
  } else {
    const firstArtifact = lane.required_artifacts[0] || '';
    const baseDirRel = firstArtifact.split('/<RUN_ID>/')[0];
    const baseDir = baseDirRel ? path.join(ROOT, baseDirRel) : null;
    const latestRun = baseDir ? findLatestRunDir(baseDir) : null;

    lineage.stages.push({
      stage: 'ACQUIRE',
      kind: 'DYNAMIC',
      base_dir: baseDirRel || 'NONE',
      latest_run: latestRun || 'NONE',
      artifacts: latestRun
        ? lane.required_artifacts.map((a) => a.replace('<RUN_ID>', latestRun))
        : lane.required_artifacts,
      status: latestRun ? 'PRESENT' : 'MISSING',
    });
  }

  // Stage 2: REPLAY
  lineage.stages.push({
    stage: 'REPLAY',
    command: lane.replay_command,
    status: lane.replay_command ? 'CONFIGURED' : 'NONE',
  });

  // Stage 3: FIXTURE (check fixtures)
  const fixtureDir = path.join(ROOT, 'artifacts', 'fixtures');
  const providerFixtures = [];
  if (fs.existsSync(fixtureDir)) {
    try {
      const walk = (dir, rel) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, ent.name);
          const relPath = path.join(rel, ent.name);
          if (ent.isDirectory()) walk(fullPath, relPath);
          else providerFixtures.push(relPath);
        }
      };
      // Narrow down fixture search by provider keywords
      const keywords = providerId.split('_');
      for (const ent of fs.readdirSync(fixtureDir, { withFileTypes: true })) {
        if (ent.isDirectory() && keywords.some((k) => ent.name.includes(k))) {
          walk(path.join(fixtureDir, ent.name), ent.name);
        }
      }
    } catch { /* fail-safe */ }
  }

  lineage.stages.push({
    stage: 'FIXTURES',
    count: providerFixtures.length,
    files: providerFixtures.slice(0, 20),
    status: providerFixtures.length > 0 ? 'PRESENT' : 'NONE',
  });

  // Stage 4: EVIDENCE (EventBus entries)
  const busEntries = findBusEntries(providerId);
  lineage.stages.push({
    stage: 'EVIDENCE',
    bus_entries: busEntries.length,
    events: busEntries.slice(0, 20),
    status: busEntries.length > 0 ? 'PRESENT' : 'NONE',
  });

  return lineage;
}

// ---------------------------------------------------------------------------
// Trace selected lanes
// ---------------------------------------------------------------------------
const targetLanes = targetLane
  ? lanes.filter((l) => l.lane_id === targetLane)
  : [...lanes].sort((a, b) => a.lane_id.localeCompare(b.lane_id));

if (targetLane && targetLanes.length === 0) {
  console.error(`[FAIL] lane not found: ${targetLane}`);
  process.exit(1);
}

const lineages = targetLanes.map(traceLaneLineage);

// Emit events
for (const lin of lineages) {
  bus.append({
    mode: 'CERT',
    component: 'DATA_ORGAN',
    event: 'LINEAGE_TRACE',
    reason_code: 'NONE',
    surface: 'DATA',
    evidence_paths: [],
    attrs: {
      lane_id: lin.lane_id,
      provider: lin.provider,
      stages_n: String(lin.stages.length),
    },
  });
}

bus.flush();

// Write per-lane lineage MD
for (const lin of lineages) {
  const lines = [
    `# LINEAGE: ${lin.lane_id}`, '',
    `PROVIDER: ${lin.provider}`,
    `LANE_KIND: ${lin.lane_kind}`,
    `TRUTH_LEVEL: ${lin.truth_level}`,
    `LANE_STATE: ${lin.lane_state}`, '',
    '## DATA FLOW', '',
    '```',
  ];

  for (const stage of lin.stages) {
    lines.push(`[${stage.stage}] status=${stage.status}`);
    if (stage.kind) lines.push(`  kind: ${stage.kind}`);
    if (stage.base_dir) lines.push(`  base_dir: ${stage.base_dir}`);
    if (stage.latest_run) lines.push(`  latest_run: ${stage.latest_run}`);
    if (stage.command) lines.push(`  command: ${stage.command}`);
    if (stage.count !== undefined) lines.push(`  fixtures: ${stage.count}`);
    if (stage.bus_entries !== undefined) lines.push(`  bus_entries: ${stage.bus_entries}`);
    if (stage.artifacts) {
      for (const a of stage.artifacts.slice(0, 5)) lines.push(`  -> ${a}`);
    }
    lines.push('    |');
    lines.push('    v');
  }

  lines.push('```');

  writeMd(path.join(epochDir, `LINEAGE_${lin.lane_id}.md`), lines.join('\n'));
}

// Write summary JSON
writeJsonDeterministic(path.join(epochDir, 'LINEAGE_SUMMARY.json'), {
  schema_version: '1.0.0',
  run_id: RUN_ID,
  lanes_traced: lineages.length,
  lineages,
});

// Console
console.log(`[PASS] data_lineage_explain — ${lineages.length} lane(s) traced`);
for (const lin of lineages) {
  const stages = lin.stages.map((s) => `${s.stage}:${s.status}`).join(' → ');
  console.log(`  ${lin.lane_id}: ${stages}`);
}
