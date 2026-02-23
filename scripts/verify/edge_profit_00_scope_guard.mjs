import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, canonSort } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EDGE_LAB_DIR = path.join(ROOT, 'scripts', 'edge', 'edge_lab');
const REGISTRY_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REGISTRY_DIR, 'gates', 'manual');
const PROFILE_MARKER = path.join(ROOT, 'artifacts', 'incoming', 'paper_telemetry.profile');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const files = fs.readdirSync(EDGE_LAB_DIR)
  .filter((name) => name.endsWith('.mjs'))
  .map((name) => path.join(EDGE_LAB_DIR, name));

const consumerViolations = [];
const legacyWriteViolations = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/hypothesis_registry\.json/.test(line) && !/registry/.test(line)) {
      consumerViolations.push(`${rel}:${i + 1}:non_registry_registry_consumer_path`);
    }

    const hasLegacyManualPath =
      /reports\/evidence\/EDGE_PROFIT_00\/gates\/manual/.test(line) ||
      /'reports',\s*'evidence',\s*'EDGE_PROFIT_00',\s*'gates',\s*'manual'/.test(line) ||
      /"reports",\s*"evidence",\s*"EDGE_PROFIT_00",\s*"gates",\s*"manual"/.test(line);

    const hasWriteCall = /(writeJsonDeterministic|writeMd|fs\.writeFileSync|fs\.appendFileSync)/.test(line);
    if (hasLegacyManualPath && hasWriteCall) {
      legacyWriteViolations.push(`${rel}:${i + 1}:legacy_root_manual_write`);
    }
  }
}

const profileMarkerExists = fs.existsSync(PROFILE_MARKER);
let status = 'PASS';
let reasonCode = 'NONE';
let nextAction = 'npm run -s executor:run:chain';
let violations = [];

if (profileMarkerExists && consumerViolations.length > 0) {
  status = 'FAIL';
  reasonCode = 'RG01';
  nextAction = 'npm run -s verify:edge:profit:00:scope';
  violations = canonSort(consumerViolations);
} else if (profileMarkerExists && legacyWriteViolations.length > 0) {
  status = 'BLOCKED';
  reasonCode = 'SG01';
  nextAction = 'npm run -s verify:edge:profit:00:scope';
  violations = canonSort(legacyWriteViolations);
}

const md = `# SCOPE_GUARD.md — EDGE_PROFIT_00\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Checks\n\n- profile_marker_exists: ${profileMarkerExists}\n- registry_consumer_scope_enforced_when_profile_exists: ${profileMarkerExists ? consumerViolations.length === 0 : 'SKIPPED'}\n- legacy_root_manual_write_enforced_when_profile_exists: ${profileMarkerExists ? legacyWriteViolations.length === 0 : 'SKIPPED'}\n\n## Violations\n\n${violations.length ? violations.map((v) => `- ${v}`).join('\n') : '- NONE'}\n`;

writeMd(path.join(REGISTRY_DIR, 'SCOPE_GUARD.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'scope_guard.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS'
    ? 'Scope guard passed for profile-aware EDGE_PROFIT_00 registry consumers.'
    : reasonCode === 'RG01'
      ? 'Registry consumer reads non-SSOT path while profile marker exists.'
      : 'Legacy root manual write detected while profile marker exists.',
  next_action: nextAction,
  profile_marker_exists: profileMarkerExists,
  consumer_violation_count: consumerViolations.length,
  legacy_write_violation_count: legacyWriteViolations.length,
  violations,
  required_registry_path: 'reports/evidence/EDGE_PROFIT_00/registry/gates/manual/hypothesis_registry.json',
});

console.log(`[${status}] edge_profit_00_scope_guard — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
