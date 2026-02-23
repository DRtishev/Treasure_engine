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
const violations = [
  ...consumerViolations,
  ...(profileMarkerExists ? legacyWriteViolations : []),
];

const status = violations.length === 0 ? 'PASS' : 'BLOCKED';
const reasonCode = violations.length === 0 ? 'NONE' : 'SG01';
const nextAction = status === 'PASS'
  ? 'npm run -s edge:profit:00'
  : 'npm run -s verify:edge:profit:00:scope';

const md = `# SCOPE_GUARD.md — EDGE_PROFIT_00\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Checks\n\n- registry_consumer_scope_enforced: ${consumerViolations.length === 0}\n- profile_marker_exists: ${profileMarkerExists}\n- legacy_root_manual_write_enforced_when_profile_exists: ${profileMarkerExists ? legacyWriteViolations.length === 0 : 'SKIPPED'}\n\n## Violations\n\n${violations.length ? canonSort(violations).map((v) => `- ${v}`).join('\n') : '- NONE'}\n`;

writeMd(path.join(REGISTRY_DIR, 'SCOPE_GUARD.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'scope_guard.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS'
    ? 'Scope guard passed: registry consumers are registry-scoped and no legacy root manual writes were detected under profile mode.'
    : 'Scope guard blocked due to scope violations.',
  next_action: nextAction,
  profile_marker_exists: profileMarkerExists,
  consumer_violation_count: consumerViolations.length,
  legacy_write_violation_count: profileMarkerExists ? legacyWriteViolations.length : 0,
  violations: canonSort(violations),
  required_registry_path: 'reports/evidence/EDGE_PROFIT_00/registry/gates/manual/hypothesis_registry.json',
});

console.log(`[${status}] edge_profit_00_scope_guard — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
