import { stableEvidenceNormalize, RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

fs.mkdirSync(MANUAL, { recursive: true });

const sample = [
  '# SAMPLE',
  'STARTED_AT_MS: 1710000000000',
  'COMPLETED_AT_MS: 1710000004321',
  'ELAPSED_MS: 4321',
  `RUN_ID: ${RUN_ID}`,
  '  STARTED_AT_MS: 10',
].join('\n');

const normalized = stableEvidenceNormalize(sample);

const checks = {
  started_at_ms_normalized: !normalized.includes('STARTED_AT_MS:'),
  completed_at_ms_normalized: !normalized.includes('COMPLETED_AT_MS:'),
  elapsed_ms_normalized: !normalized.includes('ELAPSED_MS:'),
  run_ms_marker_present: normalized.includes('RUN_MS: RUN_MS'),
  indented_ms_fields_normalized: normalized.includes('  RUN_MS: RUN_MS'),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_CAN03';

writeMd(
  path.join(EXEC_DIR, 'REGRESSION_CANON_MS_TIMESTAMPS_NORMALIZED.md'),
  `# REGRESSION_CANON_MS_TIMESTAMPS_NORMALIZED.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')}\n`,
);

writeJsonDeterministic(path.join(MANUAL, 'regression_canon_ms_timestamps_normalized.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  sample,
  normalized,
});

console.log(`[${status}] regression_canon_ms_timestamps_normalized — ${reason_code}`);
process.exit(ok ? 0 : 1);
