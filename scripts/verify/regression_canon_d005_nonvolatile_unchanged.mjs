import path from 'node:path';
import fs from 'node:fs';
import { stableEvidenceNormalize, RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

fs.mkdirSync(MANUAL, { recursive: true });

const volatileLine = 'STARTED_AT_MS: 1710000000000 | COMPLETED_AT_MS: 1710000004321 | ELAPSED_MS: 4321';
const semanticLine = 'risk_threshold: 0.0200';
const sample = ['# D005 SAMPLE', volatileLine, semanticLine].join('\n');
const normalized = stableEvidenceNormalize(sample);
const normalizedLines = normalized.split(/\r?\n/);

const checks = {
  volatile_ms_normalized_to_run_ms: normalized.includes('RUN_MS: RUN_MS'),
  volatile_ms_markers_removed: !normalized.includes('STARTED_AT_MS:') && !normalized.includes('COMPLETED_AT_MS:') && !normalized.includes('ELAPSED_MS:'),
  nonvolatile_semantic_line_unchanged: normalizedLines.includes(semanticLine),
};

const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_D00501';

writeMd(
  path.join(EXEC_DIR, 'REGRESSION_CANON_D005_NONVOLATILE_UNCHANGED.md'),
  `# REGRESSION_CANON_D005_NONVOLATILE_UNCHANGED.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n`,
);

writeJsonDeterministic(path.join(MANUAL, 'regression_canon_d005_nonvolatile_unchanged.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  sample,
  normalized,
  semantic_line: semanticLine,
});

console.log(`[${status}] regression_canon_d005_nonvolatile_unchanged — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
