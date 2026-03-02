/**
 * regression_r3_03_data_health_integration.mjs — RG_R3_HEALTH01
 *
 * Run data_health_doctor.mjs, verify it produces expected output format,
 * check EventBus emission.
 *
 * Gate: verify:regression:r3-03-data-health-integration
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const violations = [];

// Run data_health_doctor.mjs
const result = runBounded(
  `${process.execPath} scripts/ops/data_health_doctor.mjs`,
  { cwd: ROOT, env: { ...process.env, TREASURE_NET_KILL: '1' }, maxBuffer: 4 * 1024 * 1024 },
);

if (result.ec !== 0) {
  violations.push(`data_health_doctor exit_code=${result.ec}`);
}

// Find the latest EPOCH-DATA-HEALTH-* dir
const evidDir = path.join(ROOT, 'reports', 'evidence');
const healthDirs = fs.readdirSync(evidDir)
  .filter((d) => d.startsWith('EPOCH-DATA-HEALTH-'))
  .sort();

if (healthDirs.length === 0) {
  violations.push('no EPOCH-DATA-HEALTH-* directory found');
} else {
  const latest = healthDirs[healthDirs.length - 1];
  const healthDir = path.join(evidDir, latest);

  // 1. DATA_HEALTH.json must exist
  const jsonPath = path.join(healthDir, 'DATA_HEALTH.json');
  if (!fs.existsSync(jsonPath)) {
    violations.push('DATA_HEALTH.json missing');
  } else {
    try {
      const health = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // 2. Schema version
      if (health.schema_version !== '1.0.0') {
        violations.push(`schema_version=${health.schema_version} (expected 1.0.0)`);
      }

      // 3. Must have results array
      if (!Array.isArray(health.results)) {
        violations.push('results is not an array');
      } else {
        // 4. Each result must have required fields
        for (const r of health.results) {
          if (!r.lane_id) violations.push(`result missing lane_id`);
          if (!['HEALTHY', 'MISSING', 'BROKEN'].includes(r.health)) {
            violations.push(`${r.lane_id}: invalid health=${r.health}`);
          }
        }
      }

      // 5. Summary fields
      if (typeof health.lanes_total !== 'number') violations.push('missing lanes_total');
      if (typeof health.healthy !== 'number') violations.push('missing healthy count');
      if (typeof health.missing !== 'number') violations.push('missing missing count');
      if (typeof health.broken !== 'number') violations.push('missing broken count');
    } catch (e) {
      violations.push(`DATA_HEALTH.json parse error: ${e.message}`);
    }
  }

  // 6. DATA_HEALTH.md must exist
  if (!fs.existsSync(path.join(healthDir, 'DATA_HEALTH.md'))) {
    violations.push('DATA_HEALTH.md missing');
  }

  // 7. EventBus JSONL must exist
  const jsonlFiles = fs.readdirSync(healthDir).filter((f) => f.endsWith('.jsonl'));
  if (jsonlFiles.length === 0) {
    violations.push('no EventBus .jsonl file found');
  } else {
    const jsonlContent = fs.readFileSync(path.join(healthDir, jsonlFiles[0]), 'utf8');
    const events = jsonlContent.split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    // Must have DATA_HEALTH_SCAN event
    if (!events.some((e) => e.event === 'DATA_HEALTH_SCAN')) {
      violations.push('missing DATA_HEALTH_SCAN event');
    }

    // Must have at least one DATA_HEALTH_RESULT event
    if (!events.some((e) => e.event === 'DATA_HEALTH_RESULT')) {
      violations.push('missing DATA_HEALTH_RESULT events');
    }
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason = violations.length === 0 ? 'NONE' : 'RG_R3_HEALTH01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_R3_03_DATA_HEALTH_INTEGRATION.md'), [
  '# REGRESSION_R3_03_DATA_HEALTH_INTEGRATION.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s verify:fast`, '',
  `VIOLATIONS: ${violations.length}`,
  violations.length > 0
    ? violations.map((v) => `- ${v}`).join('\n')
    : '- NONE',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_r3_03_data_health_integration.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_R3_HEALTH01',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  violations,
});

console.log(`[${status}] regression_r3_03_data_health_integration — ${reason}`);
process.exit(status === 'PASS' ? 0 : 1);
