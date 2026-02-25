import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const canonSrc = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/canon.mjs'), 'utf8');
const checks = {
  includes_started_at_ms: canonSrc.includes("'STARTED_AT_MS:'"),
  includes_completed_at_ms: canonSrc.includes("'COMPLETED_AT_MS:'"),
  includes_elapsed_ms: canonSrc.includes("'ELAPSED_MS:'"),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_CAN02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_CANON_INCLUDES_MS_TIMING_MARKERS.md'), `# REGRESSION_CANON_INCLUDES_MS_TIMING_MARKERS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_canon_includes_ms_timing_markers.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_canon_includes_ms_timing_markers — ${reason_code}`);
process.exit(ok ? 0 : 1);
