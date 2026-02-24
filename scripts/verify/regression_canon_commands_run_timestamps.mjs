import fs from 'node:fs';
import path from 'node:path';
import { stableEvidenceNormalize, VOLATILE_MARKERS, RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const hasStarted = VOLATILE_MARKERS.includes('STARTED_AT:');
const hasCompleted = VOLATILE_MARKERS.includes('COMPLETED_AT:');
const sample = '# COMMANDS_RUN\nSTARTED_AT: 2026-01-01T00:00:00.000Z\nCOMPLETED_AT: 2026-01-01T00:01:00.000Z\nSTATUS: PASS\n';
const normalized = stableEvidenceNormalize(sample);
const replaced = !normalized.includes('STARTED_AT: 2026-01-01T00:00:00.000Z') && !normalized.includes('COMPLETED_AT: 2026-01-01T00:01:00.000Z');

const status = hasStarted && hasCompleted && replaced ? 'PASS' : 'BLOCKED';
const reason_code = status === 'PASS' ? 'NONE' : 'ND01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_CANON_COMMANDS_RUN_TIMESTAMPS.md'), `# REGRESSION_CANON_COMMANDS_RUN_TIMESTAMPS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_started_marker: ${hasStarted}\n- has_completed_marker: ${hasCompleted}\n- normalization_replaces_timestamp_lines: ${replaced}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_canon_commands_run_timestamps.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  has_started_marker: hasStarted,
  has_completed_marker: hasCompleted,
  normalization_replaces_timestamp_lines: replaced,
});
console.log(`[${status}] regression_canon_commands_run_timestamps — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
