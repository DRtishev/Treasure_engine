/**
 * regression_rg_cap06_physics_policy_split.mjs — RG_CAP06
 *
 * Validates data_capabilities_meta.json: exists, schema, rate_limit coverage.
 * Gate ID: RG_CAP06 · Wired: verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_CAP06';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const META_PATH = path.join(ROOT, 'specs/data_capabilities_meta.json');
const CAPS_PATH = path.join(ROOT, 'specs/data_capabilities.json');
const violations = [];

if (!fs.existsSync(META_PATH)) {
  violations.push({ path: 'specs/data_capabilities_meta.json', detail: 'FILE_NOT_FOUND' });
} else {
  try {
    const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
    if (!meta.schema_version) violations.push({ path: META_PATH, detail: 'missing schema_version' });
    if (!meta.annotations || typeof meta.annotations !== 'object') {
      violations.push({ path: META_PATH, detail: 'missing annotations object' });
    } else {
      for (const [key, ann] of Object.entries(meta.annotations)) {
        if (!ann.layer) violations.push({ path: key, detail: 'missing layer' });
        if (ann.layer === 'PHYSICS' && !ann.source) violations.push({ path: key, detail: 'PHYSICS missing source' });
        if (ann.layer === 'PHYSICS' && !ann.confidence) violations.push({ path: key, detail: 'PHYSICS missing confidence' });
      }
      if (fs.existsSync(CAPS_PATH)) {
        const caps = JSON.parse(fs.readFileSync(CAPS_PATH, 'utf8'));
        for (const [prov, pd] of Object.entries(caps.capabilities || {})) {
          if (!pd.rate_limits) continue;
          for (const f of Object.keys(pd.rate_limits).filter((k) => k !== 'unit' && k !== '_field_meta')) {
            if (!meta.annotations[`${prov}.rate_limits.${f}`])
              violations.push({ path: `${prov}.rate_limits.${f}`, detail: 'rate_limit field missing meta annotation' });
          }
        }
      }
    }
  } catch (e) { violations.push({ path: META_PATH, detail: `parse error: ${e.message}` }); }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_CAP06_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_CAP06.md'), [
  '# REGRESSION_RG_CAP06.md — Capabilities physics/policy', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_cap06_physics_policy_split.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_rg_cap06_physics_policy_split — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
