/**
 * regression_lane03_no_dup_schema_version.mjs — RG_LANE03_NO_DUP_SCHEMA_VERSION
 *
 * Gate: No two lanes in the registry may share the same schema_version string.
 *       Also verifies that schema_version in each lane matches what its replay
 *       script declares as its code constant (drift detection).
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
const checks = [];

checks.push({ check: 'registry_exists', pass: fs.existsSync(REGISTRY_PATH), detail: REGISTRY_PATH });

if (fs.existsSync(REGISTRY_PATH)) {
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    checks.push({ check: 'registry_parse', pass: false, detail: e.message });
    reg = null;
  }

  if (reg && Array.isArray(reg.lanes)) {
    // Check 1: No duplicate schema_versions across lanes
    const schemaVersions = reg.lanes.map((l) => l.schema_version);
    const seen = new Map();
    const duplicates = [];
    for (const sv of schemaVersions) {
      if (seen.has(sv)) { duplicates.push(sv); } else { seen.set(sv, 1); }
    }
    checks.push({
      check: 'no_duplicate_schema_versions',
      pass: duplicates.length === 0,
      detail: duplicates.length === 0
        ? `all ${schemaVersions.length} schema_versions unique — OK`
        : `DUPLICATES: ${[...new Set(duplicates)].join(', ')}`,
    });

    // Check 2: Each lane's schema_version is non-empty and properly formatted
    // Format: <category>.<provider_id>.v<N> — allows alphanumeric + underscore in parts
    const badFormats = reg.lanes.filter((l) => !l.schema_version || !/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.v\d+$/.test(l.schema_version));
    checks.push({
      check: 'schema_version_format_valid',
      pass: badFormats.length === 0,
      detail: badFormats.length === 0
        ? 'all schema_versions match <category>.<provider>.v<N> — OK'
        : `BAD FORMAT: ${badFormats.map((l) => `${l.lane_id}="${l.schema_version}"`).join(', ')}`,
    });

    // Check 3: Lane schema_versions match what's in replay script source
    // We grep the replay script for PROVIDERS config containing the schema string
    for (const lane of reg.lanes) {
      const cmdParts = (lane.replay_command || '').split(/\s+/);
      const nodeIdx = cmdParts.findIndex((p) => p === 'node');
      const scriptRel = nodeIdx >= 0 ? cmdParts[nodeIdx + 1] : null;
      if (!scriptRel) continue;
      const scriptPath = path.join(ROOT, scriptRel);
      if (!fs.existsSync(scriptPath)) continue;

      const content = fs.readFileSync(scriptPath, 'utf8');
      // Check that the script mentions this schema_version somewhere
      const hasVersion = content.includes(lane.schema_version);
      checks.push({
        check: `${lane.lane_id}_schema_version_in_script`,
        pass: hasVersion,
        detail: hasVersion
          ? `"${lane.schema_version}" found in ${scriptRel} — OK`
          : `DRIFT: "${lane.schema_version}" not found in ${scriptRel}`,
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LANE03_SCHEMA_VERSION_CONFLICT';

writeMd(path.join(EXEC, 'REGRESSION_LANE03.md'), [
  '# REGRESSION_LANE03.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_lane03.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LANE03_NO_DUP_SCHEMA_VERSION',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_lane03_no_dup_schema_version — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
